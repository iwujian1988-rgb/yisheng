const COMMON_CRITICAL_FACTS = [
  '数值与单位', '时间与时长', '药物名称与用法', '过敏信息', '否定与不确定表达'
];

const COMMON_STYLE_RULES = [
  '只使用源材料中明确提供的事实',
  '保留数值、单位、时间、药名、否定和不确定性',
  '将零散材料归入对应章节，不按输入顺序逐行复制',
  '仅输出有事实支撑的章节，不输出空标题或占位正文',
  '结果是待用户核对的可编辑草稿'
];

const COMMON_FORBIDDEN = [
  '不得新增源材料未提供的诊断、检查结果、治疗、用药、风险或预后',
  '不得把疑似、考虑、待排改成确定结论',
  '不得改变否定事实、过敏信息、药物、剂量、频次、途径或关键数值',
  '不得引用模板示例中的任何事实'
];

function contract(sections, extra) {
  return Object.assign({
    version: 2,
    sections: sections,
    criticalFacts: COMMON_CRITICAL_FACTS,
    styleRules: COMMON_STYLE_RULES,
    missingPolicy: '缺失章节从正文省略；仅将确实影响可用性的少量信息列入待确认，用户可跳过。',
    forbiddenInferences: COMMON_FORBIDDEN
  }, extra || {});
}

const CONTRACTS = {
  tpl_official_admission_note: contract(
    ['一般资料', '主诉', '现病史', '既往史', '个人史、婚育史与家族史', '体格检查', '专科检查', '辅助检查', '诊断结论', '会诊需求'],
    { purpose: '将用户已提供的入院相关记录整理为大病历草稿，保留重要阴性病史。' }
  ),
  tpl_official_first_course: contract(
    ['病例特点', '初步诊断', '诊断依据', '鉴别诊断', '诊疗计划'],
    { purpose: '整理用户已明确提供的首次病程记录内容。', judgmentPolicy: '初步诊断、诊断依据、鉴别诊断和诊疗计划只能整理用户已明确表达的专业判断，不得由病史自动推导。' }
  ),
  tpl_official_discharge_order: contract(
    ['入院诊断', '出院诊断', '入院情况', '住院诊治经过', '出院情况', '出院带药', '出院指导', '随访与复诊安排'],
    { purpose: '将住院期间已提供的记录整理为出院记录草稿。', medicationPolicy: '出院带药必须逐项保留药名、规格、数量、每次用量、途径和频次；无法确认时不得猜测。' }
  ),
  tpl_official_talk_72h: contract(
    ['沟通信息', '简要病情', '入院后检查结果', '已告知的当前诊断', '已告知的风险与并发症', '已告知的诊疗方案', '患方意见与理解'],
    { purpose: '整理已实际发生的沟通内容，不自动生成未告知的风险或方案。' }
  ),
  tpl_official_consultation: contract(
    ['会诊基本信息', '会诊目的', '病情摘要', '相关检查', '已明确的会诊意见', '已明确的处理建议'],
    { purpose: '将会诊申请和已提供的会诊结果整理为通用会诊记录草稿。', judgmentPolicy: '未提供会诊意见时，不得代替会诊人员生成意见或处理建议。' }
  )
};

function getGenerationContract(templateId) {
  return CONTRACTS[templateId] || contract([], {
    purpose: '将用户提供的材料整理为当前模板对应的可编辑草稿。'
  });
}

module.exports = { getGenerationContract };
