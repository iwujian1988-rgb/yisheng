const STORAGE_KEY = 'transfer_snippets_v1';

function load() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || [];
  } catch (e) {
    return [];
  }
}

function save(items) {
  try {
    wx.setStorageSync(STORAGE_KEY, items);
  } catch (e) {}
}

function addSnippet(payload) {
  const items = load();
  const snippet = {
    id: 's_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    title: String(payload.title || '').trim() || '未命名片段',
    text: String(payload.text || '').slice(0, 5000),
    category: payload.category || '通用',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const next = [snippet].concat(items);
  save(next);
  return next;
}

function updateSnippet(id, patch) {
  const items = load().map((item) => item.id === id
    ? Object.assign({}, item, patch, { updatedAt: new Date().toISOString() })
    : item);
  save(items);
  return items;
}

function removeSnippet(id) {
  const items = load().filter((item) => item.id !== id);
  save(items);
  return items;
}

function search(keyword) {
  const query = (keyword || '').trim();
  if (!query) return load();
  return load().filter((item) =>
    (item.title || '').indexOf(query) !== -1 ||
    (item.text || '').indexOf(query) !== -1
  );
}

module.exports = {
  load,
  addSnippet,
  updateSnippet,
  removeSnippet,
  search
};
