// pages/customer/messages.js
Page({
  data: { messages: [] },
  onLoad: function () {},
  goDetail: function (e) { wx.showToast({ title: '等待接入消息详情', icon: 'none' }); }
});
