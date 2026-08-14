Page({
  data: {
    faqList: [
      {
        id: 1,
        question: '蓝牙连接失败怎么办？',
        answer: '请确认手机蓝牙已开启，传输硬件已插入电脑 USB 口且指示灯亮起，设备距离在 3 米内。仍失败时，关闭蓝牙后重新开启，再回到设备管理页重试。',
        expanded: false
      },
      {
        id: 2,
        question: '传输到电脑出现乱码怎么办？',
        answer: '请检查传输设置中的系统模式是否与目标电脑系统匹配。Windows 10 选择 WIN10，Windows 11 选择 WIN11。仍有问题时，可切换到 RAW 模式测试。',
        expanded: false
      },
      {
        id: 3,
        question: '如何连接设备？',
        answer: '将传输硬件插入电脑 USB 口，等待指示灯亮起。进入首页后点击搜索设备，蓝牙连接成功后即可开始传输。',
        expanded: false
      },
      {
        id: 4,
        question: '如何联系售后？',
        answer: '点击本页底部的“联系支持”，选择设备问题或账号问题并提交描述。请尽量附上设备序列号、电脑系统和复现步骤。',
        expanded: false
      },
      {
        id: 5,
        question: '传输速度可以调整吗？',
        answer: '可以。请在开始发送前选择慢速、稳定、均衡或快速；发送途中会锁定本次速度，完成后才能修改。默认建议使用稳定模式。',
        expanded: false
      },
      {
        id: 6,
        question: '服务到期后怎么办？',
        answer: '服务到期后传输功能会暂停使用。请联系销售或客服续费，续费后账号权限会自动恢复。',
        expanded: false
      }
    ]
  },

  toggleFaq(e) {
    const id = e.currentTarget.dataset.id;
    const faqList = this.data.faqList.map((item) => {
      if (item.id === id) {
        return Object.assign({}, item, { expanded: !item.expanded });
      }
      return item;
    });
    this.setData({ faqList });
  },

  contactSupport() {
    wx.navigateTo({ url: '/pages/support/index' });
  }
});
