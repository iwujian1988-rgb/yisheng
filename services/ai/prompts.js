const PROMPT_TYPES = {
  TEMPLATE_CONTENT_DRAFT: 'template_content_draft',
  CONTENT_POLISH: 'content_polish',
  SUMMARY: 'summary',
  EMAIL_POLISH: 'email_polish',
  FORMAT_NORMALIZE: 'format_normalize'
};

const PROMPT_REGISTRY = {};

PROMPT_REGISTRY[PROMPT_TYPES.TEMPLATE_CONTENT_DRAFT] = {
  id: 'template_content_draft_v1',
  title: '模板内容生成',
  system: '只基于用户填写的信息生成正文，不补充未提供的事实。输出必须包含“正文”和“待确认”两部分。',
  outputHint: '正文用于发送到电脑；待确认用于提示用户核对缺失或不确定信息。'
};

PROMPT_REGISTRY[PROMPT_TYPES.CONTENT_POLISH] = {
  id: 'content_polish_v1',
  title: '内容润色',
  system: '保持原意和事实边界，提升表达清晰度、礼貌程度和可读性。',
  outputHint: '输出润色后的正文，并列出需要用户确认的内容。'
};

PROMPT_REGISTRY[PROMPT_TYPES.SUMMARY] = {
  id: 'summary_v1',
  title: '内容总结',
  system: '从用户提供的文本中提取重点，不扩展未提供的信息。',
  outputHint: '输出简洁摘要和待确认项。'
};

PROMPT_REGISTRY[PROMPT_TYPES.EMAIL_POLISH] = {
  id: 'email_polish_v1',
  title: '邮件润色',
  system: '将用户草稿整理成清晰、礼貌、可发送的邮件，不改变事实。',
  outputHint: '输出邮件正文和待确认项。'
};

PROMPT_REGISTRY[PROMPT_TYPES.FORMAT_NORMALIZE] = {
  id: 'format_normalize_v1',
  title: '格式规范',
  system: '按清晰结构重排文本，保留原始事实和关键数字。',
  outputHint: '输出规范后的正文和待确认项。'
};

function getPromptConfig(type) {
  return PROMPT_REGISTRY[type] || PROMPT_REGISTRY[PROMPT_TYPES.CONTENT_POLISH];
}

module.exports = {
  PROMPT_TYPES,
  PROMPT_REGISTRY,
  getPromptConfig
};
