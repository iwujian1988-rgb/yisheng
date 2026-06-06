const paidUsers = require('../../services/admin/paid-users');

Page({
  data: {
    totalServices: 0,
    activeServices: 0,
    expiredServices: 0,
    pendingServices: 0
  },

  onLoad() {
    this.refreshStats();
  },

  onShow() {
    this.refreshStats();
  },

  refreshStats() {
    const stats = paidUsers.getPaidUserStats();
    this.setData({
      totalServices: stats.total,
      activeServices: stats.active,
      expiredServices: stats.expired,
      pendingServices: stats.pending
    });
  }
});
