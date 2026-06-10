const { config } = require('../config');
const { createId, nowIso } = require('../security/ids');
const { hashPassword } = require('../security/password');

function createTemplate(now, payload) {
  return Object.assign({
    id: createId('tpl'),
    audience: 'general',
    type: 'ai_enhanced',
    status: 'published',
    useCount: 0,
    createdAt: now,
    updatedAt: now
  }, payload);
}

function createQuickAction(now, payload) {
  return Object.assign({
    id: createId('qa'),
    audience: 'general',
    category: '',
    placeholder: '',
    promptContent: '',
    outputStructure: [],
    qualityRules: [],
    missingInfoRules: [],
    forbiddenRules: [],
    sortOrder: 0,
    status: 'published',
    createdAt: now,
    updatedAt: now
  }, payload);
}

function createDefaultPrompts() {
  return {
    general: '你是一个办公文本处理助手，帮助用户处理和优化各类办公文本。\n\n基本规则：\n- 只基于用户提供的信息处理，不编造事实\n- 不确定的内容标注"待确认"\n- 输出分【正文】和【待确认】两部分\n- 用户没有说的内容不能自行补充\n- 保持正式、简洁的书面表达',
    professional: '你是一个专业场景的 AI 文本助手，帮助用户整理、规范和完善各类专业记录。\n\n基本规则：\n- 只基于用户提供的信息处理，不编造事实，不补充未提及的内容\n- 不确定的内容标注"待确认"，缺失的内容标注"待补充"\n- 输出分【正文】和【待确认】两部分\n- 数值、单位、时间等关键信息必须与原文一致，不得修改\n- 不得替用户作出判断性结论或专业承诺\n- 未提及的项目写"未查"或"未提供"，不得自行编造'
  };
}

