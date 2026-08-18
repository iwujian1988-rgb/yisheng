const { fail, ok, parseBody } = require('../http');
const { createId } = require('../security/ids');
const { redactSensitiveText } = require('../security/redaction');
const medicalContentPolicy = require('../security/medical-content-policy');
const workspaceIntent = require('./workspace-intent');

const DETAIL_LEVELS = ['concise', 'standard', 'detailed'];
const MATERIAL_KINDS = ['typed', 'ocr', 'asr', 'field', 'instruction', 'correction'];
const MATERIAL_STATUSES = ['pending', 'included', 'excluded', 'failed'];

function buildMaterialCatalog(materials) {
  var counters = { ocr: 0, asr: 0, other: 0 };
  return (materials || []).map(function (material) {
    var bucket = material.kind === 'ocr' ? 'ocr' : (material.kind === 'asr' ? 'asr' : 'other');
    counters[bucket] += 1;
    var kindLabel = bucket === 'ocr' ? '张图片' : (bucket === 'asr' ? '段录音' : '份文字');
    return {
      id: material.id,
      index: counters[bucket],
      kind: material.kind,
      label: '第' + counters[bucket] + kindLabel,
      summary: String(material.text || '').replace(/\s+/g, ' ').slice(0, 120),
      status: material.status,
      relevanceState: material.relevanceState || 'relevant'
    };
  });
}

function collectTemplateFields(fields) {
  var result = [];
  function visit(value, path) {
    if (value === undefined || value === null) return;
    if (typeof value === 'string') {
      result.push({ key: path || value, label: value, required: false, description: '' });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (item, index) { visit(item, path ? path + '.' + index : String(index)); });
      return;
    }
    if (typeof value !== 'object') return;
    if (value.label) {
      result.push({
        key: path || String(value.label),
        label: String(value.label),
        required: Boolean(value.is_required || value.isRequired || value.required),
        description: String(value.description || '')
      });
      return;
    }
    Object.keys(value).filter(function (key) { return key.charAt(0) !== '_'; }).forEach(function (key) {
      visit(value[key], path ? path + '.' + key : key);
    });
  }
  visit(fields, '');
  return result;
}

function resolveTemplateFieldKey(fields, submittedKey) {
  var key = String(submittedKey || '').trim();
  if (!key) return '';
  if (fields.some(function (field) { return field.key === key; })) return key;

  // Compatibility for clients that used only the leaf key before nested paths
  // were aligned with the server. Never guess when two fields share a leaf key.
  var legacyMatches = fields.filter(function (field) {
    var parts = String(field.key || '').split('.');
    return parts[parts.length - 1] === key;
  });
  return legacyMatches.length === 1 ? legacyMatches[0].key : '';
}

