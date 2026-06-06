const purchaseRecords = require('../../services/purchase/records');

Page({
  data: {
    records: []
  },

  onLoad() {
    purchaseRecords.getPurchaseRecords()
      .then((records) => {
        this.setData({ records });
      });
  }
});
