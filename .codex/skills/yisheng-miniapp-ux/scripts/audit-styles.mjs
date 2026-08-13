import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoots = ['app.wxss', 'custom-tab-bar', 'pages'];
const textExtensions = new Set(['.wxss', '.wxml', '.json']);
const legacyColors = /#(?:1677ff|1890ff|0052d9|1989fa|409eff)\b/gi;
const pxUnit = /(^|[^r\w-])\d+(?:\.\d+)?px\b/g;
const errors = [];

function visit(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) visit(path.join(target, entry));
    return;
  }

  if (!textExtensions.has(path.extname(target))) return;
  const source = fs.readFileSync(target, 'utf8');
  const relative = path.relative(root, target).replaceAll('\\', '/');

  if (legacyColors.test(source)) errors.push(`${relative}: contains a legacy primary color`);
  legacyColors.lastIndex = 0;

  if (path.extname(target) === '.wxss') {
    if (pxUnit.test(source)) errors.push(`${relative}: contains px; use rpx`);
    pxUnit.lastIndex = 0;
    const opens = (source.match(/{/g) || []).length;
    const closes = (source.match(/}/g) || []).length;
    if (opens !== closes) errors.push(`${relative}: unbalanced braces (${opens}/${closes})`);
  }

  if (path.extname(target) === '.json') {
    try {
      JSON.parse(source.replace(/^\uFEFF/, ''));
    } catch (error) {
      errors.push(`${relative}: invalid JSON (${error.message})`);
    }
  }
}

for (const item of scanRoots) visit(path.join(root, item));

if (errors.length) {
  console.error(`UX audit failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('UX audit passed: palette, units, braces, and JSON are consistent.');
