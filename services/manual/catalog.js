const MANUAL_SECTIONS = {
  setup: {
    title: '首次使用',
    steps: ['登录账号', '确认服务状态', '进入设备绑定'],
    notices: ['正式服务需要账号已开通']
  },
  device: {
    title: '绑定设备',
    steps: ['插入硬件', '打开设备管理', '按页面提示完成绑定'],
    notices: ['绑定前请确认设备序列号']
  },
  transfer: {
    title: '发送文本',
    steps: ['准备文本', '确认电脑输入框已聚焦', '回到首页发送'],
    notices: ['长文本发送前建议先做短文本测试']
  },
  ai: {
    title: 'AI 整理',
    steps: ['进入 AI 功能', '确认脱敏说明', '审核生成结果'],
    notices: ['AI 结果需用户确认后再发送']
  },
  troubleshoot: {
    title: '问题排查',
    steps: ['检查设备连接', '检查电脑输入框', '查看网络测试页'],
    notices: ['无法解决时提交售后问题']
  }
};

function getManualSection(type) {
  return MANUAL_SECTIONS[type] || {
    title: '',
    steps: [],
    notices: []
  };
}

module.exports = {
  getManualSection
};
