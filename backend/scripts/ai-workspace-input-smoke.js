const workspaceInput = require('../../services/ai/workspace-input');
const { assessTextQuality } = require('../src/modules/text-quality');
const { generationResultState } = require('../src/modules/agent-api');

const fields = [
  { key: 'general_information.name', label: '姓名' },
  { key: 'general_information.age', label: '年龄' }
];

const nameChange = workspaceInput.classify('姓名改为王大力', fields);
if (nameChange.role !== 'field_update'
  || nameChange.fieldUpdates.length !== 1
  || nameChange.fieldUpdates[0].key !== 'general_information.name'
  || nameChange.fieldUpdates[0].value !== '王大力') {
  throw new Error('explicit template-field correction was not classified');
}
const conversationalNameChange = workspaceInput.classify('帮我把姓名换成王大力', fields);
if (conversationalNameChange.role !== 'field_update' || conversationalNameChange.fieldUpdates[0].value !== '王大力') {
  throw new Error('conversational field correction was not classified');
}

if (workspaceInput.classify('只保留异常指标，并按时间顺序整理', fields).role !== 'instruction') {
  throw new Error('writing instruction was mixed into patient facts');
}
if (workspaceInput.classify('第二张报告HGB不是150，是130', fields).role !== 'correction') {
  throw new Error('OCR correction was not classified');
}
if (workspaceInput.classify('帮我把第二张检验单的年龄删掉', fields).role !== 'correction') {
  throw new Error('delete correction was not classified');
}
if (workspaceInput.classify('这段不要放进正文', fields).role !== 'instruction') {
  throw new Error('exclude instruction was not classified');
}
if (workspaceInput.classify('患者昨晚发热39℃，无呕吐', fields).role !== 'patient_fact') {
  throw new Error('patient fact was not classified');
}

const missing = assessTextQuality(
  '【用户确认的模板字段｜高优先级】\n姓名：王大力',
  '一般资料\n姓名：【姓名】',
  {},
  [{ key: 'general_information.name', label: '姓名', value: '王大力' }]
);
if (!missing.missingConfirmedFields.includes('姓名')
  || !missing.warnings.some((item) => item.code === 'CONFIRMED_FIELD_MISSING')) {
  throw new Error('missing confirmed field did not fail output quality review');
}

const passed = assessTextQuality(
  '姓名：王大力',
  '一般资料\n姓名：王大力',
  {},
  [{ key: 'general_information.name', label: '姓名', value: '王大力' }]
);
if (passed.missingConfirmedFields.length) {
  throw new Error('present confirmed field was incorrectly reported missing');
}

const conflict = assessTextQuality(
  '【OCR图片材料｜来源1】姓名：吴念龙\n【OCR图片材料｜来源2】姓名：王大力',
  '一般资料',
  {},
  []
);
if (!conflict.sourceConflicts.length || !conflict.warnings.some((item) => item.code === 'SOURCE_CONFLICT')) {
  throw new Error('cross-source identity conflict was not surfaced for confirmation');
}
const resolvedIdentity = assessTextQuality(
  '【用户确认的模板字段｜高优先级】\n姓名：王大力\n\n【OCR图片材料｜来源 image-1】\n姓名：吴念龙',
  '一般资料\n姓名：王大力',
  {},
  [{ key: 'general_information.name', label: '姓名', value: '王大力' }]
);
if (resolvedIdentity.sourceConflicts.length || !resolvedIdentity.resolvedSourceConflicts.length) {
  throw new Error('confirmed field did not resolve a lower-priority OCR identity conflict');
}
const sameDateLabConflict = assessTextQuality(
  '【OCR图片材料｜来源 image-1】\n2026-08-17 WBC：7.82\n\n【OCR图片材料｜来源 image-2】\n2026-08-17 WBC：9.10',
  '检验结果待核对', {}, []
);
if (!sameDateLabConflict.sourceConflicts.some((item) => item.label.indexOf('2026-08-17 WBC') >= 0)) {
  throw new Error('same-date same-item laboratory conflict was not detected');
}
const differentDateTrend = assessTextQuality(
  '【OCR图片材料｜来源 image-1】\n2026-08-16 WBC：7.82\n\n【OCR图片材料｜来源 image-2】\n2026-08-17 WBC：9.10',
  '检验结果按日期保留', {}, []
);
if (differentDateTrend.sourceConflicts.length) {
  throw new Error('different-date laboratory trend was incorrectly treated as a conflict');
}

const genericLabFacts = [
  { factId: 'tp-a', sourceId: 'image-a', code: 'TP', name: '总蛋白', result: '72.1', unit: 'g/L', referenceRange: '65-85', dateType: 'report', dateValue: '2026-08-17' },
  { factId: 'tp-b', sourceId: 'image-b', code: 'TP', name: '总蛋白', result: '79.4', unit: 'g/L', referenceRange: '65-85', dateType: 'report', dateValue: '2026-08-17' }
];
const genericConflict = assessTextQuality('', '', {}, [], { structuredFacts: genericLabFacts });
if (!genericConflict.sourceConflicts.some((item) => item.type === 'lab_tuple' && item.label === '总蛋白')) {
  throw new Error('generic same-date lab tuple conflict was not detected');
}
if (generationResultState({ status: 'ok', bodyText: 'draft', quality: genericConflict }).status !== 'needs_review') {
  throw new Error('an unresolved generic lab conflict was cached as completed');
}
const genericTrend = assessTextQuality('', '', {}, [], { structuredFacts: [
  genericLabFacts[0], Object.assign({}, genericLabFacts[1], { dateValue: '2026-08-18' })
] });
if (genericTrend.sourceConflicts.length) throw new Error('generic different-date lab trend was treated as a conflict');

if (generationResultState({
  status: 'needs_review', bodyText: '姓名：【姓名】', quality: { missingConfirmedFields: ['姓名'] }
}).status === 'completed') {
  throw new Error('a draft still missing confirmed fields was cached as completed');
}
if (generationResultState({
  status: 'ok', bodyText: '姓名：王大力', quality: { missingConfirmedFields: [] }
}).status !== 'completed') {
  throw new Error('a repaired draft with all confirmed fields was not completed');
}

console.log('AI_WORKSPACE_INPUT_SMOKE_OK');
