const qaState = require('../../services/qa/check-state');

Page({
  data: {
    items: [
      { id: 'agreement', title: '协议展示', desc: '用户协议和隐私政策已正确展示且可正常查看', checked: false },
      { id: 'redaction', title: '脱敏说明', desc: 'AI 脱敏处理说明已展示，敏感字段类型已列出', checked: false },
      { id: 'admin_invisible', title: '管理员不可见', desc: '管理员无法直接查看用户明文内容', checked: false },
      { id: 'local_clear', title: '本地数据清理', desc: '用户可以清除本地保存的数据', checked: false }
    ],
    checkedCount: 0,
    progressPercent: 0
  },

  onLoad() {
    this.applyCheckedIds(qaState.getState('privacy'));
  },

  onCheckChange(e) {
    const checkedIds = e.detail.value || [];
    qaState.saveState('privacy', checkedIds);
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
