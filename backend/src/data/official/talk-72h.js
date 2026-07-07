const { createOfficialTemplate } = require('./factory');

const TALK_72H_SAMPLE = `简要病情:
1.患者，女，68岁，因"口干多饮多尿6年余，加重1周"入院。2.患者6年余前体检时发现空腹血糖10+mmol/L,伴口干，多饮，饮水量1-2L每天，多尿，夜尿1-2次每天，当地医院予"口服药"（具体不详）治疗，监测血糖空腹6-7mmol/L，一周后停用降糖药。6年来未服药，未监测血糖。1周前患者夜尿次数较前增加，3-4次每天，口干多饮症状同前，双脚大足趾发麻，夜间明显，外院(2025.03.19)查空腹血糖15.66mmol/L,糖化13.3%，总胆固醇6.65mmol/L,低密度脂蛋白4.29mmol/L,尿糖4+。3.既往：无殊。4.查体:血压:176/90mmHg,脉搏:84次/分钟,体温（耳）:36.2℃,呼吸:20次/分钟,身高:143cm,体重:40.8Kg,体重指数:20.0。神清，精神可，全身浅表淋巴结未触及肿大，胸廓无畸形，双肺呼吸音清，未闻及干湿啰音，心界无扩大，心律齐，心前各瓣膜区未闻及病理性杂音。腹软，无压痛反跳痛，肝脾肋下未及。双下肢无浮肿，双侧足背动脉搏动正常可及。双侧肢体温度觉、痛觉、压力觉、位置觉、振动觉未见明显异常。5.辅助检查：入院随机血糖:20.3mmol/L
入院后的检查结果:
尿常规(2025-03-20):葡萄糖:2+;血生化(2025-03-20):糖化血清白蛋白:34.0%;钾:3.70mmol/L;肌酐:49μmol/L;尿素/肌酐:0.11;总胆固醇:5.99mmol/L;高密度脂蛋白胆固醇:1.41mmol/L;低密度脂蛋白胆固醇:3.90mmol/L;脂蛋白(a):15.6mg/dL;尿酸:218.9μmol/L;肌酸激酶:133U/L;超敏C反应蛋白:0.4mg/L;eGFR(CKD-EPI):96.4mL/min;糖化血红蛋白(2025-03-20):HbA1c:13.40%;凝血功能(2025-03-20):凝血酶时间(TT):19.5s;肿瘤标志物(2025-03-20):癌胚抗原CEA:5.45ng/mL;铁蛋白Fer:847.90μg/L;术前免疫(2025-03-20):乙肝病毒表面抗体定量:19.39IU/L;乙型肝炎病毒核心抗体:4.71S/CO;血常规,ABO,RH(2025-03-20):ABO:B型;Rh(D):阳性;白细胞计数:5.6x10^9/L;红细胞计数:4.56x10^12/L;血红蛋白量:147g/L;血小板计数:213x10^9/L;中性粒细胞绝对数:3.47x10^9/L;淋巴细胞绝对数:1.46x10^9/L;大便常规(2025-03-20):隐血试验:弱阳性(+-)。微量尿白蛋白/尿肌酐比值、TGAb,TPOAb,甲状腺功能、ICA,IAA,GAD,IA-2、24小时尿蛋白、微量白蛋白未见明显异常。心电图(2025-03-19):窦性心律（83次/分）;高侧壁、前侧壁ST-T改变;BMD(2025-03-20):腰椎骨量减少;BMD(2025-03-20):详见图文报告;BMD(2025-03-20):感觉阈值：L7.8V/R7.4V;肝|胆|胰|脾彩超(2025-03-20):1.肝内脂质沉积2.胆囊壁毛糙;胸部CT平扫(2025-03-20):右肺多发小结节，必要时复查。左侧斜裂结节样增厚。左侧胸膜结节状突起。两肺少许纤维灶;女泌尿系统(肾|输尿管|膀胱)彩超(2025-03-20):双肾、输尿管、膀胱超声未见明显异常;双侧颈动脉彩超(2025-03-20):双侧颈动脉内膜毛糙增厚伴双侧斑块形成;右下肢动脉彩超|左下肢动脉彩超(2025-03-20):双下肢动脉内膜毛糙;膀胱残余尿量测定(2025-03-20):膀胱内残余尿约95ml;肌电图(2025-03-21):NCV+EMG提示：未见明显异常;
综合以上分析，目前考虑疾病诊断为:
2型糖尿病 糖尿病大血管病变 癌胚抗原升高 右肺多发小结节 腰椎骨量减少 肝内脂质沉积
住院期间可能出现风险和疾病常见并发症如下:
1.患者住院期间可能由于感染、应激、创伤或药物（激素等）等出现明显的血糖波动或血糖难以控制；出现酮症酸中毒或高渗性昏迷不能迅速缓解等；出现低血糖症，可有头晕心慌手抖等表现，或夜间无症状的低血糖，严重时出现昏迷； 2.糖尿病可并发糖尿病周围神经病变、糖尿病视网膜病变，严重时可能会出现感觉异常、四肢麻木，视物模糊、头晕、直立性低血压等不适，导致摔倒，出现意外伤；并发糖尿病肾病，可出现蛋白尿、浮肿、低蛋白血症、高血压，进一步发展出现肾功能衰竭，需要透析等；出现糖尿病大血管病变，进一步发展可能出现急性冠脉综合症、TIA及脑卒中等心脑血管意外；可出现糖尿病足病，可出现下肢动脉闭塞，严重时可能需要截肢手术； 3.糖尿病患者易发生各种感染或院内感染，感染不易控制，严重时出现感染性休克； 4.糖尿病患者多合并多种并发症或合并症，服用多种药物，用药期间出现各种药物不良反应：如肝肾功能损害、胃肠道反应、过敏等； 5.检查发现其他疾病及其它并发症可能，发现良恶性肿瘤可能，需转外科手术治疗等； 6.糖尿病患者多合并多种并发症或合并症，病情变化快，容易出现一些不可预料的意外情况或并发症。
诊疗方案:
1.内科护理常规，二级护理，糖尿病饮食； 2.完善24小时尿蛋白定量、肌电图、馒头餐试验等检查，继续并发症评估； 3.治疗上予以胰岛素皮下泵控制血糖。根据血糖及检查结果调整治疗方案。 4.可衡量的目标和出院计划：住院期间进行糖尿病饮食指导，知晓糖尿病相关知识，出院后糖尿病饮食控制，规律用药，定期监测血糖，注意低血糖，知晓低血糖应对方法，内分泌科门诊定期随访。`;

