const { createOfficialTemplate } = require('./factory');

const CONSULTATION_SAMPLE = `梅毒会诊：否
当前诊断：
2型糖尿病伴血糖控制不佳
会诊意见：
NRS2002评分2分
患者现食欲胃纳可，饮食摄入满足日常所需80-100%， 早餐以牛奶、鸡蛋和馒头为主，中晚餐以荤素+米饭/面条为主，近2年体重下降约5kg（下降幅度11%），目前推荐能量1200Kcal/d，建议如下：
1、维持糖尿病普食；
2、营养宣教：已详细指导患者及家属饮食合理分配及适宜量，避免易升糖食物及脂肪含量较高食物摄入，控制淀粉类食物总摄入量，解答其饮食疑问等。
谢邀~
注意事项：
已予以口头营养咨询，表示知晓。`;

const CONSULTATION_FIELDS = {
  disease_context: {
    _label: '疾病背景',
    syphilis_consultation: {
      label: '梅毒会诊',
      type: 'string',
      is_required: false,
      description: '提取梅毒会诊对应状态（如：否）'
    },
    current_diagnosis: {
      label: '当前诊断',
      type: 'array',
      is_required: true,
      description: '按疾病名词切分为字符串数组',
      items: { type: 'string' }
    }
  },
  consultation_opinion: {
    _label: '会诊意见',
    clinical_evaluation: {
      label: '临床评估',
      type: 'string',
      is_required: true,
      description: '提取「建议如下」之前的前置叙述，过滤无临床意义的客套话'
    },
    nrs2002_score: {
      label: 'NRS2002评分',
      type: 'number',
      is_required: false,
      description: '若包含评分则提取纯数字，无则留空'
    },
    suggestions: {
      label: '具体建议',
      type: 'array',
      is_required: true,
      description: '按1、2、3等序号拆分为独立数组元素',
      items: { type: 'string' }
    }
  },
  precautions_and_consent: {
    label: '注意事项',
    type: 'string',
    is_required: false,
    description: '提取注意事项栏内的完整文本'
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
