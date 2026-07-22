const DEFAULT_PORT = 8080;
const STORAGE_KEY = 'apiBaseUrlOverride';

function getAppGlobalData() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData) || {};
}

function isDevtoolsEnvironment() {
  try {
    const info = wx.getSystemInfoSync();
    return info.platform === 'devtools';
  } catch (error) {
    return false;
  }
}

function buildUrl(host, port) {
  return 'http://' + host + ':' + (port || DEFAULT_PORT);
}

function isHttps(url) {
  return /^https:\/\//i.test(String(url || ''));
}

function usesLocalhost(url) {
  return /localhost|127\.0\.0\.1/.test(String(url || ''));
}

function resolveApiBaseUrl() {
  const override = wx.getStorageSync(STORAGE_KEY);
  if (override) return override;

  const gd = getAppGlobalData();
  const configured = gd.baseUrl || '';
  if (!configured) return '';

  // 生产域名（https）直接使用，不做局域网替换
  if (isHttps(configured) && !usesLocalhost(configured)) {
    return configured;
  }

  if (isDevtoolsEnvironment() || !usesLocalhost(configured)) {
    return configured;
  }

  const lanHost = gd.lanBaseHost || '';
  if (!lanHost) {
    return configured;
  }

  const portMatch = String(configured).match(/:(\d+)/);
  const port = portMatch ? Number(portMatch[1]) : (gd.apiPort || DEFAULT_PORT);
  return buildUrl(lanHost, port);
}

function applyResolvedBaseUrl() {
  const resolved = resolveApiBaseUrl();
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.resolvedBaseUrl = resolved;
  }
  return resolved;
}

function getNetworkHint(baseUrl) {
  if (!isDevtoolsEnvironment() && usesLocalhost(getAppGlobalData().baseUrl || '')) {
    const lanHost = getAppGlobalData().lanBaseHost || '';
    if (!lanHost) {
      return '真机无法访问 127.0.0.1，请在 app.js 设置 globalData.lanBaseHost 为电脑局域网 IP';
    }
    return '真机请求失败，请确认手机与电脑同一 WiFi，且后端已启动（当前地址：' + (baseUrl || '') + '）';
  }
  return '网络请求失败，请检查后端地址和网络连接（' + (baseUrl || '') + '）';
}

module.exports = {
  STORAGE_KEY,
  applyResolvedBaseUrl,
  resolveApiBaseUrl,
  isDevtoolsEnvironment,
  usesLocalhost,
  getNetworkHint
};
