// pages/admin/service-record-detail.js
Page({
  data: {
    userPhone: '',
    startDate: '',
    expiryDate: '',
    serviceStatus: '',
    remark: ''
  },

  onLoad(options) {
    var keys = ['userPhone', 'startDate', 'expiryDate', 'serviceStatus', 'remark'];
    var data = {};
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (options[key]) {
        data[key] = decodeURIComponent(options[key]);
      }
    }
    this.setData(data);
  }
});
