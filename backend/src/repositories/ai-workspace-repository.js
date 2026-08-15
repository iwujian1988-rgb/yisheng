const { createId, nowIso } = require('../security/ids');

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return clone(fallback);
  if (typeof value === 'object') return clone(value);
  try { return JSON.parse(value); } catch (error) { return clone(fallback); }
}

function sqlNow() {
  return new Date();
}

function rowToWorkspace(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    templateVersion: Number(row.template_version || 1),
    audience: row.audience === 'professional' ? 'professional' : 'general',
    detailLevel: row.detail_level || 'standard',
    status: row.status || 'active',
    fieldValues: parseJson(row.field_values, {}),
    materialRevision: Number(row.material_revision || 0),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function rowToMaterial(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    kind: row.kind,
    text: row.text || '',
    fieldKey: row.field_key || '',
    clientMaterialId: row.client_material_id || '',
    status: row.status || 'included',
    sourceMeta: parseJson(row.source_meta, {}),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function rowToGeneration(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    inputRevision: Number(row.input_revision || 0),
    idempotencyKey: row.idempotency_key,
    snapshot: parseJson(row.snapshot, {}),
    bodyText: row.body_text || '',
    pendingItems: parseJson(row.pending_items, []),
    status: row.status || 'running',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    completedAt: row.completed_at instanceof Date ? row.completed_at.toISOString() : (row.completed_at || '')
  };
}

function createMemoryImplementation(store) {
  if (!Array.isArray(store.aiWorkspaces)) store.aiWorkspaces = [];
  if (!Array.isArray(store.aiMaterials)) store.aiMaterials = [];
  if (!Array.isArray(store.aiGenerations)) store.aiGenerations = [];

  return {
    async createWorkspace(input) {
      var now = nowIso();
      var item = {
        id: createId('aiw'), userId: input.userId, templateId: input.templateId,
        templateVersion: input.templateVersion || 1, audience: input.audience || 'general',
        detailLevel: input.detailLevel || 'standard', status: 'active', fieldValues: {},
        materialRevision: 0, createdAt: now, updatedAt: now
      };
      store.aiWorkspaces.push(item);
      return clone(item);
    },
    async getWorkspace(id, userId) {
      return clone(store.aiWorkspaces.find((item) => item.id === id && item.userId === userId) || null);
    },
    async updateWorkspace(id, userId, changes) {
      var item = store.aiWorkspaces.find((candidate) => candidate.id === id && candidate.userId === userId);
      if (!item) return null;
      Object.assign(item, clone(changes), { updatedAt: nowIso() });
      return clone(item);
    },
    async listMaterials(id, userId) {
      return clone(store.aiMaterials.filter((item) => item.workspaceId === id && item.userId === userId));
    },
    async addMaterial(input) {
      var existing = input.clientMaterialId && store.aiMaterials.find((item) => item.workspaceId === input.workspaceId && item.clientMaterialId === input.clientMaterialId);
      if (existing) return clone(existing);
      var now = nowIso();
      var item = Object.assign({ id: createId('aim'), status: 'included', sourceMeta: {}, createdAt: now, updatedAt: now }, clone(input));
      store.aiMaterials.push(item);
      var workspace = store.aiWorkspaces.find((candidate) => candidate.id === input.workspaceId && candidate.userId === input.userId);
      if (workspace) { workspace.materialRevision += 1; workspace.updatedAt = now; }
      return clone(item);
    },
    async updateMaterial(id, workspaceId, userId, status) {
      var item = store.aiMaterials.find((candidate) => candidate.id === id && candidate.workspaceId === workspaceId && candidate.userId === userId);
      if (!item) return null;
      if (item.status !== status) {
        item.status = status; item.updatedAt = nowIso();
        var workspace = store.aiWorkspaces.find((candidate) => candidate.id === workspaceId && candidate.userId === userId);
        if (workspace) { workspace.materialRevision += 1; workspace.updatedAt = item.updatedAt; }
      }
      return clone(item);
    },
    async saveField(workspaceId, userId, fieldKey, value) {
      var workspace = store.aiWorkspaces.find((candidate) => candidate.id === workspaceId && candidate.userId === userId);
      if (!workspace) return null;
      workspace.fieldValues[fieldKey] = value;
      workspace.materialRevision += 1;
      workspace.updatedAt = nowIso();
      return clone(workspace);
    },
    async createGeneration(input) {
      var existing = store.aiGenerations.find((item) => item.workspaceId === input.workspaceId && item.idempotencyKey === input.idempotencyKey);
      if (existing) return clone(existing);
      var item = Object.assign({ id: createId('aig'), status: 'running', bodyText: '', pendingItems: [], createdAt: nowIso(), completedAt: '' }, clone(input));
      store.aiGenerations.push(item);
      return clone(item);
    },
    async getGeneration(id, workspaceId, userId) {
      return clone(store.aiGenerations.find((item) => item.id === id && item.workspaceId === workspaceId && item.userId === userId) || null);
    },
    async completeGeneration(id, userId, result) {
      var item = store.aiGenerations.find((candidate) => candidate.id === id && candidate.userId === userId);
      if (!item) return null;
      item.status = result.status || 'completed'; item.bodyText = result.bodyText || '';
      item.pendingItems = clone(result.pendingItems || []); item.completedAt = nowIso();
      return clone(item);
    }
  };
}

function createSqlImplementation(pool) {
  async function queryOne(sql, values, mapper) {
    var [rows] = await pool.query(sql, values);
    return rows.length ? mapper(rows[0]) : null;
  }
  return {
    async createWorkspace(input) {
      var id = createId('aiw'); var now = sqlNow();
      await pool.query('INSERT INTO ai_workspaces (id,user_id,template_id,template_version,audience,detail_level,status,field_values,material_revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [id, input.userId, input.templateId, input.templateVersion || 1, input.audience || 'general', input.detailLevel || 'standard', 'active', JSON.stringify({}), 0, now, now]);
      return this.getWorkspace(id, input.userId);
    },
    getWorkspace(id, userId) {
      return queryOne('SELECT * FROM ai_workspaces WHERE id=? AND user_id=? LIMIT 1', [id, userId], rowToWorkspace);
    },
    async updateWorkspace(id, userId, changes) {
      var sets = []; var values = [];
      if (changes.detailLevel) { sets.push('detail_level=?'); values.push(changes.detailLevel); }
      if (changes.status) { sets.push('status=?'); values.push(changes.status); }
      if (!sets.length) return this.getWorkspace(id, userId);
      sets.push('updated_at=?'); values.push(sqlNow(), id, userId);
      await pool.query('UPDATE ai_workspaces SET ' + sets.join(',') + ' WHERE id=? AND user_id=?', values);
      return this.getWorkspace(id, userId);
    },
    async listMaterials(id, userId) {
      var [rows] = await pool.query('SELECT * FROM ai_materials WHERE workspace_id=? AND user_id=? ORDER BY created_at,id', [id, userId]);
      return rows.map(rowToMaterial);
    },
    async addMaterial(input) {
      if (input.clientMaterialId) {
        var existing = await queryOne('SELECT * FROM ai_materials WHERE workspace_id=? AND client_material_id=? LIMIT 1', [input.workspaceId, input.clientMaterialId], rowToMaterial);
        if (existing) return existing;
      }
      var id = createId('aim'); var now = sqlNow();
      var conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        var [inserted] = await conn.query('INSERT IGNORE INTO ai_materials (id,workspace_id,user_id,kind,text,field_key,client_material_id,status,source_meta,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [id, input.workspaceId, input.userId, input.kind, input.text, input.fieldKey || null, input.clientMaterialId || null, input.status || 'included', JSON.stringify(input.sourceMeta || {}), now, now]);
        if (inserted.affectedRows) await conn.query('UPDATE ai_workspaces SET material_revision=material_revision+1,updated_at=? WHERE id=? AND user_id=?', [now, input.workspaceId, input.userId]);
        await conn.commit();
      } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
      return input.clientMaterialId
        ? queryOne('SELECT * FROM ai_materials WHERE workspace_id=? AND client_material_id=? LIMIT 1', [input.workspaceId, input.clientMaterialId], rowToMaterial)
        : queryOne('SELECT * FROM ai_materials WHERE id=?', [id], rowToMaterial);
    },
    async updateMaterial(id, workspaceId, userId, status) {
      var now = sqlNow(); var conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        var [result] = await conn.query('UPDATE ai_materials SET status=?,updated_at=? WHERE id=? AND workspace_id=? AND user_id=? AND status<>?', [status, now, id, workspaceId, userId, status]);
        if (result.affectedRows) await conn.query('UPDATE ai_workspaces SET material_revision=material_revision+1,updated_at=? WHERE id=? AND user_id=?', [now, workspaceId, userId]);
        await conn.commit();
      } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
      return queryOne('SELECT * FROM ai_materials WHERE id=? AND workspace_id=? AND user_id=?', [id, workspaceId, userId], rowToMaterial);
    },
    async saveField(workspaceId, userId, fieldKey, value) {
      var jsonPath = '$."' + String(fieldKey).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
      var [result] = await pool.query('UPDATE ai_workspaces SET field_values=JSON_SET(field_values,?,?),material_revision=material_revision+1,updated_at=? WHERE id=? AND user_id=?', [jsonPath, value, sqlNow(), workspaceId, userId]);
      if (!result.affectedRows) return null;
      return this.getWorkspace(workspaceId, userId);
    },
    async createGeneration(input) {
      var existing = await queryOne('SELECT * FROM ai_generations WHERE workspace_id=? AND idempotency_key=? LIMIT 1', [input.workspaceId, input.idempotencyKey], rowToGeneration);
      if (existing) return existing;
      var id = createId('aig'); var now = sqlNow();
      await pool.query('INSERT IGNORE INTO ai_generations (id,workspace_id,user_id,input_revision,idempotency_key,snapshot,body_text,pending_items,status,created_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [id, input.workspaceId, input.userId, input.inputRevision, input.idempotencyKey, JSON.stringify(input.snapshot || {}), '', JSON.stringify([]), 'running', now, null]);
      return queryOne('SELECT * FROM ai_generations WHERE workspace_id=? AND idempotency_key=? LIMIT 1', [input.workspaceId, input.idempotencyKey], rowToGeneration);
    },
    getGeneration(id, workspaceId, userId) {
      return queryOne('SELECT * FROM ai_generations WHERE id=? AND workspace_id=? AND user_id=? LIMIT 1', [id, workspaceId, userId], rowToGeneration);
    },
    async completeGeneration(id, userId, result) {
      var completedAt = sqlNow();
      await pool.query('UPDATE ai_generations SET status=?,body_text=?,pending_items=?,completed_at=? WHERE id=? AND user_id=?',
        [result.status || 'completed', result.bodyText || '', JSON.stringify(result.pendingItems || []), completedAt, id, userId]);
      return queryOne('SELECT * FROM ai_generations WHERE id=? AND user_id=?', [id, userId], rowToGeneration);
    }
  };
}

function createAiWorkspaceRepository(store) {
  return store && store.__pool ? createSqlImplementation(store.__pool) : createMemoryImplementation(store || {});
}

module.exports = { createAiWorkspaceRepository, rowToGeneration, rowToMaterial, rowToWorkspace };
