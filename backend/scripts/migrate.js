#!/usr/bin/env node
/**
 * 用法：
 *   npm run migrate up      # 应用所有未执行的 migration
 *   npm run migrate down    # 回滚最后一个 migration（暂不支持）
 *   npm run migrate status  # 查看已执行的 migration
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { config } = require('../src/config');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'db', 'migrations');

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function listApplied(conn) {
  const [rows] = await conn.query('SELECT name FROM schema_migrations ORDER BY name');
  return rows.map(function (r) { return r.name; });
}

async function listFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(function (f) { return /\.sql$/.test(f); })
    .sort();
}

async function up() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true
  });
  try {
    await ensureMigrationsTable(conn);
    const applied = await listApplied(conn);
    const files = await listFiles();
    const pending = files.filter(function (f) { return applied.indexOf(f) === -1; });
    if (!pending.length) {
      console.log('[migrate] no pending migrations');
      return;
    }
    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log('[migrate] applying', file);
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      console.log('[migrate] applied', file);
    }
    console.log('[migrate] done, applied', pending.length, 'migrations');
  } finally {
    await conn.end();
  }
}

async function status() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
  });
  try {
    await ensureMigrationsTable(conn);
    const applied = await listApplied(conn);
    const files = await listFiles();
    console.log('[migrate] status:');
    files.forEach(function (f) {
      console.log(' ', applied.indexOf(f) === -1 ? '[ ] ' + f : '[x] ' + f);
    });
  } finally {
    await conn.end();
  }
}

(async function main() {
  const cmd = process.argv[2] || 'up';
  try {
    if (cmd === 'up') await up();
    else if (cmd === 'status') await status();
    else {
      console.error('unknown command:', cmd);
      process.exit(1);
    }
  } catch (err) {
    console.error('[migrate] failed:', err.message);
    process.exit(1);
  }
})();
