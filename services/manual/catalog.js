const MANUAL_SECTIONS = {
  setup: {
    title: '首次使用',
    steps: ['登录账号', '确认服务状态', '进入首页连接设备'],
    notices: ['正式服务需要账号已开通']
  },
  device: {
    title: '连接设备',
    steps: ['插入硬件', '打开首页', '搜索并连接蓝牙设备'],
    notices: ['连接前请确认手机蓝牙已开启']
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
