// pages/qa/bluetooth-test-report.js
Page({
  data: {
    adapterStatus: '',
    connectionStatus: '',
    serviceStatus: '',
    writeStatus: '',
    chunkCount: '',
    transferResult: '',
    elapsed: ''
  },

  onLoad(options) {
    var keys = ['adapterStatus', 'connectionStatus', 'serviceStatus', 'writeStatus', 'chunkCount', 'transferResult', 'elapsed'];
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
