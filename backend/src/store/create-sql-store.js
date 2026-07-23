const mysql = require('mysql2/promise');
const { config } = require('../config');
const { createMemoryStore } = require('./memory-store');

const TABLE_TO_COLLECTION = {
  admin_users: 'adminUsers',
  users: 'users',
  devices: 'devices',
  orders: 'orders',
  activation_codes: 'activationCodes',
  token_usage_records: 'tokenUsageRecords',
  templates: 'templates',
  user_templates: 'userTemplates',
  agent_templates: 'agentTemplates',
  quick_actions: 'quickActions',
  default_prompts: 'defaultPrompts',
  encrypted_history: 'encryptedHistory',
  feedbacks: 'feedbacks',
  issues: 'issues',
  long_text_tests: 'longTextTests',
  bug_reports: 'bugReports',
  audit_logs: 'auditLogs',
  device_session_challenges: 'deviceSessionChallenges',
  device_sessions: 'deviceSessions',
  device_live_proofs: 'deviceLiveProofs',
  wechat_session_keys: 'wechatSessionKeys'
};

const COLLECTION_TO_TABLE = Object.keys(TABLE_TO_COLLECTION).reduce(function (acc, table) {
  acc[TABLE_TO_COLLECTION[table]] = table;
  return acc;
}, {});

const JSON_COLUMNS_BY_TABLE = {
  templates: ['variable_defs', 'output_structure', 'quality_rules', 'missing_info_rules', 'forbidden_rules'],
  user_templates: ['fields'],
  agent_templates: ['fields'],
  quick_actions: ['output_structure', 'quality_rules', 'missing_info_rules', 'forbidden_rules'],
  device_sessions: ['capabilities']
};

function snakeToCamel(s) {
  return String(s || '').replace(/_([a-z0-9])/g, function (_, ch) { return ch.toUpperCase(); });
}

function camelToSnake(s) {
  return String(s || '').replace(/([A-Z])/g, function (_, ch) { return '_' + ch.toLowerCase(); });
}

function rowToObject(row, jsonColumns) {
  var jsonSet = (jsonColumns || []).reduce(function (acc, key) { acc[key] = true; return acc; }, {});
  var out = {};
  Object.keys(row).forEach(function (column) {
    var camelKey = snakeToCamel(column);
    var raw = row[column];
    if (jsonSet[column]) {
      try { out[camelKey] = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null; }
      catch (e) { out[camelKey] = null; }
      return;
    }
    if (raw instanceof Date) {
      out[camelKey] = raw.toISOString();
      return;
    }
    out[camelKey] = raw;
  });
  return out;
}

function objectToRow(obj, jsonColumns) {
  var jsonSet = (jsonColumns || []).reduce(function (acc, key) { acc[key] = true; return acc; }, {});
  var row = {};
  Object.keys(obj).forEach(function (camelKey) {
    var column = camelToSnake(camelKey);
    var value = obj[camelKey];
    if (value === '' ) {
      row[column] = null;
      return;
    }
    if (value instanceof Date) {
      row[column] = value;
      return;
    }
    if (typeof value === 'string') {
      var isoMatch = /^\d{4}-\d{2}-\d{2}T/.test(value);
      if (isoMatch) {
        var dt = new Date(value);
        if (!isNaN(dt.getTime())) {
          row[column] = dt;
          return;
        }
      }
    }
    if (jsonSet[column] && value !== null && value !== undefined) {
      row[column] = typeof value === 'string' ? value : JSON.stringify(value);
      return;
    }
    if (typeof value === 'boolean') {
      row[column] = value ? 1 : 0;
      return;
    }
    row[column] = value;
  });
  return row;
}

async function loadTable(pool, table) {
  var jsonColumns = JSON_COLUMNS_BY_TABLE[table] || [];
  var sql = 'SELECT * FROM `' + table + '`';
  var conn;
  try {
    conn = await pool.getConnection();
    var [rows] = await conn.query(sql);
    return rows.map(function (r) { return rowToObject(r, jsonColumns); });
  } finally {
    if (conn) conn.release();
  }
}

