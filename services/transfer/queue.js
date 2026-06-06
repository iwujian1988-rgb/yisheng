const QUEUE_KEY = 'transferQueueItems';

function normalizeQueueItem(item) {
  return {
    id: item.id || ('queue_' + Date.now()),
    label: item.label || '传输任务',
    status: item.status || 'pending',
    statusText: item.statusText || '等待发送',
    progress: typeof item.progress === 'number' ? item.progress : 0,
    text: item.text || '',
    source: item.source || 'manual',
    createdAt: item.createdAt || Date.now()
  };
}

function getQueueItems() {
  const items = wx.getStorageSync(QUEUE_KEY);
  return Array.isArray(items) ? items.map(normalizeQueueItem) : [];
}

function enqueueText(text, source) {
  const item = normalizeQueueItem({
    id: 'queue_' + Date.now(),
    label: source ? source + ' 文本' : '待发送文本',
    text,
    source,
    status: 'pending',
    statusText: '等待发送',
    progress: 0
  });
  const items = [item].concat(getQueueItems());
  wx.setStorageSync(QUEUE_KEY, items);
  return item;
}

function clearQueue() {
  wx.removeStorageSync(QUEUE_KEY);
  return [];
}

module.exports = {
  getQueueItems,
  enqueueText,
  clearQueue
};
