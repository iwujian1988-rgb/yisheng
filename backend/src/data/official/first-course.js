const { createOfficialTemplate } = require('./factory');

const FIRST_COURSE_SAMPLE = `病例特点:
1.患者，男，54岁，因"口干多饮多尿体重减轻4月余，乏力半月余"入院;
2.患者4月余前无明显诱因下一个月内体重下降10kg(2024.12-2025.01体重从90kg下降至80kg左右)，伴口干，多饮，5-10L每天，多尿，夜尿2-3次每天，无泡沫尿，无恶心呕吐、心慌发抖，无视物模糊、手足麻木等症状，未予重视，未就诊。半月前患者无明显诱因下出现乏力，口干多饮多尿症状同前，昨日外院测血糖高(数值不可测得)，无明显不适.
3.既往:高血压40年，最高血压160/110mmHg，口服络活喜降压治疗，平素血压150-160/80-90mmHg。高尿酸10年余，口服非布司他降尿酸。
4.查体:血压:152/92mmHg,脉搏:71次/分钟,体温(耳):37.4°C,呼吸:20次/分钟,身高:174cm,体重:78.2Kg,体重指数:25.8。腰围92cm。神清，精神可，全身浅表淋巴结未触及肿大，胸廓无畸形，双肺呼吸音清，未闻及干湿啰音，心界无扩大，心律齐，心前各瓣膜区未闻及病理性杂音。腹膨隆，无压痛反跳痛，肝脾肋下未及。双下肢无浮肿，双侧足背动脉搏动正常可及。双侧肢体温度觉、痛觉、压力觉、位置觉、振动觉未见明显异常
5.辅助检查:2025-3-13外院胸部CT:两肺少许微小结节灶伴部分纤维增殖灶，建议年度复查。冠状动脉钙化，建议冠脉CTA检查。入院随机血糖:血糖:29.7mmol/L。
初步诊断:
糖尿病
	2型?
	1型?
	特殊类型?
高血压2级 很高危
高尿酸血症 
两肺小结节
冠状动脉钙化
诊断依据：
患者中年男性，因"口干多饮多尿体重减轻4月余，乏力半月余"入院。患者既往高血压，高尿酸血症病史。患者4月余前无明显诱因下一个月内体重下降10kg(2024.12-2025.01体重从90kg下降至80kg左右)，伴口干，多饮，5-10L每天，多尿，夜尿2-3次每天，无泡沫尿，无恶心呕吐、心慌发抖，无视物模糊、手足麻木等症状，未予重视，未就诊。半月前患者无明显诱因下出现乏力，口干多饮多尿症状同前，昨日外院测血糖高(数值不可测得)，无明显不适，为进一步诊治来我院。2025-3-13外院胸部CT:两肺少许微小结节灶伴部分纤维增殖灶，建议年度复查。冠状动脉钙化，建议冠脉CTA检查。入院随机血糖:血糖:29.7mmol/L。
鉴别诊断:
1.2型糖尿病:多中年起病，一般起病缓慢，三多一少症状可不显著，无自发酮症倾向，可有糖尿病家族史，胰岛素分泌减少伴胰岛素抵抗，起病时一般不依赖胰岛素治疗。2.1型糖尿病:一般起病较急，青少年起病，三多一少症状明显，有自发酮症倾向，体型常消瘦，胰岛素分泌绝对缺乏，依赖胰岛素治疗，糖尿病自身抗体阳性。3.成人迟发性自身免疫性糖尿病:主要分为两期:非胰岛素依赖期:临床表现貌似T2DM，但三多一少症状较典型T2DM明显，发病6个月内无酮症，血浆C肽水平较低，血糖短期内可用饮食和(或)口服降糖药控制。胰岛素依赖期:自起病后半年至数年后，出现胰岛B细胞功能进行性损伤，最终依靠胰岛素治疗，并出现酮症倾向。
诊疗计划(包括可衡量的目标和出院计划):
1.内科护理常规，二级护理，糖尿病饮食;
2.完善三大常规、胸部CT、血管b超、24小时尿蛋白定量、肌电图、血管超声等并发症筛查;
3.治疗上予胰岛素泵(基础量9-24点0.5u/h，基础量4-9点0.4u/h，基础量0-4点0.4u/h)+[锐舒霖]门冬胰岛素针(预充)4iu皮下注射每日三次控制血糖。根据血糖及检查结果调整治疗方案。
4.可衡量的目标和出院计划:住院期间进行糖尿病饮食指导，知晓糖尿病相关知识，出院后糖尿病饮食控制，规律用药，定期监测血糖，注意低血糖，知晓低血糖应对方法，内分泌科门诊定期随访。
入院时在使用的治疗性药物：有，络活喜每日一次每次1颗，非布司他每日一次每次0.5颗
成瘾药物:无`;

