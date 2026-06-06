const dashboard = require('../../services/admin/dashboard');

Page({
  data: {
    filter: 'all',
    records: []
  },

  onLoad() {
    this.refreshRecords();
  },

  refreshRecords() {
    dashboard.getServiceRecords().then((records) => {
      const filter = this.data.filter;
      const nextRecords = filter === 'all'
        ? records
        : records.filter((record) => record.status === filter);
      this.setData({ records: nextRecords });
    });
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter }, this.refreshRecords);
  }
});
