const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CONFIG = readJson('project.config.json');
const ignored = (CONFIG.packOptions && CONFIG.packOptions.ignore) || [];
const ignoredFolders = ignored
  .filter((entry) => entry.type === 'folder')
  .map((entry) => normalize(entry.value));
const ignoredFiles = new Set(ignored
  .filter((entry) => entry.type === 'file')
  .map((entry) => normalize(entry.value)));

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

function relative(filePath) {
  return normalize(path.relative(ROOT, filePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

function isIgnored(relativePath) {
  const value = normalize(relativePath);
  if (ignoredFiles.has(value)) return true;
  return ignoredFolders.some((folder) => value === folder || value.startsWith(folder + '/'));
}

function resolveComponent(ownerJsonPath, componentPath) {
  if (!componentPath || /^(plugin|ext):\/\//.test(componentPath)) return null;
  let base;
  if (componentPath.startsWith('/')) {
    base = path.join(ROOT, componentPath.slice(1));
  } else if (componentPath.startsWith('.')) {
    base = path.resolve(path.dirname(ownerJsonPath), componentPath);
  } else {
    base = path.join(ROOT, 'miniprogram_npm', componentPath);
  }
  return base.replace(/\.json$/i, '');
}

function assertComponent(basePath, ownerJsonPath, alias) {
  const componentRelative = relative(basePath);
  if (isIgnored(componentRelative)) {
    throw new Error(`${relative(ownerJsonPath)} uses ignored component ${alias}: ${componentRelative}`);
  }
  ['.json', '.js', '.wxml'].forEach((extension) => {
    const filePath = basePath + extension;
    if (!fs.existsSync(filePath)) {
      throw new Error(`${relative(ownerJsonPath)} cannot resolve ${alias}: ${relative(filePath)}`);
    }
  });
}

const visitedComponents = new Set();

function visitUsingComponents(ownerJsonPath) {
  const config = JSON.parse(fs.readFileSync(ownerJsonPath, 'utf8').replace(/^\uFEFF/, ''));
  const components = config.usingComponents || {};
  Object.entries(components).forEach(([alias, componentPath]) => {
    const basePath = resolveComponent(ownerJsonPath, componentPath);
    if (!basePath) return;
    assertComponent(basePath, ownerJsonPath, alias);
    const componentJsonPath = basePath + '.json';
    const key = path.normalize(componentJsonPath).toLowerCase();
    if (visitedComponents.has(key)) return;
    visitedComponents.add(key);
    visitUsingComponents(componentJsonPath);
  });
}

function collectPageJsonPaths() {
  const app = readJson('app.json');
  const pages = (app.pages || []).slice();
  (app.subPackages || app.subpackages || []).forEach((subpackage) => {
    (subpackage.pages || []).forEach((page) => pages.push(normalize(subpackage.root) + '/' + page));
  });
  return pages.map((page) => path.join(ROOT, page + '.json'));
}

function walkProjectWxml(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const filePath = path.join(directory, entry.name);
    const fileRelative = relative(filePath);
    if (isIgnored(fileRelative) || fileRelative.startsWith('miniprogram_npm/')) return;
    if (entry.isDirectory()) {
      walkProjectWxml(filePath);
      return;
    }
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.wxml') return;
    const source = fs.readFileSync(filePath, 'utf8');
    const invalidElseFor = /<[^>]*\bwx:else\b[^>]*\bwx:for\b[^>]*>|<[^>]*\bwx:for\b[^>]*\bwx:else\b[^>]*>/;
    if (invalidElseFor.test(source)) {
      throw new Error(`${fileRelative} combines wx:else and wx:for on one element`);
    }
  });
}

collectPageJsonPaths().forEach((pageJsonPath) => {
  if (!fs.existsSync(pageJsonPath)) throw new Error(`page config missing: ${relative(pageJsonPath)}`);
  if (isIgnored(relative(pageJsonPath))) throw new Error(`app.json includes ignored page: ${relative(pageJsonPath)}`);
  visitUsingComponents(pageJsonPath);
});
walkProjectWxml(ROOT);

console.log(`MINIPROGRAM_COMPONENT_GRAPH_OK pages=${collectPageJsonPaths().length} components=${visitedComponents.size}`);
