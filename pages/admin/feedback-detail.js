const adminDashboard = require('../../services/admin/dashboard');

Page({
  data: {
    id: '',
    feedbackType: '',
    submitTime: '',
    processStatus: '',
    content: '',
    reviewRemark: ''
  },

  onLoad(options) {
    const keys = ['id', 'feedbackType', 'submitTime', 'processStatus', 'content'];
    const data = {};
    keys.forEach((key) => {
      if (options[key]) data[key] = decodeURIComponent(options[key]);
    });
    this.setData(data);
  },

  onRemarkInput(e) {
    this.setData({ reviewRemark: e.detail.value });
  },

  submitReview() {
    if (!this.data.id) {
      wx.showToast({ title: '缺少反馈 ID', icon: 'none' });
      return;
    }
    if (!this.data.reviewRemark) {
      wx.showToast({ title: '请输入处理备注', icon: 'none' });
      return;
    }
    adminDashboard.updateFeedback(this.data.id, {
      status: 'reviewed',
      reviewRemark: this.data.reviewRemark
    }).then(() => {
      wx.showToast({ title: '已提交处理', icon: 'success' });
      wx.navigateBack();
    }).catch((error) => {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    });
  }
});
