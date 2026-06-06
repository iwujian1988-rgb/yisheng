const dashboard = require('../../services/admin/dashboard');

Page({
  data: {
    filter: 'all',
    feedbacks: []
  },

  onLoad() {
    this.refreshFeedbacks();
  },

  refreshFeedbacks() {
    dashboard.getFeedbacks().then((feedbacks) => {
      const filter = this.data.filter;
      const nextFeedbacks = filter === 'all'
        ? feedbacks
        : feedbacks.filter((item) => item.status === filter);
      this.setData({ feedbacks: nextFeedbacks });
    });
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter }, this.refreshFeedbacks);
  }
});
