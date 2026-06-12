var request = require('../api/client').request;
var ENDPOINTS = require('../api/endpoints').ENDPOINTS;

var FALLBACK_MODES = [
  {
    key: 'organize',
    label: '整理文字',
    description: '把零散内容整理成结构清晰的文本',
    placeholder: '输入需要整理的内容，也可以用语音或图片识别',
    showTemplateSelector: false
  },
  {
    key: 'polish',
    label: '润色优化',
    description: '让文字更清楚、更适合发送',
    placeholder: '粘贴需要优化的文本',
    showTemplateSelector: false
  },
  {
    key: 'extract',
    label: '提取要点',
    description: '从长文本里提取关键信息',
    placeholder: '粘贴需要提取重点的内容',
    showTemplateSelector: false
  },
  {
    key: 'review',
    label: '内容检查',
    description: '检查文字是否完整、清楚',
    placeholder: '粘贴需要核对的内容',
    showTemplateSelector: false
  },
  {
    key: 'convert',
    label: '格式转换',
    description: '按目标格式重新组织内容',
    placeholder: '粘贴原文后选择目标格式',
    showTemplateSelector: true
  }
];

function listModes() {
  return request({
    url: ENDPOINTS.ai.modes,
    method: 'GET'
  }).then(function (data) {
    return {
      modes: data.modes || FALLBACK_MODES,
      templates: data.templates || { system: [], custom: [] }
    };
  }).catch(function () {
    return {
      modes: FALLBACK_MODES,
      templates: { system: [], custom: [] }
    };
  });
}

module.exports = {
  listModes: listModes,
  FALLBACK_MODES: FALLBACK_MODES
};
