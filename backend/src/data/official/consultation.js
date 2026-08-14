const { createOfficialTemplate } = require('./factory');

const CONSULTATION_SAMPLE = `会诊基本信息：{申请科室、会诊科室、日期时间}
会诊目的：{用户明确提供的目的}
病情摘要：{与本次会诊相关的已知事实}
相关检查：{用户明确提供的检查结果}
会诊意见：{会诊人员已明确提供的意见}
处理建议：{会诊人员已明确提供的建议}`;

const CONSULTATION_FIELDS = {
  consultation_info: {
    _label: '会诊基本信息',
    requesting_department: {
      label: '申请科室',
      type: 'string',
      is_required: false,
      description: '仅提取用户明确提供的申请科室'
    },
    consulting_department: {
      label: '会诊科室',
      type: 'string',
      is_required: false,
      description: '仅提取用户明确提供的会诊科室'
    },
    consultation_time: {
      label: '会诊时间',
      type: 'string',
      is_required: false,
      description: '保留日期与时间原文'
    },
    purpose: {
      label: '会诊目的',
      type: 'string',
      is_required: true,
      description: '整理用户明确提供的会诊原因或希望解决的问题'
    }
  },
  case_summary: {
    _label: '会诊材料',
    condition_summary: {
      label: '病情摘要',
      type: 'string',
      is_required: true,
      description: '只整理与本次会诊相关的已知事实，保留否定和不确定性'
    },
    relevant_examinations: {
      label: '相关检查',
      type: 'array',
      is_required: false,
      description: '保留检查名称、时间、结果、数值和单位',
      items: { type: 'string' }
    },
    known_diagnoses: {
      label: '已明确诊断',
      type: 'array',
      is_required: false,
      description: '仅提取用户明确提供的诊断，保留疑似、考虑、待排等表达',
      items: { type: 'string' }
    }
  },
  consultation_result: {
    _label: '会诊结果',
    opinion: {
      label: '会诊意见',
      type: 'string',
      is_required: false,
      description: '仅整理会诊人员已明确提供的意见，未提供时不得自动生成'
    },
    suggestions: {
      label: '处理建议',
      type: 'array',
      is_required: false,
      description: '仅整理会诊人员已明确提供的建议，不得自动补充',
      items: { type: 'string' }
    },
    consultant: {
      label: '会诊人员',
      type: 'string',
      is_required: false,
      description: '仅提取用户明确提供的人员信息'
    }
  }
};

function createConsultationOfficialTemplate(nowIso) {
  return createOfficialTemplate({
    id: 'tpl_official_consultation',
    template_type: '会诊记录',
    name: '会诊记录',
    fields: CONSULTATION_FIELDS,
    sample: CONSULTATION_SAMPLE
  }, nowIso);
}

module.exports = {
  CONSULTATION_FIELDS,
  CONSULTATION_SAMPLE,
  createConsultationOfficialTemplate
};
