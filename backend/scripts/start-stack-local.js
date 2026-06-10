const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const logsDir = path.join(root, 'logs');
fs.mkdirSync(logsDir, { recursive: true });

function openLog(name, stream) {
  return fs.openSync(path.join(logsDir, name + '.' + stream + '.log'), 'a');
}

function start(name, args) {
  const out = openLog(name, 'out');
  const err = openLog(name, 'err');
  const child = spawn(process.execPath, args, {
    cwd: root,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true
  });
  child.unref();
  console.log(name + ' pid=' + child.pid);
}

start('ocr-worker', ['scripts/start-worker-local.js', 'ocr']);
start('asr-worker', ['scripts/start-worker-local.js', 'asr']);
start('api', ['scripts/start-local.js']);
