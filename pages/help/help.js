// pages/help/help.js
Page({
  data: {
    faqList: [
      {
        id: 1,
        question: '蓝牙连接失败怎么办？',
        answer: '请确认：1. 手机蓝牙已开启；2. 传输硬件已插入电脑 USB 口且指示灯亮起；3. 距离硬件 3 米以内；4. 尝试关闭蓝牙后重新开启，再次搜索设备。',
        expanded: false
      },
      {
        id: 2,
        question: '传输到电脑出现乱码怎么办？',
        answer: '请检查传输设置中的系统模式是否与目标电脑系统匹配。Windows 10 选择 WIN10，Windows 11 选择 WIN11。如果仍有问题，尝试切换到 RAW 模式测试。',
        expanded: false
      },
      {
        id: 3,
        question: '如何绑定设备？',
        answer: '将传输硬件插入电脑 USB 口，等待指示灯亮起。在小程序中进入"设备管理"页面，点击"绑定设备"按钮完成绑定。每台设备只能绑定一个账号。',
        expanded: false
      },
      {
        id: 4,
        question: '如何联系售后？',
        answer: '您可以通过本页面底部的"联系客服"按钮获取帮助，也可以联系您的销售代表。工作时间内我们会尽快回复。',
        expanded: false
      },
      {
        id: 5,
        question: '传输速度可以调整吗？',
        answer: '可以。进入"传输设置"页面，可选择安全、均衡、极速三档速度。建议优先使用"均衡"模式，如目标电脑性能较好可尝试"极速"模式。',
        expanded: false
      },
      {
        id: 6,
        question: '服务到期后怎么办？',
        answer: '服务到期后传输功能将暂停使用。请联系销售代表或客服进行续费，续费后功能自动恢复。',
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
    wx.showToast({ title: '等待接入路由', icon: 'none' });
  }
});
