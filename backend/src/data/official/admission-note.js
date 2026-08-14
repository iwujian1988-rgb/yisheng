const { createOfficialTemplate } = require('./factory');

const ADMISSION_NOTE_SAMPLE = `主诉 Chief Concern
口干多饮多尿6年余，加重1周
现病史 History of Present Illness
患者6年余前体检时发现空腹血糖10+mmol/L,伴口干，多饮，饮水量1-2L每天，多尿，夜尿1-2次每天，无泡沫尿，无恶心呕吐，心慌发抖等症状，无视物模糊，当地医院予"口服药"（具体不详）治疗，监测血糖空腹6-7mmol/L，一周后停用降糖药。6年来未服药，未监测血糖。1周前患者夜尿次数较前增加，3-4次每天，口干多饮症状同前，双脚大足趾发麻，夜间明显，外院(2025.03.19)查空腹血糖15.66mmol/L,糖化13.3%，总胆固醇6.65mmol/L,低密度脂蛋白4.29mmol/L,尿糖4+。为进一步诊治来我院，门诊拟"糖尿病"收住入科。自病以来，神清，精神可，胃纳可，睡眠差，小便如上述，大便无殊，体重3年下降5kg。
过去史 Past History
一般健康状况：良好
内科疾病史：高血压：否认 糖尿病：有 心脏病：否认
手术外伤史：40年余前行阑尾切除术
输血史：否认
过敏史：未发现
预防接种史：随社会
个人史 Personal History
个体习惯：吸烟：否认 饮酒：已戒酒
婚姻、月经及生育史：结婚年龄:26岁 生育史:1-0-2-1(足-早-流-存) 月经史:15 [5-6/30] 47 绝经
家族史：家庭成员类似病史：三个哥哥和弟弟均糖尿病 两系三代遗传性疾病或遗传倾向性疾病：糖尿病
体格检查
生命体征：体温℃ 36.2 脉搏(次/分) 84 呼吸(次/分) 20 血压(mmHg) 176/90
一般情况：神志 清醒 体位 自主 发育 正常 身高(cm) 143 体重(kg) 40.8 营养 良好 BMI 20
心脏检查：听诊:心率(次/分) 84 心律 齐 杂音 无 叩诊:左锁骨中线距前正中线8cm
腹部检查：腹肌紧张度 柔软 压痛 无 肝界位于右锁骨中线第5肋间 肠鸣音 正常
专科检查
查体：血压:176/90mmHg,脉搏:84次/分钟,体温（耳）:36.2℃,呼吸:20次/分钟,身高:143cm,体重:40.8Kg,体重指数:20.0。神清，精神可，全身浅表淋巴结未触及肿大，胸廓无畸形，双肺呼吸音清，未闻及干湿啰音，心界无扩大，心律齐，心前各瓣膜区未闻及病理性杂音。腹软，无压痛反跳痛，肝脾肋下未及。双下肢无浮肿，双侧足背动脉搏动正常可及。双侧肢体温度觉、痛觉、压力觉、位置觉、振动觉未见明显异常。
辅助检查
实验室检查(Laboratory) /  影像学检查(Imaging) /
其他(Other) 患者入院血糖20.3mmol/L。
初步诊断 Impression
糖尿病 2型? 1型? 特殊类型?
康复会诊: 不需要 营养会诊: 需要`;

