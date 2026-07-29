#!/usr/bin/env node
/**
 * 初始化种子数据：
 *   npm run seed              # 仅当 users / admin_users 为空时写入
 *   npm run seed -- --force   # 强制覆盖
 *
 * 写入内容：
 *   - 一个超级管理员账号（来自 ADMIN_ACCOUNT / ADMIN_PASSWORD env）
 *   - 默认 prompts（general / professional）
 *   - 内置 templates / quick_actions（来自 memory-store）
 *   - 一台出厂设备 DEV-SERIAL-001（proofCode=0000，未绑定，等首位用户自动绑定）
 */
const mysql = require('mysql2/promise');
const { config } = require('../src/config');
const { createMemoryStore } = require('../src/store/memory-store');
const { hashPassword } = require('../src/security/password');
const {
  TABLE_TO_COLLECTION,
  objectToRow,
  JSON_COLUMNS_BY_TABLE
} = require('../src/store/create-sql-store');

// 出厂设备种子：与 memory-store.js 中 DEV-SERIAL-001 默认值对齐。
// 用固定 ID 保证重新 seed 幂等；bindStatus=unbound 让首位真实用户走 autoBind 流程。
// 没 seed 这条 -> 首次部署 mysql devices 表为空 -> create-sql-store.loadAll() 用空数组
// 覆盖 memory-store 默认值 -> admin 后台显示"设备未登记"。
function buildDeviceSeed() {
  var now = new Date().toISOString();
  return [{
    id: 'device_seed_dev_serial_001',
    mac: '',
    serialNo: 'DEV-SERIAL-001',
    model: 'TXT-HID',
    firmwareVersion: '',
    protocolVersion: '',
    templateAccess: 'general',
    proofCodeHash: hashPassword('0000'),
    bindStatus: 'unbound',
    reservedUserId: '',
    boundUserId: '',
    boundAt: '',
    createdAt: now,
    updatedAt: now
  }];
}

function parseArgs(argv) {
  var args = { force: false };
  for (var i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--force') args.force = true;
  }
  return args;
}

async function tableIsEmpty(conn, table) {
  var [rows] = await conn.query('SELECT COUNT(*) AS n FROM `' + table + '`');
  return Number(rows[0].n) === 0;
}

async function upsertSeed(conn, table, items) {
  if (!items || !items.length) return 0;
  var jsonColumns = JSON_COLUMNS_BY_TABLE[table] || [];
  var sampleRow = objectToRow(items[0], jsonColumns);
  var columns = Object.keys(sampleRow);
  if (!columns.length) return 0;
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
  return items.length;
}

async function main() {
  var args = parseArgs(process.argv);
  var conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: false
  });
  try {
    var seed = createMemoryStore();

    var adminEmpty = await tableIsEmpty(conn, 'admin_users');
    if (adminEmpty || args.force) {
      var n = await upsertSeed(conn, 'admin_users', seed.adminUsers || []);
      console.log('[seed] admin_users inserted/updated:', n);
    } else {
      console.log('[seed] admin_users non-empty, skip (use --force to overwrite)');
    }

    var promptsEmpty = await tableIsEmpty(conn, 'default_prompts');
    if (promptsEmpty || args.force) {
      for (var key of Object.keys(seed.defaultPrompts || {})) {
        var text = seed.defaultPrompts[key];
        await conn.query(
          'INSERT INTO default_prompts (scope, professional, general, updated_at) VALUES (?, ?, ?, NOW()) ' +
          'ON DUPLICATE KEY UPDATE professional=VALUES(professional), general=VALUES(general), updated_at=NOW()',
          [key, key === 'professional' ? text : null, key === 'general' ? text : null]
        );
      }
      console.log('[seed] default_prompts inserted');
    } else {
      console.log('[seed] default_prompts non-empty, skip (use --force to overwrite)');
    }

    var tablesToSeed = ['templates', 'quick_actions'];
    for (var i = 0; i < tablesToSeed.length; i += 1) {
      var table = tablesToSeed[i];
      var collection = TABLE_TO_COLLECTION[table];
      var items = seed[collection] || [];
      var isEmpty = await tableIsEmpty(conn, table);
      if (isEmpty || args.force) {
        var count = await upsertSeed(conn, table, items);
        console.log('[seed] ' + table + ' inserted:', count);
      } else {
        console.log('[seed] ' + table + ' non-empty, skip (use --force to overwrite)');
      }
    }

    var devicesEmpty = await tableIsEmpty(conn, 'devices');
    if (devicesEmpty || args.force) {
      var deviceCount = await upsertSeed(conn, 'devices', buildDeviceSeed());
      console.log('[seed] devices inserted:', deviceCount);
    } else {
      console.log('[seed] devices non-empty, skip (use --force to overwrite)');
    }

    console.log('[seed] done');
  } finally {
    await conn.end();
  }
}

main().catch(function (err) {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
