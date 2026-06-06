const purchaseRecords = require('../../services/purchase/records');

Page({
  data: {
    filter: 'all',
    records: []
  },

  onLoad() {
    this.refreshRecords();
  },

  onShow() {
    this.refreshRecords();
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter }, this.refreshRecords);
  },

  refreshRecords() {
    purchaseRecords.getPurchaseRecords().then((records) => {
      const filter = this.data.filter;
      const nextRecords = filter === 'all'
        ? records
        : records.filter((record) => record.type === filter || record.status === filter);
      this.setData({ records: nextRecords });
    });
  }
});