async function upsertTable(pool, table, items) {
  if (!items || !items.length) return;
  var jsonColumns = JSON_COLUMNS_BY_TABLE[table] || [];
  var conn;
  try {
    conn = await pool.getConnection();
    var sampleRow = objectToRow(items[0], jsonColumns);
    var columns = Object.keys(sampleRow);
    if (!columns.length) return;
    var placeholders = columns.map(function () { return '?'; }).join(', ');
    var updateClause = columns
      .filter(function (c) { return c !== 'id'; })
      .map(function (c) { return '`' + c + '`=VALUES(`' + c + '`)'; })
      .join(', ');
    var sql = 'INSERT INTO `' + table + '` (' +
      columns.map(function (c) { return '`' + c + '`'; }).join(', ') +
      ') VALUES (' + placeholders + ') ON DUPLICATE KEY UPDATE ' + updateClause;
    for (var i = 0; i < items.length; i += 1) {
      var row = objectToRow(items[i], jsonColumns);
      var values = columns.map(function (c) { return row[c]; });
      await conn.query(sql, values);
    }
  } finally {
    if (conn) conn.release();
  }
}

function createPool() {
  return mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    charset: config.db.charset,
    multipleStatements: false
  });
}

function createSqlStore() {
  var pool = createPool();
  var store = createMemoryStore();
  var saving = false;
  var lastPersistError = null;

  async function loadAll() {
    var tables = Object.keys(TABLE_TO_COLLECTION);
    for (var i = 0; i < tables.length; i += 1) {
      var table = tables[i];
      var collection = TABLE_TO_COLLECTION[table];
      try {
        var rows = await loadTable(pool, table);
        store[collection] = rows;
      } catch (err) {
        console.warn('[sql-store] failed to load table ' + table + ':', err.message);
      }
    }
    try {
      var conn = await pool.getConnection();
      var [promptRows] = await conn.query('SELECT scope, professional, general FROM default_prompts');
      conn.release();
      if (promptRows.length) {
        var prompts = {};
        promptRows.forEach(function (row) {
          if (row.scope === 'professional') prompts.professional = row.professional || '';
          if (row.scope === 'general') prompts.general = row.general || '';
        });
        if (prompts.professional) store.defaultPrompts.professional = prompts.professional;
        if (prompts.general) store.defaultPrompts.general = prompts.general;
      }
    } catch (err) {
      console.warn('[sql-store] failed to load default_prompts:', err.message);
    }
  }

  async function persist() {
    if (saving) return;
    saving = true;
    try {
      var tables = Object.keys(TABLE_TO_COLLECTION);
      for (var i = 0; i < tables.length; i += 1) {
        var table = tables[i];
        var collection = TABLE_TO_COLLECTION[table];
        var items = store[collection];
        if (Array.isArray(items) && items.length) {
          await upsertTable(pool, table, items);
        }
      }
      if (store.defaultPrompts) {
        var conn2 = await pool.getConnection();
        try {
          for (var key of Object.keys(store.defaultPrompts)) {
            var scope = key;
            var text = store.defaultPrompts[key];
            await conn2.query(
              'INSERT INTO default_prompts (scope, professional, general, updated_at) VALUES (?, ?, ?, NOW()) ' +
              'ON DUPLICATE KEY UPDATE professional=VALUES(professional), general=VALUES(general), updated_at=NOW()',
              [scope, scope === 'professional' ? text : null, scope === 'general' ? text : null]
            );
          }
        } finally {
          conn2.release();
        }
      }
      lastPersistError = null;
    } catch (err) {
      lastPersistError = err;
      console.error('[sql-store] persist failed:', err.message);
    } finally {
      saving = false;
    }
  }

  var saveTimer = null;
  store.save = function saveSync() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      persist().catch(function (e) { console.error('[sql-store] save tick failed:', e.message); });
    }, 200);
  };

  store.ready = loadAll().then(function () {
    console.log('[sql-store] initial load complete');
  }).catch(function (err) {
    console.error('[sql-store] initial load failed:', err.message);
    throw err;
  });

  setInterval(function () {
    persist().catch(function (e) { console.error('[sql-store] auto persist failed:', e.message); });
  }, 30 * 1000);

  process.once('SIGTERM', function () {
    persist().finally(function () { pool.end().then(function () { process.exit(0); }, function () { process.exit(0); }); });
  });
  process.once('SIGINT', function () {
    persist().finally(function () { pool.end().then(function () { process.exit(0); }, function () { process.exit(0); }); });
  });

  store.__pool = pool;
  store.persist = persist;
  store.lastPersistError = function () { return lastPersistError; };
  return store;
}

module.exports = {
  createSqlStore: createSqlStore,
  TABLE_TO_COLLECTION: TABLE_TO_COLLECTION,
  COLLECTION_TO_TABLE: COLLECTION_TO_TABLE,
  JSON_COLUMNS_BY_TABLE: JSON_COLUMNS_BY_TABLE,
  rowToObject: rowToObject,
  objectToRow: objectToRow
};
