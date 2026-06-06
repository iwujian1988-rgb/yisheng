// pages/maintenance/logs.js
Page({
  data: { filter: 'all', logs: [] },
  setFilter: function (e) { this.setData({ filter: e.currentTarget.dataset.filter }); }
});
