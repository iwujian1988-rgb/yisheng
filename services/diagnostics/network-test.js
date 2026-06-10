const { getBaseUrl, request } = require('../api/client');

function item(key, name, status, message) {
  return {
    key,
    name,
    status,
    statusText: status === 'pass' ? '通过' : status === 'fail' ? '失败' : '提醒',
    message
  };
}

function runNetworkDiagnostics() {
  const baseUrl = getBaseUrl();
  const token = wx.getStorageSync('token') || '';
  const results = [];

  if (!baseUrl) {
    return Promise.resolve([
      item('base_url', '后端地址', 'fail', 'app.js globalData.baseUrl 尚未配置，当前只能使用本地演示模式'),
      item('login_token', '登录状态', token ? 'pass' : 'warn', token ? '本地已有登录 token' : '未检测到登录 token')
    ]);
  }

  results.push(item('base_url', '后端地址', 'pass', baseUrl));
  results.push(item('login_token', '登录状态', token ? 'pass' : 'warn', token ? '本地已有登录 token' : '未检测到登录 token'));

  return request({
    url: '/api/health',
    method: 'GET'
  }).then((health) => {
    results.push(item('backend_health', '后端健康检查', 'pass', health.service + ' / ' + health.env));
    results.push(item('store_mode', '存储模式', health.storeMode === 'file' && health.env === 'production' ? 'fail' : 'pass', health.storeMode || 'unknown'));
    results.push(item('device_policy', '设备绑定策略', health.allowUnknownDeviceBinding ? 'warn' : 'pass', health.allowUnknownDeviceBinding ? '允许未知设备绑定' : '未知设备必须先预置'));
    results.push(item('ocr_provider', 'OCR 网关', health.ocrConfigured ? 'pass' : 'warn', health.ocrConfigured ? health.ocrEngine : '未配置 OCR worker'));
    results.push(item('asr_provider', 'ASR 网关', health.asrConfigured ? 'pass' : 'warn', health.asrConfigured ? health.asrEngine : '未配置 ASR worker'));
    results.push(item('ai_provider', 'AI 网关', health.aiConfigured ? 'pass' : 'warn', health.aiConfigured ? health.aiProvider : '未配置 AI provider'));
    return results;
  }).catch((error) => {
    results.push(item('backend_health', '后端健康检查', 'fail', error.message || '后端不可达'));
    return results;
  });
}

module.exports = {
  runNetworkDiagnostics
};
