const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const { createMemoryStore } = require('./memory-store');

function ensureCollections(store) {
  [
    'adminUsers',
    'users',
    'devices',
    'orders',
    'tokenUsageRecords',
    'templates',
    'quickActions',
    'encryptedHistory',
    'feedbacks',
    'issues',
    'auditLogs',
    'activationCodes',
    'longTextTests',
    'bugReports',
    'userTemplates',
    'deviceSessionChallenges',
    'deviceSessions'
  ].forEach((key) => {
    if (!Array.isArray(store[key])) store[key] = [];
  });
  if (!store.templates.length) {
    store.templates = createMemoryStore().templates;
  }
  if (!store.quickActions.length) {
    store.quickActions = createMemoryStore().quickActions;
  }
  if (!store.defaultPrompts || !store.defaultPrompts.general) {
    store.defaultPrompts = createMemoryStore().defaultPrompts;
  }
  return store;
}

function createStore() {
  if (config.storeMode !== 'file') {
    return ensureCollections(createMemoryStore());
  }

  if (config.env === 'production' && !config.allowFileStoreInProduction) {
    throw new Error('STORE_MODE=file is disabled in production. Configure a database-backed store or set ALLOW_FILE_STORE_IN_PRODUCTION=true for a controlled pilot only.');
  }

  var filePath = path.resolve(process.cwd(), config.storeFile);
  var store;
  if (fs.existsSync(filePath)) {
    store = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else {
    store = createMemoryStore();
  }
  ensureCollections(store);

  store.save = function save() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    var snapshot = {};
    Object.keys(store).forEach((key) => {
      if (typeof store[key] !== 'function') snapshot[key] = store[key];
    });
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  };

  return store;
}

module.exports = {
  createStore
};