const FIRST_COURSE_FIELDS = {
  case_features: {
    _label: '病例特点',
    general_info: {
      label: '一般情况',
      type: 'string',
      is_required: true,
      description: '提取患者、性别、年龄'
    },
    chief_complaint: {
      label: '主诉',
      type: 'string',
      is_required: true,
      description: '20字以内简要概括此次发病主要症状'
    },
    present_illness: {
      label: '现病史',
      type: 'text',
      is_required: true,
      description: '详细描述此次发病过程'
    },
    past_history: {
      label: '既往史',
      type: 'text',
      is_required: false,
      description: '既往疾病史、用药史'
    },
    physical_exam: {
      label: '体格检查',
      type: 'text',
      is_required: true,
      description: '生命体征与诊断相关查体；阴性体征保留简要描述'
    },
    auxiliary_exam: {
      label: '辅检结果',
      type: 'array',
      is_required: false,
      description: '每项结果前须含时间与地点',
      items: { type: 'string' }
    }
  },
  preliminary_diagnosis: {
    _label: '初步诊断',
    primary_diagnosis: {
      label: '主诊断',
      type: 'string',
      is_required: true,
      description: '核心主要诊断'
    },
    secondary_diagnosis: {
      label: '次诊断',
      type: 'array',
      is_required: false,
      description: '次要诊断列表',
      items: { type: 'string' }
    }
  },
  diagnosis_basis: {
    _label: '诊断依据',
    history_basis: {
      label: '病史特点',
      type: 'string',
      is_required: true,
      description: '仅整理用户已明确提供的病史诊断依据，不得自行推导'
    },
    disease_features: {
      label: '疾病特征',
      type: 'string',
      is_required: true,
      description: '仅整理用户已明确表达的疾病特征与发展过程'
    },
    exam_basis: {
      label: '查体依据',
      type: 'string',
      is_required: false,
      description: '与诊断强相关的阳性体征'
    },
    auxiliary_basis: {
      label: '辅检依据',
      type: 'string',
      is_required: false,
      description: '仅概括性阳性结果，不罗列原始数值'
    }
  },
  differential_diagnosis: {
    _label: '鉴别诊断',
    differential_list: {
      label: '鉴别项目',
      type: 'array',
      is_required: false,
      description: '仅提取用户已明确提供的鉴别诊断，不得自动生成',
      items: { type: 'string' }
    }
  },
  treatment_plan: {
    _label: '诊疗计划',
    nursing_monitoring: {
      label: '护理与监测',
      type: 'string',
      is_required: false,
      description: '护理级别、饮食及监测要求'
    },
    further_exam: {
      label: '进一步检查',
      type: 'string',
      is_required: false,
      description: '入院后需完善的检查项目'
    },
    treatment_principle: {
      label: '治疗原则',
      type: 'string',
      is_required: false,
      description: '仅整理用户已明确提供的治疗原则或方案'
    },
    patient_education: {
      label: '知识宣教',
      type: 'string',
      is_required: false,
      description: '患者宣教内容'
    }
  }
};

function createFirstCourseOfficialTemplate(nowIso) {
  return createOfficialTemplate({
    id: 'tpl_official_first_course',
    template_type: '首次病程记录',
    name: '首次病程记录',
    fields: FIRST_COURSE_FIELDS,
    sample: FIRST_COURSE_SAMPLE
  }, nowIso);
}

module.exports = {
  FIRST_COURSE_FIELDS,
  FIRST_COURSE_SAMPLE,
  createFirstCourseOfficialTemplate
};
