const transferQueue = require('../../services/transfer/queue');

Page({
  data: {
    queueItems: []
  },

  onLoad() {
    this.refreshQueue();
  },

  onShow() {
    this.refreshQueue();
  },

  refreshQueue() {
    this.setData({
      queueItems: transferQueue.getQueueItems()
    });
  },

  cancelQueue() {
    wx.showModal({
      title: '确认取消',
      content: '将清空当前待发送队列。',
      confirmText: '取消队列',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          transferQueue.clearQueue();
          this.refreshQueue();
          wx.showToast({ title: '已取消', icon: 'success' });
        }
      }
    });
  }
});
