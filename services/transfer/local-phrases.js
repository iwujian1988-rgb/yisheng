const STORAGE_KEY = 'transfer_phrases_v1';

const DEFAULT_PHRASES = [
  { id: 'p_default_1', text: '您好，请问有什么可以帮您？', category: '通用' },
  { id: 'p_default_2', text: '感谢您的耐心等待。', category: '通用' },
  { id: 'p_default_3', text: '请稍等，我马上为您处理。', category: '通用' },
  { id: 'p_default_4', text: '已为您完成处理，请确认。', category: '通用' },
  { id: 'p_default_5', text: '会议时间：', category: '办公' },
  { id: 'p_default_6', text: '会议地点：', category: '办公' },
  { id: 'p_default_7', text: '参会人员：', category: '办公' },
  { id: 'p_default_8', text: '会议议题：', category: '办公' }
];

function load() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (Array.isArray(stored) && stored.length) return stored;
  } catch (e) {}
  return DEFAULT_PHRASES.slice();
}

function save(items) {
  try {
    wx.setStorageSync(STORAGE_KEY, items);
  } catch (e) {}
}

function addPhrase(text, category) {
  if (!text) return load();
  const items = load();
  const phrase = {
    id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    text: String(text).slice(0, 500),
    category: category || '通用'
  };
  const next = [phrase].concat(items);
  save(next);
  return next;
}

function updatePhrase(id, patch) {
  const items = load().map((item) => item.id === id ? Object.assign({}, item, patch) : item);
  save(items);
  return items;
}

function removePhrase(id) {
  const items = load().filter((item) => item.id !== id);
  save(items);
  return items;
}

function filterByCategory(category) {
  if (!category || category === 'all') return load();
  return load().filter((item) => item.category === category);
}

function listCategories() {
  const set = {};
  load().forEach((item) => { set[item.category || '通用'] = true; });
  return Object.keys(set);
}

module.exports = {
  load,
  addPhrase,
  updatePhrase,
  removePhrase,
  filterByCategory,
  listCategories
};
