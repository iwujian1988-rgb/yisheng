const ticketsService = require('../../services/ops/tickets');

Page({
  data: {
    filter: 'all',
    tickets: []
  },

  onLoad() {
    this.refreshTickets();
  },

  onShow() {
    this.refreshTickets();
  },

  refreshTickets() {
    const filter = this.data.filter;
    const tickets = ticketsService.getTickets();
    this.setData({
      tickets: filter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === filter)
    });
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter }, this.refreshTickets);
  }
});
