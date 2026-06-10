const { getBaseUrl, request } = require('../../services/api/client');
const { ENDPOINTS } = require('../../services/api/endpoints');

Page({
  data: {
    records: []
  },

  onLoad() {
    if (!getBaseUrl()) {
      this.setData({ records: [] });
      return;
    }
    request({
      url: ENDPOINTS.purchase.records,
      method: 'GET'
    }).then((data) => {
      var list = Array.isArray(data) ? data : [];
      var records = list.map(function (item) {
        var statusMap = {
          active: '服务中',
          expired: '已过期',
          disabled: '已停用',
          none: '未开通'
        };
        return {
          id: item.id,
          type: '传输服务',
          status: item.status,
          statusText: statusMap[item.status] || item.status,
          time: item.expiredAt ? '有效期至 ' + item.expiredAt.split('T')[0] : ''
        };
      });
      this.setData({ records: records });
    }).catch(() => {
      this.setData({ records: [] });
    });
  }
});
