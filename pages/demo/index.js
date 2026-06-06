// pages/demo/index.js
Page({
  data: {},
  goScenario: function () { wx.navigateTo({ url: '/pages/demo/scenario-select' }); },
  goDevice: function () { wx.showToast({ title: '等待接入设备模拟', icon: 'none' }); },
  goTransfer: function () { wx.showToast({ title: '等待接入传输演示', icon: 'none' }); },
  goAI: function () { wx.showToast({ title: '等待接入AI预览', icon: 'none' }); }
});
