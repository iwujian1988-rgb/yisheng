const paidUsers = require('../../services/admin/paid-users');

Page({
  data: {
    totalUsers: 0,
    openedUsers: 0,
    boundUsers: 0,
    activeUsers: 0
  },

  onLoad() {
    this.refreshMetrics();
  },

  onShow() {
    this.refreshMetrics();
  },

  refreshMetrics() {
    const users = paidUsers.getPaidUsers();
    this.setData({
      totalUsers: users.length,
      openedUsers: users.filter((user) => user.status === 'active').length,
      boundUsers: users.filter((user) => Boolean(user.serialNo)).length,
      activeUsers: users.filter((user) => user.status === 'active').length
    });
  }
});
