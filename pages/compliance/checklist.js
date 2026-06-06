Page({
  data: {
    items: [
      { id: 'privacy', title: '隐私政策', desc: '隐私政策可正常展示', checked: false },
      { id: 'terms', title: '用户协议', desc: '用户协议可正常展示', checked: false },
      { id: 'redaction', title: '脱敏说明', desc: 'AI 脱敏处理说明已展示给用户', checked: false },
      { id: 'admin', title: '管理员不可见', desc: '管理员不直接查看用户明文内容', checked: false },
      { id: 'clear', title: '数据清理', desc: '用户可以清除本地保存的数据', checked: false }
    ],
    checkedCount: 0,
    progressPercent: 0
  },

  onCheckChange(e) {
    const checkedIds = e.detail.value;
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
