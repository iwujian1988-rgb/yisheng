const qaState = require('../../services/qa/check-state');

Page({
  data: {
    items: [
      { id: 'login', title: '登录注册', desc: '手机号注册、登录、微信登录流程', checked: false },
      { id: 'device', title: '设备绑定', desc: '蓝牙搜索、设备绑定、设备信息展示', checked: false },
      { id: 'import', title: '文本导入', desc: '手动输入、OCR、ASR、AI 整理入口', checked: false },
      { id: 'transfer', title: '蓝牙传输', desc: '文本发送、进度显示、取消、完成', checked: false },
      { id: 'history', title: '历史记录', desc: '传输记录查看、存储、删除', checked: false },
      { id: 'settings', title: '设置', desc: '速度档、系统模式、隐私设置', checked: false }
    ],
    checkedCount: 0,
    progressPercent: 0
  },

  onLoad() {
    this.applyCheckedIds(qaState.getState('smoke'));
  },

  onCheckChange(e) {
    const checkedIds = e.detail.value || [];
    qaState.saveState('smoke', checkedIds);
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
