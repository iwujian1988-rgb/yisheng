// pages/backend/status.js
Page({
  data: { authStatus: '', userStatus: '', deviceStatus: '', aiStatus: '' },
  onLoad: function (options) {
    var keys = ['authStatus', 'userStatus', 'deviceStatus', 'aiStatus'];
    var data = {};
    for (var i = 0; i < keys.length; i++) {
      if (options[keys[i]]) { data[keys[i]] = decodeURIComponent(options[keys[i]]); }
    }
    this.setData(data);
  }
});
