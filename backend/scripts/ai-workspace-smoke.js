const { createMemoryStore } = require('../src/store/memory-store');
const { createAiWorkspaceRepository } = require('../src/repositories/ai-workspace-repository');
const { collectTemplateFields, resolveTemplateFieldKey } = require('../src/modules/ai-workspaces');
const contentAccess = require('../src/security/content-access');
const deviceSession = require('../src/security/device-session');

async function main() {
  var insertedWorkspaceValues = null;
  var sqlRepository = createAiWorkspaceRepository({
    __pool: {
      query: async function (sql, values) {
        if (sql.indexOf('INSERT INTO ai_workspaces') === 0) {
          insertedWorkspaceValues = values;
          return [{ affectedRows: 1 }];
        }
        if (sql.indexOf('SELECT * FROM ai_workspaces') === 0) {
          return [[{
            id: values[0], user_id: values[1], template_id: 'tpl_general', template_version: 1,
            audience: 'general', detail_level: 'standard', status: 'active', field_values: '{}',
            material_revision: 0, created_at: new Date(), updated_at: new Date()
          }]];
        }
        throw new Error('unexpected SQL in date smoke: ' + sql);
      }
    }
  });
  await sqlRepository.createWorkspace({ userId: 'sql-user', templateId: 'tpl_general' });
  if (!(insertedWorkspaceValues[9] instanceof Date) || !(insertedWorkspaceValues[10] instanceof Date)) {
    throw new Error('MySQL DATETIME values must be Date objects');
  }

  const store = createMemoryStore();
  const repository = createAiWorkspaceRepository(store);
  const user = store.users[0];
  const device = store.devices[0];

  const fields = collectTemplateFields({
    first: { item: { label: '相同标签', is_required: true } },
    second: { item: { label: '相同标签' } }
  });
  if (fields.length !== 2 || fields[0].key === fields[1].key) {
    throw new Error('nested fields must keep stable unique paths even when labels match');
  }
  if (resolveTemplateFieldKey(fields, fields[0].key) !== fields[0].key) {
    throw new Error('canonical nested field key was not accepted');
  }
  if (resolveTemplateFieldKey([{ key: 'section.unique', label: '唯一字段' }], 'unique') !== 'section.unique') {
    throw new Error('unique legacy leaf field key was not mapped for compatibility');
  }
  if (resolveTemplateFieldKey(fields, 'item')) {
    throw new Error('ambiguous legacy leaf field key must not be guessed');
  }

  const first = await repository.createWorkspace({ userId: user.id, templateId: 'tpl-a', templateVersion: 3, audience: 'general' });
  const second = await repository.createWorkspace({ userId: user.id, templateId: 'tpl-b', templateVersion: 3, audience: 'general' });
  await repository.saveField(first.id, user.id, fields[0].key, '值一');
  await repository.saveField(first.id, user.id, fields[1].key, '值二');
  const firstRestored = await repository.getWorkspace(first.id, user.id);
  if (firstRestored.fieldValues[fields[0].key] !== '值一' || firstRestored.fieldValues[fields[1].key] !== '值二') {
    throw new Error('field values were overwritten by duplicate labels');
  }

  const material = await repository.addMaterial({
    workspaceId: first.id, userId: user.id, kind: 'ocr', text: '工作区一材料',
    clientMaterialId: 'ocr-1', status: 'included', sourceMeta: { source: 'image' }
  });
  const duplicate = await repository.addMaterial({
    workspaceId: first.id, userId: user.id, kind: 'ocr', text: '不应重复',
    clientMaterialId: 'ocr-1', status: 'included', sourceMeta: {}
  });
  if (material.id !== duplicate.id || (await repository.listMaterials(first.id, user.id)).length !== 1) {
    throw new Error('client material id must be idempotent');
  }
  if ((await repository.listMaterials(second.id, user.id)).length !== 0) {
    throw new Error('materials leaked into another workspace');
  }

  const snapshot = { workspaceId: first.id, fields: firstRestored.fieldValues, materials: [material], inputRevision: 3 };
  const generation = await repository.createGeneration({
    workspaceId: first.id, userId: user.id, inputRevision: 3,
    idempotencyKey: 'generate-1', snapshot
  });
  const sameGeneration = await repository.createGeneration({
    workspaceId: first.id, userId: user.id, inputRevision: 3,
    idempotencyKey: 'generate-1', snapshot: { changed: true }
  });
  if (generation.id !== sameGeneration.id || sameGeneration.snapshot.changed) {
    throw new Error('generation snapshot must be immutable and idempotent');
  }

  const challenge = deviceSession.createChallenge(store, user.id, device);
  const verified = deviceSession.verifyChallengeAndIssue(store, user.id, { challengeId: challenge.id, proofCode: '0000' });
  if (!verified.ok) throw new Error('device session setup failed: ' + verified.code);
  const issued = verified.data;
  const live = deviceSession.issueLiveProof(store, user.id, device);
  const denied = contentAccess.getAccessContext({
    store, userId: user.id, businessKey: 'aiMode', req: { url: '/api/ai/workspaces', headers: {} }
  });
  const allowed = contentAccess.getAccessContext({
    store, userId: user.id, businessKey: 'aiMode',
    req: { url: '/api/ai/workspaces', headers: { 'x-device-session': issued.deviceSessionToken, 'x-device-live': live.liveProof } }
  });
  if (denied.hasProfessionalAccess || !allowed.hasProfessionalAccess) {
    throw new Error('professional access must require the existing device session and live proof chain');
  }

  console.log('AI_WORKSPACE_SMOKE_OK');
}

main().catch(function (error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
