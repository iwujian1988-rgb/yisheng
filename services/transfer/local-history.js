const STORAGE_KEY = 'transfer_history_v1';
const MAX_ITEMS = 200;

function load() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || [];
  } catch (e) {
    return [];
  }
}

function save(items) {
  try {
    wx.setStorageSync(STORAGE_KEY, items.slice(0, MAX_ITEMS));
  } catch (e) {}
}

function addRecord(text, mode) {
  if (!text) return [];
  const items = load();
  const record = {
    id: 'h_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    text: String(text).slice(0, 5000),
    preview: String(text).slice(0, 80),
    length: String(text).length,
    mode: mode || 'manual',
    createdAt: new Date().toISOString()
  };
  const next = [record].concat(items).slice(0, MAX_ITEMS);
  save(next);
  return next;
}

function removeRecord(id) {
  const items = load().filter((item) => item.id !== id);
  save(items);
  return items;
}

function clearAll() {
  save([]);
  return [];
}

function search(keyword) {
  const query = (keyword || '').trim();
  if (!query) return load();
  return load().filter((item) => (item.text || '').indexOf(query) !== -1);
}

module.exports = {
  load,
  addRecord,
  removeRecord,
  clearAll,
  search
};
