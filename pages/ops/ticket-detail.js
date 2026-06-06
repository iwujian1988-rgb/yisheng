const ticketsService = require('../../services/ops/tickets');

Page({
  data: {
    ticketId: '',
    ticketType: '',
    ticketStatus: '',
    ticketDesc: '',
    records: []
  },

  onLoad(options) {
    this.setData({
      ticketId: options.ticketId ? decodeURIComponent(options.ticketId) : '',
      ticketType: options.ticketType ? decodeURIComponent(options.ticketType) : '',
      ticketStatus: options.ticketStatus ? decodeURIComponent(options.ticketStatus) : '',
      ticketDesc: options.ticketDesc ? decodeURIComponent(options.ticketDesc) : ''
    });
  },

  addRecord() {
    wx.showToast({ title: '等待接入售后记录服务', icon: 'none' });
  },

  closeTicket() {
    if (!this.data.ticketId) {
      wx.showToast({ title: '缺少工单标识', icon: 'none' });
      return;
    }
    ticketsService.updateTicketStatus(this.data.ticketId, 'closed').then(() => {
      wx.showToast({ title: '已关闭', icon: 'success' });
      wx.navigateBack({ delta: 1 });
    });
  }
});
