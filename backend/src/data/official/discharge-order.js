const { createOfficialTemplate } = require('./factory');

const DISCHARGE_SAMPLE = `入院诊断 Impression: 糖尿病2型? 1型? 特殊类型?
出院诊断 Discharge Diagnosis: 2型糖尿病 糖尿病大血管病变 双眼糖尿病性视网膜病变 癌胚抗原升高 右肺多发小结节 腰椎骨量减少 肝内脂质沉积
入院原因 Reason of Admission: 患者，女，68岁，因"口干多饮多尿6年余，加重1周"入院。
入院情况 Status on Admission: 查体：呼吸:18次/分钟,脉搏:73次/分钟,血压:112/78mmHg。身高:143cm,体重:40.8Kg,体重指数:20.0。神清，精神可，全身浅表淋巴结未触及肿大，胸廓无畸形，双肺呼吸音清，未闻及干湿啰音，心界无扩大，心律齐，心前各瓣膜区未闻及病理性杂音。腹软，无压痛反跳痛，肝脾肋下未及。双下肢无浮肿，双侧足背动脉搏动正常可及。
住院诊治经过(包括重要发现和结论，接受的手术和操作，药物和其他治疗):
入院后完善相关检查，实验室检查：尿常规(2025-03-20):葡萄糖:2+;血生化(2025-03-20):钾:3.70mmol/L;肌酐:49μmol/L...
影像学检查：心电图(2025-03-19):窦性心律（83次/分）;高侧壁、前侧壁ST-T改变...
馒头餐试验：0------0.5------2h 葡萄糖（mmol/L） 11.39--14.53--27.54 C肽（pmol/L） 589.0--610.0--1298.0
营养科会诊：建议：1、维持糖尿病普食；2、营养宣教：已详细指导患者及家属饮食...
眼科会诊：诊断：双眼糖尿病性视网膜病变。建议：双眼晶体混浊...积极控制血糖...
诊治经过：患者，女，68岁，因"口干多饮多尿6年余，加重1周"入院。患者老年女性，慢性病程...根据病史特点、相关辅助检查及血糖监测情况，出院前调整降糖方案为：[来得时]甘精胰岛素针 次14iu 皮下注射 每晚一次...现患者血糖控制可，无明显不适主诉，予今日带药出院。
出院时情况 Status on Discharge: 生命体征平稳、血糖控制可。
出院状态 Patient's Condition on Discharge: 改善
出院去向 Disposition: 回家
出院带药 Discharge Medications:
[来得时]甘精胰岛素针 300iu:3mlX1 带药量0支 每次14iu 皮下注射 每晚一次 [集采]瑞格列奈片 0.5mgX60 带药量60片 每次1mg 口服 每日三次 [合资]阿卡波糖片 100mgX30 带药量30片 每次100mg 口服 每日三次 [集采]阿托伐他汀片 20mgX14 带药量14片 每次20mg 口服 每晚一次 [集采]甲钴胺片 0.5mgX100 带药量100片 每次0.5mg 口服 每日三次 [集采]羟苯磺酸钙胶囊 0.5gX48 带药量48粒 每次0.5g 口服 每日三次
出院指导 Follow-up Instructions:
生活自理： ○调整自我照料方法 ●完全能自理 ○部分自理 ○不能自理
活 动： ●在能耐受范围适当活动 ○限制活动（正常活动的恢复须根据医生建议）
药 物： ○无特殊指导 ●食物/药物间相互作用指导 ●具体用药指导见说明书
饮食指导： ○无禁忌 ○特殊饮食 ○流质饮食 ○管饲 ○其它
特殊饮食指导： ○无 ○低盐饮食 ○低脂饮食 ●糖尿病饮食 ○低蛋白饮食 ○低嘌呤饮食 ○忌碘饮食
植入物相关指导： 无
其它指导：
1.出院后糖尿病饮食，积极锻炼，规律服药，监测血糖，空腹血糖控制于5-7mmol/L...
2.使用他汀类药物，出院后需动态监测肝功能、CK、血脂...
3. 胸部CT提示右肺多发小结节，年度复查胸部CT，胸外科门诊随访。
随访（复诊安排） Follow-up Schedule
时间 地点 复诊目的 科室
2周 本院 检查康复情况 内分泌科
周一上午 名医门诊 钱塘住院部5楼东区 周二上午 名医门诊 6号楼12楼 周三全天 专家门诊 6号楼2楼B区
以下情况需要紧急就医 If you have the following symptom, please go to the Emergency Room.
如出现单侧下肢肿胀、疼痛或胸闷气急、胸痛、咯血等症状或加重、请立即就诊。`;