const ADMISSION_NOTE_FIELDS = {
  general_information: {
    _label: '一般资料',
    name: { label: '姓名', type: 'string', is_required: false, description: '仅在材料明确提供时整理' },
    sex: { label: '性别', type: 'string', is_required: false, description: '仅在材料明确提供时整理' },
    age: { label: '年龄', type: 'string', is_required: false, description: '保留原始年龄及单位' },
    ethnicity: { label: '民族', type: 'string', is_required: false, description: '仅在材料明确提供时整理' },
    occupation: { label: '职业', type: 'string', is_required: false, description: '仅在材料明确提供时整理' },
    marital_status: { label: '婚姻状况', type: 'string', is_required: false, description: '仅在材料明确提供时整理' },
    address: { label: '住址', type: 'string', is_required: false, description: '仅在材料明确提供时整理，不推断地域' },
    admission_time: { label: '入院时间', type: 'string', is_required: false, description: '保留原始日期与时间' },
    record_time: { label: '记录时间', type: 'string', is_required: false, description: '保留原始日期与时间' },
    history_provider: { label: '病史陈述者', type: 'string', is_required: false, description: '患者本人、家属或其他明确来源' },
    history_reliability: { label: '病史可靠性', type: 'string', is_required: false, description: '仅记录材料中明确给出的判断，不自行评定' }
  },
  medical_history: {
    _label: '核心病史',
    chief_concern: {
      label: '主诉',
      type: 'string',
      is_required: true,
      description: '提取患者的主要症状及持续时间'
    },
    history_of_present_illness: {
      label: '现病史',
      type: 'text',
      is_required: true,
      description: '提取完整段落，自动剥离段首患者姓名身份前缀'
    }
  },
  past_history: {
    _label: '过去史',
    general_health: {
      label: '一般健康状况',
      type: 'string',
      is_required: false,
      description: '提取如「良好」、「一般」等词汇'
    },
    chronic_diseases: {
      label: '内科疾病史',
      type: 'array',
      is_required: false,
      description: '完整保留已明确提供的阳性病史和重要否认项，不得改变否定极性',
      items: { type: 'string' }
    },
    surgical_and_trauma: {
      label: '手术外伤史',
      type: 'string',
      is_required: false,
      description: '提取具体手术描述，均为否认时填「否认」'
    },
    blood_transfusion: {
      label: '输血史',
      type: 'string',
      is_required: false,
      description: '提取有无输血'
    },
    allergy_history: {
      label: '过敏史',
      type: 'string',
      is_required: false,
      description: '提取食物和药物过敏情况'
    },
    vaccination_history: {
      label: '预防接种史',
      type: 'string',
      is_required: false,
      description: '提取接种描述'
    },
    other_history: {
      label: '其他病史',
      type: 'array',
      is_required: false,
      description: '保留与当前记录相关的阳性发现及重要否认项',
      items: { type: 'string' }
    }
  },
  personal_and_family_history: {
    _label: '个人史、婚育史与家族史',
    birth_and_residence: {
      label: '出生及原籍',
      type: 'string',
      is_required: false,
      description: '提取出生地、生长史'
    },
    habits: {
      _label: '个体习惯',
      smoking: {
        label: '吸烟史',
        type: 'string',
        is_required: false,
        description: ''
      },
      drinking: {
        label: '饮酒史',
        type: 'string',
        is_required: false,
        description: ''
      }
    },
    occupational_exposure: {
      label: '职业暴露',
      type: 'string',
      is_required: false,
      description: '合并工作性质与毒物接触项'
    },
    marriage_and_childbearing: {
      _label: '婚育月经',
      status: {
        label: '婚姻状况',
        type: 'string',
        is_required: false,
        description: '如已婚'
      },
      childbearing_history: {
        label: '生育史',
        type: 'string',
        is_required: false,
        description: '如 1-0-2-1'
      },
      menstrual_history: {
        label: '月经史',
        type: 'string',
        is_required: false,
        description: '初潮/周期/绝经等概括'
      }
    },
    family_history: {
      _label: '家族史',
      similar_diseases: {
        label: '类似病史',
        type: 'string',
        is_required: false,
        description: '家庭成员类似病史'
      },
      genetic_diseases: {
        label: '遗传性疾病',
        type: 'string',
        is_required: false,
        description: '两系三代遗传性疾病'
      }
    }
  },
  physical_examination: {
    _label: '体格检查',
    vital_signs: {
      _label: '生命体征',
      temperature: { label: '体温', type: 'string', is_required: false, description: '℃' },
      pulse: { label: '脉搏', type: 'string', is_required: false, description: '次/分' },
      respiration: { label: '呼吸', type: 'string', is_required: false, description: '次/分' },
      blood_pressure: { label: '血压', type: 'string', is_required: false, description: 'mmHg' },
      bmi: { label: 'BMI', type: 'string', is_required: false, description: '' }
    },
    general_status: {
      label: '一般情况',
      type: 'string',
      is_required: false,
      description: '神志、体位、发育、营养、面容等概括性短句'
    },
    lymph_nodes: {
      label: '浅表淋巴结',
      type: 'string',
      is_required: false,
      description: '概括提取'
    },
    head_and_neck: {
      label: '头颈部',
      type: 'string',
      is_required: false,
      description: '合并头、眼、耳、鼻、口、颈部检查结论'
    },
    chest_and_lungs: {
      label: '胸部和肺',
      type: 'string',
      is_required: false,
      description: '合并胸廓视诊与肺部触叩听结论'
    },
    cardiovascular: {
      _label: '心脏及血管',
      heart_rate: { label: '心率', type: 'string', is_required: false, description: '' },
      rhythm: { label: '心律', type: 'string', is_required: false, description: '' },
      murmur: { label: '杂音', type: 'string', is_required: false, description: '' },
      heart_border: { label: '叩诊心界', type: 'string', is_required: false, description: '精确提取心界距离数值' },
      peripheral_vessels: { label: '周围血管', type: 'string', is_required: false, description: '' }
    },
    abdomen: {
      _label: '腹部',
      inspection_palpation: {
        label: '视诊与触诊',
        type: 'string',
        is_required: false,
        description: '腹肌柔软度、压痛、包块、肝脾触诊等'
      },
      percussion_auscultation: {
        label: '叩诊与听诊',
        type: 'string',
        is_required: false,
        description: '移动性浊音、肠鸣音等'
      }
    },
    spine_and_limbs: {
      label: '脊柱四肢',
      type: 'string',
      is_required: false,
      description: '概括形态、关节活动及病理反射'
    },
    neurological: {
      label: '神经系统',
      type: 'string',
      is_required: false,
      description: '概括生理反射与病理征'
    }
  },
  specialized_and_auxiliary_exams: {
    _label: '专科检查与辅助检查',
    special_exam_of_area: {
      label: '专科检查',
      type: 'string',
      is_required: false,
      description: '提取专科检查下的完整描述段落'
    },
    diagnostic_tests: {
      _label: '辅助检查',
      laboratory: { label: '实验室检查', type: 'string', is_required: false, description: '空白或斜杠时填空字符串' },
      imaging: { label: '影像学检查', type: 'string', is_required: false, description: '' },
      other: { label: '其他检查', type: 'string', is_required: false, description: '如有手写录入文字则全量提取' }
    }
  },
  diagnoses: {
    _label: '诊断结论',
    impression: {
      label: '初步诊断',
      type: 'array',
      is_required: true,
      description: '按疾病名词切分，保留问号',
      items: { type: 'string' }
    },
    revised_diagnosis: {
      label: '修正诊断',
      type: 'array',
      is_required: false,
      description: '空白则空数组',
      items: { type: 'string' }
    },
    consultation_needs: {
      label: '会诊需求',
      type: 'array',
      is_required: false,
      description: '仅提取「需要」的会诊项',
      items: { type: 'string' }
    }
  }
};

function createAdmissionNoteOfficialTemplate(nowIso) {
  return createOfficialTemplate({
    id: 'tpl_official_admission_note',
    template_type: '大病历',
    name: '大病历',
    template_version: 3,
    fields: ADMISSION_NOTE_FIELDS,
    sample: ADMISSION_NOTE_SAMPLE
  }, nowIso);
}

module.exports = {
  ADMISSION_NOTE_FIELDS,
  ADMISSION_NOTE_SAMPLE,
  createAdmissionNoteOfficialTemplate
};
