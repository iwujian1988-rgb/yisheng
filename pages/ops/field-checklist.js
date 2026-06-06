const qaState = require('../../services/qa/check-state');

Page({
  data: {
    items: [
      { id: 'hardware', title: '硬件设备', desc: '传输硬件已到位，外观无损，基础测试通过', checked: false },
      { id: 'account', title: '用户账号', desc: '付费用户已开通，登录正常，服务状态有效', checked: false },
      { id: 'computer', title: '目标电脑', desc: '目标电脑 USB 可用，输入环境正常', checked: false },
      { id: 'network', title: '网络环境', desc: '小程序可正常加载，蓝牙可正常使用', checked: false },
      { id: 'support', title: '售后信息', desc: '用户已了解使用方法和售后入口', checked: false }
    ],
    checkedCount: 0,
    progressPercent: 0
  },

  onLoad() {
    this.applyCheckedIds(qaState.getState('field'));
  },

  onCheckChange(e) {
    const checkedIds = e.detail.value || [];
    qaState.saveState('field', checkedIds);
    this.applyCheckedIds(checkedIds);
  },

  applyCheckedIds(checkedIds) {
    const items = this.data.items.map((item) => ({
      id: item.id,
      title: item.title,
      desc: item.desc,
      checked: checkedIds.indexOf(item.id) !== -1
    }));
    const checkedCount = items.filter((item) => item.checked).length;
    this.setData({
      items,
      checkedCount,
      progressPercent: Math.round((checkedCount / items.length) * 100)
    });
  }
});
