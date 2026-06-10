const INVOICE_KEY = 'financeInvoiceInfo';

Page({
  data: { title: '', taxId: '', bank: '', account: '' },

  onLoad() {
    const saved = wx.getStorageSync(INVOICE_KEY) || {};
    this.setData({
      title: saved.title || '',
      taxId: saved.taxId || '',
      bank: saved.bank || '',
      account: saved.account || ''
    });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onTaxInput(e) {
    this.setData({ taxId: e.detail.value });
  },

  onBankInput(e) {
    this.setData({ bank: e.detail.value });
  },

  onAccountInput(e) {
    this.setData({ account: e.detail.value });
  },

  saveInvoice() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请填写发票抬头', icon: 'none' });
      return;
    }
    wx.setStorageSync(INVOICE_KEY, {
      title: this.data.title.trim(),
      taxId: this.data.taxId.trim(),
      bank: this.data.bank.trim(),
      account: this.data.account.trim(),
      updatedAt: Date.now()
    });
    wx.showToast({ title: '已保存', icon: 'success' });
  }
});
