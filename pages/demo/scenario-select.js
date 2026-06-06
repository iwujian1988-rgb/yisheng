// pages/demo/scenario-select.js
Page({
  data: {},
  selectScenario: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/demo/result?id=' + id });
  }
});
