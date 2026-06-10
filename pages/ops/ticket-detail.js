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
    const ticketId = options.ticketId ? decodeURIComponent(options.ticketId) : '';
    const storedTicket = ticketsService.getTicketById(ticketId);
    this.setData({
      ticketId,
      ticketType: storedTicket ? storedTicket.type : (options.ticketType ? decodeURIComponent(options.ticketType) : ''),
      ticketStatus: storedTicket ? storedTicket.status : (options.ticketStatus ? decodeURIComponent(options.ticketStatus) : ''),
      ticketDesc: storedTicket ? storedTicket.desc : (options.ticketDesc ? decodeURIComponent(options.ticketDesc) : ''),
      records: storedTicket && Array.isArray(storedTicket.records) ? storedTicket.records : []
    });
  },

  addRecord() {
    if (!this.data.ticketId) {
      wx.showToast({ title: '缺少工单标识', icon: 'none' });
      return;
    }
    ticketsService.addTicketRecord(this.data.ticketId, '已跟进处理').then((record) => {
      this.setData({ records: this.data.records.concat(record) });
      wx.showToast({ title: '已添加记录', icon: 'success' });
    });
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
