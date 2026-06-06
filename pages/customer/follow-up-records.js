// pages/customer/follow-up-records.js
Page({
  data: { filter: 'all', records: [] },
  setFilter: function (e) { this.setData({ filter: e.currentTarget.dataset.filter }); }
});
