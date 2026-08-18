const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const project = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const ignored = (project.packOptions && project.packOptions.ignore || []).map((item) => String(item.value || '').replace(/\\/g, '/'));
const subpackages = (app.subPackages || []).map((item) => String(item.root || '').replace(/\\/g, '/'));

function isUnder(relativePath, roots) {
  return roots.some((entry) => relativePath === entry || relativePath.startsWith(entry + '/'));
}

let mainBytes = 0;
let totalBytes = 0;
let fileCount = 0;

function walk(folder) {
  fs.readdirSync(folder, { withFileTypes: true }).forEach((entry) => {
    const absolute = path.join(folder, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    if (isUnder(relative, ignored)) return;
    if (entry.isDirectory()) return walk(absolute);
    const bytes = fs.statSync(absolute).size;
    fileCount += 1;
    totalBytes += bytes;
    if (!isUnder(relative, subpackages)) mainBytes += bytes;
  });
}

walk(root);
if (!ignored.includes('.tmp')) throw new Error('local quality artifacts are not excluded from the mini program package');
// Keep raw source below 1.9 MiB so the compiler-minified upload has explicit
// safety margin below WeChat's 2 MiB main-package limit.
const rawMainLimit = 1900 * 1024;
if (mainBytes > rawMainLimit) {
  throw new Error('raw main package is too large: ' + Math.ceil(mainBytes / 1024) + ' KiB > 1900 KiB');
}
console.log('MINIPROGRAM_PACKAGE_SIZE_OK files=' + fileCount + ' rawMainKiB=' + (mainBytes / 1024).toFixed(1) + ' rawTotalKiB=' + (totalBytes / 1024).toFixed(1));