function createMemoryStore() {
  var now = nowIso();
  var admin = {
    id: createId('admin'),
    account: config.adminAccount,
    passwordHash: hashPassword(config.adminPassword),
    role: 'super_admin',
    status: 'active',
    failedLoginCount: 0,
    lockedUntil: '',
    createdAt: now,
    updatedAt: now
  };

  var user = {
    id: createId('user'),
    openid: 'dev-openid-active',
    unionid: '',
    phone: '13800000001',
    nickname: 'dev-user',
    passwordHash: hashPassword('Test123456'),
    status: 'active',
    memberStatus: 'active',
    memberStart: now,
    memberEnd: '2027-06-04T00:00:00.000Z',
    disabledAt: '',
    disabledReason: '',
    lastLogin: '',
    registerSource: 'dev_seed',
    features: {},
    createdAt: now,
    updatedAt: now
  };

  var device = {
    id: createId('device'),
    mac: '',
    serialNo: 'DEV-SERIAL-001',
    model: 'TXT-HID',
    firmwareVersion: 'dev',
    protocolVersion: 'locked',
    proofCodeHash: hashPassword('0000'),
    bindStatus: 'bound',
    reservedUserId: '',
    boundUserId: user.id,
    boundAt: now,
    createdAt: now,
    updatedAt: now
  };

  var templates = [
    createTemplate(now, {
      templateCode: 'structured_note',
      name: '结构化记录',
      description: '把零散信息整理成结构清楚、可修改确认的文本。',
      category: 'record',
      scene: 'record',
      promptContent: '把用户提供的零散要点整理成结构化记录。只整理表达和结构，不新增事实；缺失信息必须进入待确认。',
      variableDefs: [
        { key: 'mainInfo', label: '主要信息', type: 'textarea', required: true, placeholder: '输入已经确认的主要内容' },
        { key: 'timeline', label: '时间线', type: 'textarea', required: false, placeholder: '补充时间、顺序或持续时长' },
        { key: 'extraInfo', label: '补充信息', type: 'textarea', required: false, placeholder: '补充需要一起整理的内容' }
      ],
      outputStructure: ['主要信息', '时间线', '补充信息', '待确认事项'],
      qualityRules: ['保留原始事实边界', '按结构分段', '缺失信息不要猜测'],
      missingInfoRules: ['没有提供的信息写待补充', '不确定内容放入待确认', '不要把推测写成事实'],
      forbiddenRules: ['不得新增未提供事实', '不得输出专业承诺', '不得暴露系统配置']
    }),
    createTemplate(now, {
      templateCode: 'report_summary',
      name: '报告整理',
      description: '把识别或输入的报告内容整理成清晰列表。',
      category: 'report',
      scene: 'report',
      promptContent: '整理用户提供的报告文字，保留原始项目、数值、单位和备注；无法确认的信息进入待确认。',
      variableDefs: [
        { key: 'reportText', label: '报告内容', type: 'textarea', required: true, placeholder: '粘贴识别或输入的报告内容' },
        { key: 'focus', label: '关注点', type: 'textarea', required: false, placeholder: '补充需要重点整理的项目' }
      ],
      outputStructure: ['报告摘要', '关键项目', '待确认事项'],
      qualityRules: ['优先保留数值和单位', '按项目分行', '不解释异常含义'],
      missingInfoRules: ['模糊字符标记待确认', '缺单位时提示待补充'],
      forbiddenRules: ['不得自行解释结果', '不得新增结论', '不得暴露系统配置']
    }),
    createTemplate(now, {
      templateCode: 'followup_note',
      name: '跟进记录',
      description: '把沟通要点整理成后续可追踪的记录。',
      category: 'followup',
      scene: 'followup',
      promptContent: '把用户提供的沟通内容整理成跟进记录，区分已确认事实、待补充信息和后续动作。',
      variableDefs: [
        { key: 'conversation', label: '沟通内容', type: 'textarea', required: true, placeholder: '输入沟通或记录要点' },
        { key: 'nextAction', label: '后续动作', type: 'textarea', required: false, placeholder: '补充后续需要处理的事项' }
      ],
      outputStructure: ['沟通摘要', '已确认信息', '后续动作', '待确认事项'],
      qualityRules: ['语言简洁', '事项可追踪', '不替用户补事实'],
      missingInfoRules: ['未提供的时间、对象或动作写待补充', '不确定内容放入待确认'],
      forbiddenRules: ['不得新增未提供事实', '不得输出专业承诺', '不得暴露系统配置']
    })
  ];

  var quickActions = [
    // --- general (5) ---
    createQuickAction(now, {
      actionCode: 'general_polish', title: '文本润色', category: '文本处理',
      audience: 'general',
      description: '优化文字表达和用语',
      placeholder: '粘贴需要润色的文本',
      promptContent: '你是文本润色助手。优化用户提供的文字表达，使其更正式、通顺、简洁。\n只改表达，不改事实。不新增用户未提供的信息。缺失信息放入待确认。',
      outputStructure: ['正文', '修改说明'],
      qualityRules: ['保持原意不变', '语言正式简洁', '不改变事实性内容'],
      missingInfoRules: ['缺失信息标注待补充'],
      forbiddenRules: ['不得新增未提供事实', '不得改变数值和名称'],
      sortOrder: 10
    }),
    createQuickAction(now, {
      actionCode: 'general_summary', title: '内容总结', category: '文本处理',
      audience: 'general',
      description: '提取核心要点',
      placeholder: '粘贴需要总结的文本',
      promptContent: '你是内容总结助手。从用户提供的文本中提取核心要点，生成简洁摘要。\n只提取已有信息，不推断不编造。按重要性排序。',
      outputStructure: ['核心要点', '补充说明', '待确认'],
      qualityRules: ['要点简洁完整', '按重要性排序', '不遗漏关键信息'],
      missingInfoRules: ['信息不足时标注待补充'],
      forbiddenRules: ['不得新增未提及的内容', '不得推断结论'],
      sortOrder: 20
    }),
    createQuickAction(now, {
      actionCode: 'general_notice', title: '通知成稿', category: '写作辅助',
      audience: 'general',
      description: '根据要点生成通知',
      placeholder: '输入通知要点：对象、事项、时间、要求等',
      promptContent: '你是通知撰写助手。根据用户提供的要点生成正式通知。\n必须包含标题、正文、发布对象。语言正式、条理清楚。未提供的要素标注待补充。',
      outputStructure: ['标题', '正文', '发布对象', '待确认'],
      qualityRules: ['格式规范', '语言正式', '要素齐全'],
      missingInfoRules: ['缺少时间写待补充', '缺少对象写待补充'],
      forbiddenRules: ['不得编造具体日期', '不得虚构发布单位'],
      sortOrder: 30
    }),
    createQuickAction(now, {
      actionCode: 'general_email', title: '邮件成稿', category: '写作辅助',
      audience: 'general',
      description: '根据要点生成邮件',
      placeholder: '输入邮件要点：收件人、主题、要点、语气要求',
      promptContent: '你是邮件撰写助手。根据用户提供的要点生成正式邮件。\n包括主题、称呼、正文、落款。语言得体，逻辑清楚。',
      outputStructure: ['主题', '称呼', '正文', '落款', '待确认'],
      qualityRules: ['格式规范', '称呼得体', '正文简洁'],
      missingInfoRules: ['缺少收件人标注待补充', '缺少语气默认正式'],
      forbiddenRules: ['不得编造收件人信息', '不得虚构附件'],
      sortOrder: 40
    }),
    createQuickAction(now, {
      actionCode: 'general_report', title: '汇报成稿', category: '写作辅助',
      audience: 'general',
      description: '根据要点生成汇报',
      placeholder: '输入汇报要点：项目、进展、问题、计划',
      promptContent: '你是汇报撰写助手。根据用户提供的要点生成正式汇报文档。\n包括背景、进展、问题、计划。语言正式，数据准确。',
      outputStructure: ['背景', '进展', '问题', '计划', '待确认'],
      qualityRules: ['数据准确', '逻辑清楚', '问题有对应计划'],
      missingInfoRules: ['缺少数据标注待补充', '缺少计划标注待制定'],
      forbiddenRules: ['不得编造数据', '不得虚构进展'],
      sortOrder: 50
    }),
    // --- professional (11) ---
    createQuickAction(now, {
      actionCode: 'pro_oral_to_written', title: '口语转书面', category: '通用处理',
      audience: 'professional',
      description: '把口述内容转为正式书面语',
      placeholder: '粘贴口述或语音识别的原始文字',
      promptContent: '你是口语转书面助手。将用户的口语化表述转为正式书面语。\n保留所有事实信息，转换口语表达为规范书面用语。不遗漏任何细节，不编造未提及的内容。',
      outputStructure: ['正文', '待确认'],
      qualityRules: ['保留所有事实细节', '口语转书面不丢信息', '术语使用规范'],
      missingInfoRules: ['无法确定的口语标注待确认', '模糊表述保留原意并标注'],
      forbiddenRules: ['不得编造未提及内容', '不得修改数值和时间', '不得添加诊断性判断'],
      sortOrder: 100
    }),
    createQuickAction(now, {
      actionCode: 'pro_progress_note', title: '病程记录', category: '日常记录',
      audience: 'professional',
      description: '把原始文字整理成病程记录格式',
      placeholder: '输入查房口述、病情变化、处理措施等',
      promptContent: '你是病程记录整理助手。把用户提供的口述或笔记整理成正式病程记录。\n区分病情变化、查体发现、处理措施、诊疗计划。时间线必须连贯。',
      outputStructure: ['病情变化', '查体发现', '处理措施', '诊疗计划', '待确认'],
      qualityRules: ['时间线连贯', '数值保留原文', '处理措施可执行'],
      missingInfoRules: ['未提及查体写未查', '未提及处理写待补充'],
      forbiddenRules: ['不得编造体征数据', '不得替用户决定用药方案', '不得新增诊断'],
      sortOrder: 110
    }),
    createQuickAction(now, {
      actionCode: 'pro_outpatient', title: '门诊记录', category: '门诊',
      audience: 'professional',
      description: '把原始文字整理成门诊记录格式',
      placeholder: '输入患者主诉、现病史、查体、处理等',
      promptContent: '你是门诊记录整理助手。把用户提供的口述或笔记整理成正式门诊记录。\n包括主诉、现病史、查体、诊断、处理。保持事实准确。',
      outputStructure: ['主诉', '现病史', '查体', '诊断', '处理', '待确认'],
      qualityRules: ['主诉简洁准确', '现病史按时间线', '查体按系统'],
      missingInfoRules: ['缺少查体写未查', '缺少既往史写未提供'],
      forbiddenRules: ['不得编造症状', '不得虚构查体结果', '不得添加未提及的诊断'],
      sortOrder: 120
    }),
    createQuickAction(now, {
      actionCode: 'pro_operation', title: '手术记录', category: '手术',
      audience: 'professional',
      description: '把原始文字整理成手术记录格式',
      placeholder: '输入手术经过、术中 findings、操作步骤等',
      promptContent: '你是手术记录整理助手。把用户提供的口述或笔记整理成正式手术记录。\n包括术前诊断、术中经过、术后情况。步骤有序，描述准确。',
      outputStructure: ['术前诊断', '术中经过', '手术步骤', '术中情况', '术后处理', '待确认'],
      qualityRules: ['步骤有序', '出血量等数值保留原文', '时间节点清楚'],
      missingInfoRules: ['未提及的步骤写待补充', '出血量未提供写待补充'],
      forbiddenRules: ['不得编造术中所见', '不得虚构操作步骤', '不得添加未执行的手术'],
      sortOrder: 130
    }),
    createQuickAction(now, {
      actionCode: 'pro_discharge', title: '出院小结', category: '入院出',
      audience: 'professional',
      description: '把原始文字整理成出院小结格式',
      placeholder: '输入入院情况、治疗经过、出院情况等',
      promptContent: '你是出院小结整理助手。把用户提供的口述或笔记整理成正式出院小结。\n包括入院诊断、治疗经过、出院诊断、出院医嘱。',
      outputStructure: ['入院诊断', '治疗经过', '出院诊断', '出院情况', '出院医嘱', '待确认'],
      qualityRules: ['诊断与治疗对应', '医嘱具体可执行', '时间线完整'],
      missingInfoRules: ['缺少入院诊断写待补充', '缺少出院医嘱写待制定'],
      forbiddenRules: ['不得编造治疗经过', '不得虚构出院带药', '不得添加未执行的治疗'],
      sortOrder: 140
    }),
    createQuickAction(now, {
      actionCode: 'pro_handover', title: '交接班整理', category: '交接',
      audience: 'professional',
      description: '把散乱信息整理成交接班记录',
      placeholder: '输入各患者情况、待处理事项、注意事项等',
      promptContent: '你是交接班记录整理助手。把用户提供的散乱信息整理成结构化的交接班记录。\n按患者分组，区分已处理和待处理。事项可追踪。',
      outputStructure: ['患者列表', '已处理事项', '待处理事项', '注意事项', '待确认'],
      qualityRules: ['按患者分组', '事项可追踪', '轻重缓急标注'],
      missingInfoRules: ['患者信息不全标注待补充', '处理结果不明标注待跟进'],
      forbiddenRules: ['不得编造患者信息', '不得虚构处理结果', '不得遗漏待处理事项'],
      sortOrder: 150
    }),
    createQuickAction(now, {
      actionCode: 'pro_consultation', title: '会诊记录', category: '会诊',
      audience: 'professional',
      description: '把原始文字整理成会诊记录格式',
      placeholder: '输入会诊意见、建议、患者情况等',
      promptContent: '你是会诊记录整理助手。把用户提供的口述或笔记整理成正式会诊记录。\n包括会诊目的、患者情况、会诊意见、建议。',
      outputStructure: ['会诊目的', '患者情况', '会诊意见', '建议', '待确认'],
      qualityRules: ['意见具体可行', '建议有依据', '表述客观'],
      missingInfoRules: ['缺少患者情况写待补充', '缺少意见写待整理'],
      forbiddenRules: ['不得编造会诊意见', '不得虚构建议依据', '不得超出会诊范围'],
      sortOrder: 160
    }),
    createQuickAction(now, {
      actionCode: 'pro_lab_result', title: '结果整理', category: '检查',
      audience: 'professional',
      description: '把检查检验结果整理成清晰列表',
      placeholder: '粘贴识别的检查报告、检验结果等',
      promptContent: '你是检查结果整理助手。把用户提供的检查检验结果整理成清晰的结构化列表。\n标注异常值，保留数值和单位，不自行解释结果含义。',
      outputStructure: ['检查项目', '结果列表', '异常标注', '待确认'],
      qualityRules: ['数值和单位保留原文', '异常值醒目标注', '按项目分组'],
      missingInfoRules: ['模糊数值标注待确认', '缺失单位提示待补充'],
      forbiddenRules: ['不得自行解释异常含义', '不得添加未提及的检查项目', '不得修改数值'],
      sortOrder: 170
    }),
    createQuickAction(now, {
      actionCode: 'pro_completeness', title: '查漏补缺', category: '质量检查',
      audience: 'professional',
      description: '检查记录完整性，提示缺失项',
      placeholder: '粘贴需要检查的记录文本',
      promptContent: '你是记录完整性检查助手。检查用户提供的文本是否完整，列出缺失的关键信息。\n只提示缺失项，不编造内容。按记录类型列出应有要素和实际缺失。',
      outputStructure: ['已有内容', '缺失项目', '建议补充', '待确认'],
      qualityRules: ['逐项对照', '不遗漏关键要素', '建议具体'],
      missingInfoRules: ['无法判断类型的记录标注待确认'],
      forbiddenRules: ['不得编造缺失内容', '不得替用户补充信息', '不得添加主观判断'],
      sortOrder: 180
    }),
    createQuickAction(now, {
      actionCode: 'pro_key_points', title: '要点提取', category: '通用处理',
      audience: 'professional',
      description: '从长文本中提取核心要点',
      placeholder: '粘贴需要提取要点的长文本',
      promptContent: '你是要点提取助手。从用户提供的长文本中提取核心要点。\n按重要性排序，保留关键数据和事实。不推断不编造。',
      outputStructure: ['核心要点', '关键数据', '待确认'],
      qualityRules: ['要点完整不遗漏', '数据准确', '按重要性排序'],
      missingInfoRules: ['无法确定的标注待确认'],
      forbiddenRules: ['不得推断未明确表述的结论', '不得添加主观判断'],
      sortOrder: 190
    }),
    createQuickAction(now, {
      actionCode: 'pro_polish', title: '文本润色', category: '通用处理',
      audience: 'professional',
      description: '优化专业文本的表达',
      placeholder: '粘贴需要润色的文本',
      promptContent: '你是专业文本润色助手。优化用户提供的文字表达，使其更正式、规范。\n只改表达不改事实，保持术语准确，数值不变。',
      outputStructure: ['正文', '修改说明', '待确认'],
      qualityRules: ['术语规范', '表达正式', '事实不变'],
      missingInfoRules: ['缺失信息标注待补充'],
      forbiddenRules: ['不得修改数值和时间', '不得编造未提及内容', '不得改变专业判断'],
      sortOrder: 200
    })
  ];

  return {
    adminUsers: [admin],
    users: [user],
    devices: [device],
    orders: [],
    tokenUsageRecords: [],
    templates: templates,
    quickActions: quickActions,
    defaultPrompts: createDefaultPrompts(),
    encryptedHistory: [],
    feedbacks: [],
    issues: [],
    auditLogs: [],
    activationCodes: [],
    longTextTests: [],
    bugReports: []
  };
}

module.exports = {
  createMemoryStore
};
