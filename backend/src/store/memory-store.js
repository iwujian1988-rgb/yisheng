const { config } = require('../config');
const { createId, nowIso } = require('../security/ids');
const { hashPassword } = require('../security/password');

function createTemplate(now, code, name, description, category, scene, promptContent, variableDefs) {
  return {
    id: createId('tpl'),
    templateCode: code,
    name,
    description,
    category,
    audience: 'general',
    scene,
    type: 'template_ai',
    promptContent,
    variableDefs,
    status: 'published',
    useCount: 0,
    createdAt: now,
    updatedAt: now
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
    templateAccess: 'general',
    bindStatus: 'bound',
    boundUserId: user.id,
    boundAt: now,
    createdAt: now,
    updatedAt: now
  };

  var templates = [
    createTemplate(
      now,
      'office_meeting_summary',
      '会议纪要',
      '把会议要点整理成可发送的纪要。',
      'office',
      'summary',
      '基于用户填写的信息整理会议纪要，保持事实边界，不补充未提供的信息。',
      [
        { key: 'topic', label: '会议主题', type: 'input', required: true, placeholder: '填写会议主题' },
        { key: 'points', label: '讨论要点', type: 'textarea', required: true, placeholder: '填写已经确认的讨论内容' },
        { key: 'actions', label: '后续事项', type: 'textarea', required: false, placeholder: '填写负责人、事项或截止时间' }
      ]
    ),
    createTemplate(
      now,
      'office_work_report',
      '工作汇报',
      '把进展、问题和计划整理成汇报文本。',
      'report',
      'report',
      '基于用户填写的信息整理工作汇报，突出进展、问题和下一步计划。',
      [
        { key: 'progress', label: '本期进展', type: 'textarea', required: true, placeholder: '填写已经完成或推进中的事项' },
        { key: 'issues', label: '遇到问题', type: 'textarea', required: false, placeholder: '填写需要协同解决的问题' },
        { key: 'nextPlan', label: '下一步计划', type: 'textarea', required: true, placeholder: '填写接下来要做的事项' }
      ]
    ),
    createTemplate(
      now,
      'office_email_polish',
      '邮件润色',
      '把草稿整理成清晰、礼貌的邮件。',
      'email',
      'polish',
      '在不改变原意的前提下整理邮件表达，语气清晰、礼貌、可执行。',
      [
        { key: 'recipient', label: '收件对象', type: 'input', required: false, placeholder: '填写收件对象或角色' },
        { key: 'draft', label: '邮件草稿', type: 'textarea', required: true, placeholder: '填写需要润色的内容' },
        { key: 'tone', label: '语气要求', type: 'input', required: false, placeholder: '例如正式、简洁、友好' }
      ]
    ),
    createTemplate(
      now,
      'office_notice',
      '通知公告',
      '根据事项生成简洁通知。',
      'office',
      'notice',
      '基于用户填写的信息生成通知公告，明确时间、对象、事项和动作。',
      [
        { key: 'target', label: '通知对象', type: 'input', required: true, placeholder: '填写通知对象' },
        { key: 'matter', label: '通知事项', type: 'textarea', required: true, placeholder: '填写要通知的具体事项' },
        { key: 'deadline', label: '时间要求', type: 'input', required: false, placeholder: '填写时间或截止要求' }
      ]
    )
  ];

  return {
    adminUsers: [admin],
    users: [user],
    devices: [device],
    orders: [],
    tokenUsageRecords: [],
    templates: templates,
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
