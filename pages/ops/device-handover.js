const tickets = require('../../services/ops/tickets');

Page({
  data: {
    serialNo: '',
    recipient: '',
    handoverDate: '',
    remark: '',
    canSubmit: false,
    submitting: false
  },

  onSerialInput(e) {
    this.setData({ serialNo: e.detail.value.trim() }, this.checkCanSubmit);
  },

  onRecipientInput(e) {
    this.setData({ recipient: e.detail.value.trim() }, this.checkCanSubmit);
  },

  onDateChange(e) {
    this.setData({ handoverDate: e.detail.value }, this.checkCanSubmit);
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  checkCanSubmit() {
    this.setData({
      canSubmit: this.data.serialNo.length > 0
        && this.data.recipient.length > 0
        && this.data.handoverDate.length > 0
    });
  },

  submitHandover() {
    if (!this.data.canSubmit || this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    tickets.submitHandover({
      serialNo: this.data.serialNo,
      recipient: this.data.recipient,
      handoverDate: this.data.handoverDate,
      remark: this.data.remark
    }).then(() => {
      wx.showToast({ title: '已记录', icon: 'success' });
      wx.navigateBack({ delta: 1 });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  }
});
