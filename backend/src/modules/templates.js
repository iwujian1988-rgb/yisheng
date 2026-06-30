const { fail, ok, parseBody } = require('../http');
const { createId, nowIso } = require('../security/ids');
const { createFirstCourseOfficialTemplate } = require('../data/first-course-template');

const TEXT_TASKS = [
  { key: 'organize', label: '整理文字', description: '把零散内容整理成结构清晰的文本' },
  { key: 'polish', label: '润色优化', description: '让文字更清楚、更适合发送' },
  { key: 'extract', label: '提取要点', description: '从长文本里提取关键信息' },
  { key: 'review', label: '内容检查', description: '检查文字是否完整、清楚' },
  { key: 'convert', label: '格式转换', description: '按目标格式重新组织内容' }
];

function ensureAgentTemplates(store) {
  if (!Array.isArray(store.agentTemplates)) {
    store.agentTemplates = [];
  }
  var hasOfficial = store.agentTemplates.some(function (item) {
    return item.id === 'tpl_official_first_course' && item.status === 'active';
  });
  if (!hasOfficial) {
    store.agentTemplates.push(createFirstCourseOfficialTemplate(nowIso()));
  }
  return store.agentTemplates;
}

function publicTemplate(item) {
  return {
    id: item.id,
    templateType: item.template_type,
    audience: item.audience || 'general',
    tag: item.tag,
    name: item.name,
    fields: item.fields || [],
    sample: item.sample ? '[sample]' : '',
    hasSample: Boolean(item.sample),
    status: item.status,
    updatedAt: item.updated_at
  };
}

function templateDetail(item) {
  return {
    id: item.id,
    templateType: item.template_type,
    audience: item.audience || 'general',
    tag: item.tag,
    name: item.name,
    fields: item.fields || [],
    sample: item.sample || '',
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

function findTemplate(store, templateId, userId) {
  ensureAgentTemplates(store);
  return store.agentTemplates.find(function (item) {
    if (item.status !== 'active') return false;
    if (item.id !== templateId) return false;
    if (item.tag === 'custom' && item.user_id !== userId) return false;
    return true;
  }) || null;
}

function listVisibleTemplates(store, options) {
  ensureAgentTemplates(store);
  var showProfessional = options.showProfessional !== false;
  return store.agentTemplates.filter(function (item) {
    if (item.status !== 'active') return false;
    if (item.tag === 'custom' && item.user_id !== options.userId) return false;
    if (item.audience === 'professional' && !showProfessional) return false;
    return true;
  });
}

function createTemplatesModule(deps) {
  var store = deps.store;
  var auth = deps.auth;
  var contentAccess = deps.contentAccess;

  function listTemplates(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;

    var accessContext = contentAccess.getAccessContext({
      store: store,
      req: req,
      actor: actor,
      businessKey: 'templates'
    });

    var items = listVisibleTemplates(store, {
      userId: actor.id,
      showProfessional: accessContext.memberActive
    });

    ok(res, {
      templates: items.map(publicTemplate)
    });
  }

  function getTemplate(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;

    var item = findTemplate(store, ctx.params.id, actor.id);
    if (!item) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }

    if (item.audience === 'professional' && !contentAccess.isMemberActive(store, actor.id)) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }

    ok(res, templateDetail(item));
  }

  async function saveTemplate(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;

    var body = await parseBody(req);
    var draft = body.templateDraft || body.template_draft || body;
    var name = String(draft.name || body.name || '').trim();
    if (!name) {
      fail(res, 400, 'BAD_REQUEST', 'template name is required');
      return;
    }

    ensureAgentTemplates(store);
    var item = {
      id: createId('tpl_user'),
      template_type: String(draft.templateType || draft.template_type || '通用').trim(),
      audience: 'professional',
      tag: 'custom',
      name: name,
      user_id: actor.id,
      fields: Array.isArray(draft.fields) ? draft.fields : [],
      sample: String(draft.sample || '').trim(),
      status: 'active',
      created_at: nowIso(),
      updated_at: nowIso(),
      updated_by: actor.id
    };
    store.agentTemplates.push(item);
    ok(res, publicTemplate(item));
  }

  function getBaselineByType(templateType) {
    ensureAgentTemplates(store);
    var official = store.agentTemplates.find(function (item) {
      return item.tag === 'official'
        && item.template_type === templateType
        && item.status === 'active';
    });
    if (!official) {
      return { template_type: templateType, fields: [] };
    }
    return {
      template_type: official.template_type,
      fields: official.fields || [],
      sample: official.sample || ''
    };
  }

  function listTextTasks(req, res) {
    ok(res, { tasks: TEXT_TASKS });
  }

  return {
    listTemplates: listTemplates,
    getTemplate: getTemplate,
    saveTemplate: saveTemplate,
    getBaselineByType: getBaselineByType,
    findTemplate: findTemplate,
    listTextTasks: listTextTasks,
    ensureAgentTemplates: ensureAgentTemplates,
    templateDetail: templateDetail
  };
}

module.exports = {
  createTemplatesModule: createTemplatesModule,
  ensureAgentTemplates: ensureAgentTemplates
};