function createAiWorkspacesModule(deps) {
  var auth = deps.auth;
  var store = deps.store;
  var templates = deps.templates;
  var contentAccess = deps.contentAccess;
  var repository = deps.repository;

  function requireMember(actor, res) {
    if (!contentAccess.isMemberActive(store, actor.id)) {
      fail(res, 403, 'MEMBER_REQUIRED', 'AI workspace requires active membership');
      return false;
    }
    return true;
  }

  function professionalAccess(req, actor) {
    return contentAccess.getAccessContext({ store: store, req: req, actor: actor, businessKey: 'aiMode' }).hasProfessionalAccess;
  }

  function publicWorkspace(workspace, template, materials, locked) {
    if (locked) {
      return { id: workspace.id, status: 'locked', requiresDevice: true, updatedAt: workspace.updatedAt };
    }
    var fields = collectTemplateFields(template && template.fields).map(function (field) {
      var value = String((workspace.fieldValues || {})[field.key] || '');
      return Object.assign({}, field, { value: value, filled: Boolean(value.trim()) });
    });
    return {
      id: workspace.id,
      templateId: workspace.templateId,
      templateName: template && template.name || '',
      templateVersion: workspace.templateVersion,
      audience: workspace.audience,
      detailLevel: workspace.detailLevel,
      status: workspace.status,
      materialRevision: workspace.materialRevision,
      fields: fields,
      materials: materials || [],
      requiresDevice: false,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt
    };
  }

  async function loadOwnedWorkspace(req, res, actor, id, options) {
    var workspace = await repository.getWorkspace(id, actor.id);
    if (!workspace) {
      fail(res, 404, 'AI_WORKSPACE_NOT_FOUND', 'workspace not found');
      return null;
    }
    var template = templates.findTemplate(store, workspace.templateId, actor.id);
    if (!template) {
      fail(res, 404, 'AI_WORKSPACE_NOT_FOUND', 'workspace not found');
      return null;
    }
    var locked = workspace.audience === 'professional' && !professionalAccess(req, actor);
    if (locked && !(options && options.allowLocked)) {
      fail(res, 403, 'DEVICE_CONNECTION_REQUIRED', 'connect device to continue');
      return null;
    }
    return { workspace: workspace, template: template, locked: locked };
  }

  async function createWorkspace(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor || !requireMember(actor, res)) return;
    var body = await parseBody(req);
    var templateId = String(body.templateId || '').trim();
    var template = templates.findTemplate(store, templateId, actor.id);
    if (!template) return fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
    if ((template.audience || 'general') === 'professional' && !professionalAccess(req, actor)) {
      return fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
    }
    var workspace = await repository.createWorkspace({
      userId: actor.id,
      templateId: template.id,
      templateVersion: Number(template.template_version || 1),
      audience: template.audience || 'general',
      detailLevel: DETAIL_LEVELS.indexOf(body.detailLevel) >= 0 ? body.detailLevel : 'standard'
    });
    ok(res, { workspace: publicWorkspace(workspace, template, [], false) });
  }

  async function getWorkspace(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor || !requireMember(actor, res)) return;
    var loaded = await loadOwnedWorkspace(req, res, actor, ctx.params.id, { allowLocked: true });
    if (!loaded) return;
    var materials = loaded.locked ? [] : await repository.listMaterials(loaded.workspace.id, actor.id);
    ok(res, { workspace: publicWorkspace(loaded.workspace, loaded.template, materials, loaded.locked) });
  }

  async function updateWorkspace(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor || !requireMember(actor, res)) return;
    var loaded = await loadOwnedWorkspace(req, res, actor, ctx.params.id);
    if (!loaded) return;
    var body = await parseBody(req); var changes = {};
    if (body.detailLevel && DETAIL_LEVELS.indexOf(body.detailLevel) >= 0) changes.detailLevel = body.detailLevel;
    if (body.status && ['active', 'archived'].indexOf(body.status) >= 0) changes.status = body.status;
    var workspace = await repository.updateWorkspace(loaded.workspace.id, actor.id, changes);
    var materials = await repository.listMaterials(workspace.id, actor.id);
    ok(res, { workspace: publicWorkspace(workspace, loaded.template, materials, false) });
  }

  async function saveField(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor || !requireMember(actor, res)) return;
    var loaded = await loadOwnedWorkspace(req, res, actor, ctx.params.id);
    if (!loaded) return;
    var body = await parseBody(req);
    var submittedFieldKey = String(body.fieldKey || '').trim();
    var fields = collectTemplateFields(loaded.template.fields);
    var fieldKey = resolveTemplateFieldKey(fields, submittedFieldKey);
    if (!fieldKey) {
      return fail(res, 400, 'AI_FIELD_INVALID', 'field is not part of this template');
    }
    var rawValue = String(body.value || '').trim();
    var guarded = loaded.workspace.audience === 'professional'
      ? { text: rawValue, hits: [], changed: false }
      : redactSensitiveText(rawValue);
    var workspace = await repository.saveField(loaded.workspace.id, actor.id, fieldKey, guarded.text);
    var materials = await repository.listMaterials(workspace.id, actor.id);
    ok(res, { workspace: publicWorkspace(workspace, loaded.template, materials, false), redactionHits: guarded.hits || [] });
  }

  async function addMaterial(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor || !requireMember(actor, res)) return;
    var loaded = await loadOwnedWorkspace(req, res, actor, ctx.params.id);
    if (!loaded) return;
    var body = await parseBody(req);
    var kind = MATERIAL_KINDS.indexOf(body.kind) >= 0 ? body.kind : 'typed';
    var text = String(body.text || '').trim();
    if (!text) return fail(res, 400, 'AI_MATERIAL_TEXT_REQUIRED', 'material text is required');
    if (loaded.workspace.audience !== 'professional' && medicalContentPolicy.containsMedicalContent(text)) {
      return fail(res, 422, 'PROFESSIONAL_CONTENT_NOT_SUPPORTED', 'This content is not supported in general mode.');
    }
    var guarded = loaded.workspace.audience === 'professional'
      ? { text: text, hits: [], changed: false }
      : redactSensitiveText(text);
    var structuredFacts = Array.isArray(body.structuredFacts) ? body.structuredFacts : [];
    var sourceMeta = body.sourceMeta && typeof body.sourceMeta === 'object' ? body.sourceMeta : {};
    var relevance = await workspaceIntent.classifyMaterialRelevance({
      kind: kind,
      text: guarded.text,
      structuredFacts: structuredFacts,
      templateName: loaded.template.name || '',
      templateSections: ((loaded.template.generation_contract || {}).sections || []).map(function (item) { return item.title || item.name || item; })
    });
    sourceMeta = Object.assign({}, sourceMeta, {
      relevanceReason: relevance.reason,
      relevanceConfidence: relevance.confidence
    });
    var material = await repository.addMaterial({
      workspaceId: loaded.workspace.id,
      userId: actor.id,
      kind: kind,
      text: guarded.text,
      fieldKey: '',
      clientMaterialId: String(body.clientMaterialId || createId('client')).slice(0, 96),
      status: MATERIAL_STATUSES.indexOf(body.status) >= 0 ? body.status : 'included',
      sourceMeta: sourceMeta,
      structuredFacts: structuredFacts,
      qualityState: ['ready', 'needs_review', 'failed'].indexOf(body.qualityState) >= 0 ? body.qualityState : 'ready',
      relevanceState: relevance.state
    });
    var workspace = await repository.getWorkspace(loaded.workspace.id, actor.id);
    ok(res, { material: material, materialRevision: workspace.materialRevision, redactionHits: guarded.hits || [] });
  }

  async function updateMaterial(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor || !requireMember(actor, res)) return;
    var loaded = await loadOwnedWorkspace(req, res, actor, ctx.params.id);
    if (!loaded) return;
    var body = await parseBody(req);
    var status = String(body.status || '');
    var relevanceState = String(body.relevanceState || '');
    if (Object.prototype.hasOwnProperty.call(body, 'qualityState')) {
      return fail(res, 400, 'AI_MATERIAL_QUALITY_READ_ONLY', 'material quality can only be updated by server recognition');
    }
    if (status && ['included', 'excluded'].indexOf(status) === -1) return fail(res, 400, 'AI_MATERIAL_STATUS_INVALID', 'invalid material status');
    if (relevanceState && ['relevant', 'irrelevant', 'needs_review'].indexOf(relevanceState) === -1) return fail(res, 400, 'AI_MATERIAL_RELEVANCE_INVALID', 'invalid relevance state');
    if (!status && !relevanceState) return fail(res, 400, 'AI_MATERIAL_UPDATE_REQUIRED', 'material update is required');
    var expectedRevision = Number(body.expectedRevision);
    var material;
    try {
      material = await repository.updateMaterial(ctx.params.materialId, loaded.workspace.id, actor.id, {
        status: status,
        relevanceState: relevanceState,
        expectedRevision: Number.isFinite(expectedRevision) ? expectedRevision : undefined
      });
    } catch (error) {
      if (error && error.code === 'AI_WORKSPACE_REVISION_CONFLICT') return fail(res, 409, error.code, 'workspace changed; refresh before continuing');
      throw error;
    }
    if (!material) return fail(res, 404, 'AI_MATERIAL_NOT_FOUND', 'material not found');
    var workspace = await repository.getWorkspace(loaded.workspace.id, actor.id);
    ok(res, { material: material, materialRevision: workspace.materialRevision });
  }

  async function createGeneration(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor || !requireMember(actor, res)) return;
    var loaded = await loadOwnedWorkspace(req, res, actor, ctx.params.id);
    if (!loaded) return;
    var body = await parseBody(req);
    var materials = await repository.listMaterials(loaded.workspace.id, actor.id);
    var included = materials.filter(function (item) { return item.status === 'included' && item.relevanceState !== 'irrelevant'; });
    var unresolvedMaterials = included.filter(function (item) { return item.qualityState && item.qualityState !== 'ready'; });
    if (unresolvedMaterials.length) {
      return fail(res, 409, 'AI_MATERIAL_REVIEW_REQUIRED', 'one or more materials must be recognized again or reviewed before generating');
    }
    var relevanceReview = included.filter(function (item) { return item.relevanceState === 'needs_review'; });
    if (relevanceReview.length) {
      return fail(res, 409, 'AI_MATERIAL_RELEVANCE_REVIEW_REQUIRED', 'choose whether to keep or remove the uncertain material before generating');
    }
    var fieldValues = loaded.workspace.fieldValues || {};
    if (!included.length && !Object.keys(fieldValues).some(function (key) { return String(fieldValues[key] || '').trim(); })) {
      return fail(res, 400, 'AI_WORKSPACE_EMPTY', 'add material before generating');
    }
    var template = templates.templateForGeneration(loaded.template);
    var snapshot = {
      workspaceId: loaded.workspace.id,
      template: template,
      detailLevel: loaded.workspace.detailLevel,
      fields: fieldValues,
      materials: included.map(function (item) {
        return {
          id: item.id,
          kind: item.kind,
          text: item.text,
          fieldKey: item.fieldKey || '',
          sourceMeta: item.sourceMeta || {},
          structuredFacts: item.structuredFacts || [],
          qualityState: item.qualityState || 'ready',
          relevanceState: item.relevanceState || 'relevant'
        };
      }),
      inputRevision: loaded.workspace.materialRevision
    };
    var baseGenerationId = String(body.baseGenerationId || '').trim();
    var revisionInstruction = String(body.revisionInstruction || '').trim();
    if (baseGenerationId || revisionInstruction) {
      if (!baseGenerationId || !revisionInstruction) {
        return fail(res, 400, 'AI_REVISION_INVALID', 'baseGenerationId and revisionInstruction are required');
      }
      var baseGeneration = await repository.getGeneration(baseGenerationId, loaded.workspace.id, actor.id);
      if (!baseGeneration || baseGeneration.status !== 'completed' || !baseGeneration.bodyText) {
        return fail(res, 400, 'AI_REVISION_BASE_INVALID', 'completed base generation required');
      }
      var guardedRevision = loaded.workspace.audience === 'professional'
        ? { text: revisionInstruction, hits: [], changed: false }
        : redactSensitiveText(revisionInstruction);
      snapshot.revision = {
        baseGenerationId: baseGeneration.id,
        baseBody: baseGeneration.bodyText,
        instruction: guardedRevision.text
      };
    }
    var idempotencyKey = String(body.idempotencyKey || createId('genreq')).slice(0, 96);
    var generation;
    try {
      generation = await repository.createGeneration({
        workspaceId: loaded.workspace.id,
        userId: actor.id,
        inputRevision: loaded.workspace.materialRevision,
        idempotencyKey: idempotencyKey,
        snapshot: snapshot
      });
    } catch (error) {
      if (error && error.code === 'AI_WORKSPACE_REVISION_CONFLICT') return fail(res, 409, error.code, 'workspace changed; retry generation');
      throw error;
    }
    ok(res, { generation: generation });
  }

  async function interpretInput(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor || !requireMember(actor, res)) return;
    var loaded = await loadOwnedWorkspace(req, res, actor, ctx.params.id);
    if (!loaded) return;
    var body = await parseBody(req);
    var text = String(body.text || '').trim();
    if (!text) return fail(res, 400, 'AI_INPUT_REQUIRED', 'text is required');
    var expectedRevision = Number(body.expectedRevision);
    if (!Number.isFinite(expectedRevision) || expectedRevision !== loaded.workspace.materialRevision) {
      return fail(res, 409, 'AI_WORKSPACE_REVISION_CONFLICT', 'workspace changed; refresh before continuing');
    }
    var fields = collectTemplateFields(loaded.template.fields);
    var materials = await repository.listMaterials(loaded.workspace.id, actor.id);
    var materialCatalog = buildMaterialCatalog(materials);
    var decision = await workspaceIntent.interpret({
      text: text,
      clientInputId: String(body.clientInputId || '').slice(0, 96),
      workspace: loaded.workspace,
      expectedRevision: expectedRevision,
      fieldKeys: fields.map(function (field) { return field.key; }),
      materialCatalog: materialCatalog,
      uiContext: body.uiContext && typeof body.uiContext === 'object' ? body.uiContext : {}
    });
    ok(res, decision);
  }

  return {
    addMaterial: addMaterial,
    collectTemplateFields: collectTemplateFields,
    createGeneration: createGeneration,
    createWorkspace: createWorkspace,
    getWorkspace: getWorkspace,
    interpretInput: interpretInput,
    loadOwnedWorkspace: loadOwnedWorkspace,
    saveField: saveField,
    updateMaterial: updateMaterial,
    updateWorkspace: updateWorkspace
  };
}

module.exports = { buildMaterialCatalog, collectTemplateFields, createAiWorkspacesModule, resolveTemplateFieldKey };
