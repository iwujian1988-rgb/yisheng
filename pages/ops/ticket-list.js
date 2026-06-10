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
  },

  goDetail(e) {
    const ticket = ticketsService.getTicketById(e.currentTarget.dataset.id);
    if (!ticket) {
      wx.showToast({ title: '工单不存在', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/ops/ticket-detail?ticketId=' + encodeURIComponent(ticket.id) +
        '&ticketType=' + encodeURIComponent(ticket.type || '') +
        '&ticketStatus=' + encodeURIComponent(ticket.status || '') +
        '&ticketDesc=' + encodeURIComponent(ticket.desc || '')
    });
  }
});
