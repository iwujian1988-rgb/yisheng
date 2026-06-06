const PURCHASE_RECORDS_KEY = 'purchaseServiceRecords';

function getPurchaseRecords() {
  const records = wx.getStorageSync(PURCHASE_RECORDS_KEY);
  if (Array.isArray(records)) {
    return Promise.resolve(records);
  }
  return Promise.resolve([]);
}

function savePurchaseRecord(record) {
  return getPurchaseRecords().then((records) => {
    const nextRecord = Object.assign({
      id: 'purchase-' + Date.now(),
      status: 'active',
      createdAt: Date.now()
    }, record);
    const nextRecords = [nextRecord].concat(records);
    wx.setStorageSync(PURCHASE_RECORDS_KEY, nextRecords);
    return nextRecord;
  });
}

module.exports = {
  getPurchaseRecords,
  savePurchaseRecord
};

