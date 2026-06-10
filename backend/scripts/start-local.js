const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index <= 0) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFile(path.resolve(__dirname, '..', '.env.local'));

const { config } = require('../src/config');
const { server } = require('../src/server');

server.listen(config.port, () => {
  console.log('Yisheng backend listening on :' + config.port);
});
