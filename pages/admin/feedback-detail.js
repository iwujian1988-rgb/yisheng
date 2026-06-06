// pages/admin/feedback-detail.js
Page({
  data: {
    feedbackType: '',
    submitTime: '',
    processStatus: '',
    content: '',
    reviewRemark: ''
  },

  onLoad(options) {
    var keys = ['feedbackType', 'submitTime', 'processStatus', 'content'];
    var data = {};
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (options[key]) {
        data[key] = decodeURIComponent(options[key]);
      }
    }
    this.setData(data);
  },

  onRemarkInput(e) {
    this.setData({ reviewRemark: e.detail.value });
  },

  submitReview() {
    if (!this.data.reviewRemark) return;
    wx.showToast({ title: '等待接入反馈服务', icon: 'none' });
  }
});