const TALK_72H_FIELDS = {
  brief_condition: {
    _label: '简要病情',
    history_and_symptoms: {
      label: '病史及症状',
      type: 'string',
      is_required: true,
      description: '提取第1-3点内容，自动剥离患者身份前缀'
    },
    physical_exam: {
      label: '查体情况',
      type: 'string',
      is_required: true,
      description: '仅提取第4点查体段落'
    },
    auxiliary_exams_on_admission: {
      label: '入院辅助检查',
      type: 'string',
      is_required: false,
      description: '提取第5点辅助检查内容'
    }
  },
  test_results_since_admission: {
    _label: '入院后检查结果',
    lab_tests: {
      label: '实验室检查',
      type: 'array',
      is_required: false,
      description: '根据括号内时间和检验大类拆解重组为结构化数组',
      items: {
        date: { label: '检查日期', type: 'string', is_required: true, description: '如 2025-03-20' },
        test_category: { label: '检验大类', type: 'string', is_required: true, description: '如尿常规、血生化' },
        results: { label: '检验结果', type: 'string', is_required: true, description: '具体指标及数值' }
      }
    },
    imaging_and_special_exams: {
      label: '影像/特殊检查',
      type: 'array',
      is_required: false,
      description: '提取心电图、BMD、彩超、CT等，重组为数组对象',
      items: {
        date: { label: '检查日期', type: 'string', is_required: true, description: '' },
        exam_name: { label: '检查名称', type: 'string', is_required: true, description: '' },
        findings: { label: '检查结论', type: 'string', is_required: true, description: '' }
      }
    }
  },
  current_diagnosis: {
    label: '目前诊断',
    type: 'array',
    is_required: true,
    description: '将诊断文本拆分为独立字符串数组',
    items: { type: 'string' }
  },
  potential_risks_and_complications: {
    label: '风险与并发症',
    type: 'array',
    is_required: false,
    description: '按1、2、3...序号切分为多个独立条款',
    items: { type: 'string' }
  },
  treatment_plan: {
    _label: '诊疗方案',
    nursing_and_diet: {
      label: '护理与饮食',
      type: 'string',
      is_required: false,
      description: '提取诊疗方案第1点'
    },
    further_exams: {
      label: '进一步检查',
      type: 'string',
      is_required: false,
      description: '提取第2点'
    },
    treatment_strategy: {
      label: '治疗策略',
      type: 'string',
      is_required: false,
      description: '提取第3点'
    },
    discharge_planning: {
      label: '出院计划',
      type: 'string',
      is_required: false,
      description: '提取第4点可衡量的目标和出院计划'
    }
  }
};

function createTalk72hOfficialTemplate(nowIso) {
  return createOfficialTemplate({
    id: 'tpl_official_talk_72h',
    template_type: '72小时谈话记录',
    name: '72小时谈话记录',
    fields: TALK_72H_FIELDS,
    sample: TALK_72H_SAMPLE
  }, nowIso);
}

module.exports = {
  TALK_72H_FIELDS,
  TALK_72H_SAMPLE,
  createTalk72hOfficialTemplate
};
