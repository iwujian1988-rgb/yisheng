const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');

function getTemplateAccess() {
  return wx.getStorageSync('templateAccess') || 'general';
}

const LOCAL_GENERAL_TEMPLATES = [
  {
    id: 'local_office_meeting_summary',
    templateCode: 'office_meeting_summary',
    name: '会议纪要',
    description: '把会议要点整理成可发送的纪要。',
    category: 'office',
    audience: 'general',
    scene: 'summary',
    type: 'template_ai',
    variableDefs: [
      { key: 'topic', label: '会议主题', type: 'input', required: true, placeholder: '填写会议主题' },
      { key: 'points', label: '讨论要点', type: 'textarea', required: true, placeholder: '填写已经确认的讨论内容' },
      { key: 'actions', label: '后续事项', type: 'textarea', required: false, placeholder: '填写负责人、事项或截止时间' }
    ]
  },
  {
    id: 'local_office_work_report',
    templateCode: 'office_work_report',
    name: '工作汇报',
    description: '把进展、问题和计划整理成汇报文本。',
    category: 'report',
    audience: 'general',
    scene: 'report',
    type: 'template_ai',
    variableDefs: [
      { key: 'progress', label: '本期进展', type: 'textarea', required: true, placeholder: '填写已经完成或推进中的事项' },
      { key: 'issues', label: '遇到问题', type: 'textarea', required: false, placeholder: '填写需要协同解决的问题' },
      { key: 'nextPlan', label: '下一步计划', type: 'textarea', required: true, placeholder: '填写接下来要做的事项' }
    ]
  },
  {
    id: 'local_office_email_polish',
    templateCode: 'office_email_polish',
    name: '邮件润色',
    description: '把草稿整理成清晰、礼貌的邮件。',
    category: 'email',
    audience: 'general',
    scene: 'polish',
    type: 'template_ai',
    variableDefs: [
      { key: 'recipient', label: '收件对象', type: 'input', required: false, placeholder: '填写收件对象或角色' },
      { key: 'draft', label: '邮件草稿', type: 'textarea', required: true, placeholder: '填写需要润色的内容' },
      { key: 'tone', label: '语气要求', type: 'input', required: false, placeholder: '例如正式、简洁、友好' }
    ]
  },
  {
    id: 'local_office_notice',
    templateCode: 'office_notice',
    name: '通知公告',
    description: '根据事项生成简洁通知。',
    category: 'notice',
    audience: 'general',
    scene: 'notice',
    type: 'template_ai',
    variableDefs: [
      { key: 'target', label: '通知对象', type: 'input', required: true, placeholder: '填写通知对象' },
      { key: 'matter', label: '通知事项', type: 'textarea', required: true, placeholder: '填写要通知的具体事项' },
      { key: 'deadline', label: '时间要求', type: 'input', required: false, placeholder: '填写时间或截止要求' }
    ]
  }
];

function cloneTemplate(template) {
  return JSON.parse(JSON.stringify(template));
}

function listLocalTemplates() {
  const access = getTemplateAccess();
  return Promise.resolve(LOCAL_GENERAL_TEMPLATES
    .filter((template) => template.audience !== 'professional' || access === 'professional')
    .map(cloneTemplate));
}

function listTemplates() {
  if (!getBaseUrl()) {
    return listLocalTemplates();
  }
  return request({
    url: ENDPOINTS.ai.templates,
    method: 'GET'
  }).then((items) => {
    return Array.isArray(items) ? items : [];
  });
}

function generateTemplate(template, fields) {
  const currentTemplate = template || {};
  if (!getBaseUrl() || String(currentTemplate.id || '').indexOf('local_') === 0) {
    return Promise.reject({
      code: 'TEMPLATE_BACKEND_REQUIRED',
      message: '模板生成服务尚未接入'
    });
  }

  const values = {};
  (fields || []).forEach((field) => {
    values[field.key] = field.value || '';
  });

  return request({
    url: fillPath(ENDPOINTS.ai.templateGenerate, { id: currentTemplate.id || currentTemplate.templateCode }),
    method: 'POST',
    data: { values }
  });
}

module.exports = {
  generateTemplate,
  getTemplateAccess,
  listTemplates,
  listLocalTemplates
};
