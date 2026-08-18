const assert = require('assert');
const workspaceIntent = require('../src/modules/workspace-intent');
const inputAdapter = require('../../services/ai/workspace-input');
const { buildMaterialCatalog } = require('../src/modules/ai-workspaces');

var workspace = { id: 'aiw_intent' };
var fields = ['patient_name', 'chief_complaint'];
var catalog = [
  { id: 'material-1', kind: 'ocr', index: 1, label: '第1张图片', summary: '化验单' },
  { id: 'material-2', kind: 'ocr', index: 2, label: '第2张图片', summary: '检验单' },
  { id: 'material-3', kind: 'asr', index: 3, label: '第1段录音', summary: '口述' }
];

var direct = workspaceIntent.deterministicIntent('就这样吧，开始写吧', catalog);
assert.strictEqual(direct.type, 'generate');
var directRemoval = workspaceIntent.deterministicIntent('移除第二张图片', catalog);
assert.strictEqual(directRemoval.type, 'exclude_material');
assert.strictEqual(directRemoval.target.materialId, 'material-2');
var directRestore = workspaceIntent.deterministicIntent('恢复第一段录音', catalog);
assert.strictEqual(directRestore.type, 'restore_material');
assert.strictEqual(directRestore.target.materialId, 'material-3');
var mixedCatalog = buildMaterialCatalog([
  { id: 'typed-1', kind: 'typed', text: '补充说明', status: 'included' },
  { id: 'image-1', kind: 'ocr', text: '第一张化验单', status: 'included' },
  { id: 'audio-1', kind: 'asr', text: '第一段录音', status: 'included' },
  { id: 'image-2', kind: 'ocr', text: '第二张化验单', status: 'included' }
]);
assert.deepStrictEqual(mixedCatalog.map(function (item) { return item.label; }), ['第1份文字', '第1张图片', '第1段录音', '第2张图片']);
assert.strictEqual(workspaceIntent.deterministicIntent('移除第二张图片', mixedCatalog).target.materialId, 'image-2');

var invalid = workspaceIntent.validateIntent({
  type: 'update_field', target: { fieldKey: 'not_allowed' }, payload: { value: 'x' }, confidence: 0.99
}, workspace, fields, catalog);
assert.strictEqual(invalid.type, 'unclear');
assert.strictEqual(invalid.target.workspaceId, workspace.id);

var invalidRemoval = workspaceIntent.validateIntent({
  type: 'exclude_material', target: { materialId: 'missing' }, payload: {}, confidence: 0.99
}, workspace, fields, catalog);
assert.strictEqual(invalidRemoval.type, 'unclear');

var validRemoval = workspaceIntent.validateIntent({
  type: 'exclude_material', target: { materialId: 'material-1' }, payload: {}, confidence: 0.99
}, workspace, fields, catalog);
var removalMapped = inputAdapter.fromDecision({ intents: [validRemoval] }, []);
assert.deepStrictEqual(removalMapped.materialActions, [{ materialId: 'material-1', status: 'excluded' }]);
assert.strictEqual(removalMapped.includeRawText, false);

var mapped = inputAdapter.fromDecision({
  intents: [
    { type: 'update_field', target: { fieldKey: 'patient_name' }, payload: { value: '王大力' }, confidence: 0.99 },
    { type: 'add_fact', target: {}, payload: { text: '昨晚发热' }, confidence: 0.97 },
    { type: 'generate', target: {}, payload: {}, confidence: 0.98 }
  ]
}, [{ key: 'patient_name', label: '姓名' }]);
assert.deepStrictEqual(mapped.fieldUpdates, [{ key: 'patient_name', label: '姓名', value: '王大力' }]);
assert.strictEqual(mapped.includeRawText, true);
assert.strictEqual(mapped.generateAfterAdd, true);

var chat = inputAdapter.fromDecision({ intents: [{ type: 'general_chat', confidence: 0.99 }] }, []);
assert.strictEqual(chat.generalChat, true);
assert.strictEqual(chat.includeRawText, false);
console.log('AI_WORKSPACE_INTENT_SMOKE_OK');
