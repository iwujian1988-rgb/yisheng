const computerEnv = require('../../services/settings/computer-env');

Page({
  data: {
    envOptions: [
      { value: 'input_box', label: '普通输入框', desc: '桌面应用中的文本输入框' },
      { value: 'web', label: '网页系统', desc: '浏览器中的网页输入界面' },
      { value: 'remote_desktop', label: '远程桌面', desc: '通过远程桌面连接的电脑' },
      { value: 'vm', label: '虚拟机', desc: '运行在虚拟机中的系统' },
      { value: 'unknown', label: '未知', desc: '不确定当前电脑环境' }
    ],
    selectedEnv: ''
  },

  onLoad() {
    const settings = computerEnv.getComputerEnv();
    this.setData({ selectedEnv: settings.env });
  },

  onEnvChange(e) {
    this.setData({ selectedEnv: e.detail.value });
  },

  saveEnv() {
    if (!this.data.selectedEnv) {
      return;
    }
    computerEnv.saveComputerEnv(this.data.selectedEnv);
    wx.showToast({ title: '已保存', icon: 'success' });
  }
});
