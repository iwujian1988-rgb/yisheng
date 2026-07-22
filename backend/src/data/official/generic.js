var createOfficialTemplate = require('./factory').createOfficialTemplate;

var MEETING_SAMPLE = [
  '会议：产品周会',
  '时间：2025-03-15 10:00-11:00',
  '参会：产品、研发、设计',
  '',
  '议题：',
  '1. 上一周进度回顾',
  '2. 本周计划与阻塞',
  '3. 下一步行动项',
  '',
  '讨论要点：',
  '- 首页加载性能：首屏时间从 1.8s 降到 1.2s，主要优化点是图片懒加载和分包',
  '- 蓝牙连接稳定性：偶发断连问题定位到协议层超时设置过短，计划下周修复',
  '- 新模板：增加 3 个通用模板用于测试',
  '',
  '行动项：',
  '- 张三：周三前提交性能优化 PR',
  '- 李四：周五前完成蓝牙断连修复',
  '- 王五：下周一前上线新模板'
].join('\n');

var MEETING_FIELDS = {
  basic_info: {
    _label: '基本信息',
    meeting_name: { label: '会议名称', type: 'string', is_required: true, description: '会议主题' },
    meeting_time: { label: '时间', type: 'string', is_required: true, description: '起止时间' },
    attendees: { label: '参会人员', type: 'string', is_required: true, description: '主要参会者' }
  },
  agenda: {
    _label: '议题与讨论',
    topics: { label: '议题列表', type: 'array', is_required: true, items: { type: 'string' } },
    discussion: { label: '讨论要点', type: 'text', is_required: true, description: '关键讨论内容' }
  },
  actions: {
    _label: '行动项',
    action_items: { label: '后续行动', type: 'array', is_required: true, items: { type: 'string' } }
  }
};

var WORK_REPORT_SAMPLE = [
  '工作日报 2025-03-15',
  '',
  '今日完成：',
  '1. 完成首页改版的设计稿评审，确认周五前交付视觉',
  '2. 修复蓝牙断连 bug 3 个，提 PR 待 review',
  '3. 接口联调：登录、绑定、AI 三个主流程',
  '',
  '明日计划：',
  '1. 跟进 PR review',
  '2. 编写蓝牙连接稳定性自测用例',
  '3. 对齐后端模板接口字段',
  '',
  '风险与求助：',
  '- 后端模板接口字段还在调整，可能影响周五联调'
].join('\n');

var WORK_REPORT_FIELDS = {
  today: {
    _label: '今日完成',
    completed: { label: '已完成事项', type: 'array', is_required: true, items: { type: 'string' } }
  },
  tomorrow: {
    _label: '明日计划',
    planned: { label: '计划事项', type: 'array', is_required: true, items: { type: 'string' } }
  },
  risks: {
    _label: '风险与求助',
    risks: { label: '风险/求助', type: 'text', is_required: false, description: '需要协调的问题' }
  }
};

var EMAIL_SAMPLE = [
  '收件人：张经理',
  '主题：关于本周项目进度的同步',
  '',
  '张经理好：',
  '',
  '本周项目进展如下：核心功能开发已完成 80%，预计下周三进入联调阶段。',
  '当前遇到一个性能问题需要架构组协助，已发会议邀请下周一上午对齐。',
  '',
  '如有任何问题，欢迎随时沟通。',
  '',
  '祝好，',
  '小李'
].join('\n');

var EMAIL_FIELDS = {
  header: {
    _label: '基本信息',
    recipient: { label: '收件人', type: 'string', is_required: true },
    subject: { label: '主题', type: 'string', is_required: true }
  },
  body: {
    _label: '正文',
    salutation: { label: '称呼', type: 'string', is_required: false },
    body_text: { label: '正文内容', type: 'text', is_required: true, description: '主要表达的内容' },
    closing: { label: '落款', type: 'string', is_required: false }
  }
};

function createMeetingOfficialTemplate(nowIso) {
  return createOfficialTemplate({
    id: 'tpl_official_meeting',
    template_type: '会议纪要',
    audience: 'general',
    name: '会议纪要',
    fields: MEETING_FIELDS,
    sample: MEETING_SAMPLE
  }, nowIso);
}

function createWorkReportOfficialTemplate(nowIso) {
  return createOfficialTemplate({
    id: 'tpl_official_work_report',
    template_type: '工作日报',
    audience: 'general',
    name: '工作日报',
    fields: WORK_REPORT_FIELDS,
    sample: WORK_REPORT_SAMPLE
  }, nowIso);
}

function createEmailOfficialTemplate(nowIso) {
  return createOfficialTemplate({
    id: 'tpl_official_email',
    template_type: '邮件草稿',
    audience: 'general',
    name: '邮件草稿',
    fields: EMAIL_FIELDS,
    sample: EMAIL_SAMPLE
  }, nowIso);
}

module.exports = {
  MEETING_FIELDS: MEETING_FIELDS,
  MEETING_SAMPLE: MEETING_SAMPLE,
  WORK_REPORT_FIELDS: WORK_REPORT_FIELDS,
  WORK_REPORT_SAMPLE: WORK_REPORT_SAMPLE,
  EMAIL_FIELDS: EMAIL_FIELDS,
  EMAIL_SAMPLE: EMAIL_SAMPLE,
  createMeetingOfficialTemplate: createMeetingOfficialTemplate,
  createWorkReportOfficialTemplate: createWorkReportOfficialTemplate,
  createEmailOfficialTemplate: createEmailOfficialTemplate
};
