// pages/finance/invoice-info.js
Page({
  data: { title: '', taxId: '', bank: '', account: '' },
  onTitleInput: function (e) { this.setData({ title: e.detail.value }); },
  onTaxInput: function (e) { this.setData({ taxId: e.detail.value }); },
  onBankInput: function (e) { this.setData({ bank: e.detail.value }); },
  onAccountInput: function (e) { this.setData({ account: e.detail.value }); },
  saveInvoice: function () { wx.showToast({ title: '等待接入开票服务', icon: 'none' }); }
});