const DISCHARGE_FIELDS = {
  diagnoses: {
    _label: '诊断信息',
    admission_impression: {
      label: '入院诊断',
      type: 'array',
      is_required: true,
      description: '提取入院时的初步诊断，必须保留问号(?)等不确定表述',
      items: { type: 'string' }
    },
    discharge_diagnosis: {
      label: '出院诊断',
      type: 'array',
      is_required: true,
      description: '按疾病拆分为字符串数组，绝不能揉成一段长文本',
      items: { type: 'string' }
    }
  },
  admission_status: {
    _label: '入院情况',
    reason_of_admission: {
      label: '入院原因',
      type: 'string',
      is_required: true,
      description: '仅提取主诉（症状和时间），自动剥离患者身份前缀'
    },
    status_on_admission: {
      label: '入院查体',
      type: 'string',
      is_required: true,
      description: '提取包含生命体征及核心查体体征的完整段落'
    }
  },
  hospital_course: {
    _label: '住院诊治经过',
    lab_tests: {
      label: '实验室检查',
      type: 'array',
      is_required: false,
      description: '按检查时间、项目大类及具体指标切分，严禁省略或截断任何化验指标',
      items: {
        date: { label: '检查日期', type: 'string', is_required: true, description: '如 2025-03-20' },
        test_category: { label: '检验大类', type: 'string', is_required: true, description: '如血生化、尿常规' },
        results: { label: '检验结果', type: 'string', is_required: true, description: '具体指标及数值' }
      }
    },
    imaging_and_special_exams: {
      label: '影像/特殊检查',
      type: 'array',
      is_required: false,
      description: '提取心电图、CT、彩超及特殊操作，拆分为时间、名称及结论',
      items: {
        date: { label: '检查日期', type: 'string', is_required: true, description: '' },
        exam_name: { label: '检查名称', type: 'string', is_required: true, description: '' },
        findings: { label: '检查结论', type: 'string', is_required: true, description: '' }
      }
    },
    consultations: {
      label: '专科会诊',
      type: 'array',
      is_required: false,
      description: '按会诊科室切分，提取科室名称、会诊诊断及处理建议',
      items: {
        department: { label: '会诊科室', type: 'string', is_required: true, description: '' },
        diagnosis: { label: '会诊诊断', type: 'string', is_required: false, description: '' },
        suggestions: { label: '处理建议', type: 'string', is_required: true, description: '' }
      }
    },
    treatment_summary: {
      label: '诊治经过总结',
      type: 'string',
      is_required: true,
      description: '提取病情演变、用药调整逻辑等纯叙述文本，剔除夹杂其中的化验单流水'
    }
  },
  discharge_status: {
    _label: '出院情况',
    status_on_discharge: {
      label: '出院时情况',
      type: 'string',
      is_required: true,
      description: '简短描述出院时的体征与病情状态'
    },
    condition_on_discharge: {
      label: '出院状态',
      type: 'string',
      is_required: true,
      description: '提取标准转归词汇（如：改善、治愈等）'
    },
    disposition: {
      label: '出院去向',
      type: 'string',
      is_required: true,
      description: '提取去向（如：回家、转院等）'
    }
  },
  discharge_medications: {
    label: '出院带药',
    type: 'array',
    is_required: false,
    description: '将连体药品文本精准打碎成结构化字段',
    items: {
      medication_name: { label: '药品名称', type: 'string', is_required: true, description: '' },
      specification: { label: '规格', type: 'string', is_required: false, description: '' },
      total_quantity: { label: '带药量', type: 'string', is_required: false, description: '' },
      dosage: { label: '每次用量', type: 'string', is_required: false, description: '' },
      route: { label: '给药途径', type: 'string', is_required: false, description: '' },
      frequency: { label: '用药频次', type: 'string', is_required: false, description: '' }
    }
  },
  follow_up_instructions: {
    _label: '出院指导',
    self_care: {
      label: '生活自理',
      type: 'string',
      is_required: false,
      description: '仅提取前缀为实心圆点（●）的勾选项'
    },
    activity: {
      label: '活动',
      type: 'string',
      is_required: false,
      description: '仅提取选中的项'
    },
    medication_guidance: {
      label: '药物指导',
      type: 'array',
      is_required: false,
      description: '仅提取实心●选项组成数组',
      items: { type: 'string' }
    },
    diet_guidance: {
      label: '饮食指导',
      type: 'array',
      is_required: false,
      description: '整合饮食指导与特殊饮食指导，仅提取实心●选项',
      items: { type: 'string' }
    },
    implant_guidance: {
      label: '植入物相关指导',
      type: 'string',
      is_required: false,
      description: '提取对应文本（如「无」）'
    },
    other_instructions: {
      label: '其它指导',
      type: 'array',
      is_required: false,
      description: '按1,2,3...序号将长列表拆分为字符串数组',
      items: { type: 'string' }
    }
  },
  follow_up_schedule: {
    _label: '随访与复诊安排',
    schedule_table: {
      label: '随访表格',
      type: 'array',
      is_required: false,
      description: '将类表格文本转换为对象数组，提取时间、地点、目的及科室',
      items: {
        time: { label: '时间', type: 'string', is_required: true, description: '如：2周' },
        location: { label: '地点', type: 'string', is_required: true, description: '' },
        purpose: { label: '复诊目的', type: 'string', is_required: true, description: '' },
        department: { label: '科室', type: 'string', is_required: true, description: '' }
      }
    },
    outpatient_schedule: {
      label: '门诊排班信息',
      type: 'string',
      is_required: false,
      description: '提取门诊具体排班指引'
    },
    emergency_symptoms: {
      label: '紧急就医指征',
      type: 'string',
      is_required: false,
      description: '提取「以下情况需要紧急就医」下方的症状描述'
    }
  }
};

function createDischargeOrderOfficialTemplate(nowIso) {
  return createOfficialTemplate({
    id: 'tpl_official_discharge_order',
    template_type: '出院记录',
    name: '出院记录',
    fields: DISCHARGE_FIELDS,
    sample: DISCHARGE_SAMPLE
  }, nowIso);
}

module.exports = {
  DISCHARGE_FIELDS,
  DISCHARGE_SAMPLE,
  createDischargeOrderOfficialTemplate
};
