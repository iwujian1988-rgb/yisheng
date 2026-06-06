Page({
  data: {
    items: [
      { id: 'usb', text: '硬件已插入目标电脑 USB 口', checked: false },
      { id: 'bluetooth', text: '手机蓝牙已开启', checked: false },
      { id: 'led', text: '设备指示灯状态正常', checked: false },
      { id: 'focus', text: '目标电脑输入框已聚焦', checked: false }
    ],
    allChecked: false
  },

  onCheckChange(e) {
    const checkedIds = e.detail.value || [];
    const items = this.data.items.map((item) => ({
      id: item.id,
      text: item.text,
      checked: checkedIds.indexOf(item.id) !== -1
    }));

    this.setData({
      items,
      allChecked: items.every((item) => item.checked)
    });
  },

  startConnect() {
    if (!this.data.allChecked) {
      wx.showToast({ title: '请先完成检查', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/device/device' });
  }
});
