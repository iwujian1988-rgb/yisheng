const fs = require('fs');
const path = require('path');

// Load .env then .env.local from backend root (does not override existing env vars)
(function loadEnvFiles() {
  ['.env', '.env.local'].forEach(function (name) {
    var envPath = path.resolve(__dirname, '..', name);
    if (!fs.existsSync(envPath)) return;
    var lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      var index = trimmed.indexOf('=');
      if (index <= 0) return;
      var key = trimmed.slice(0, index).trim();
      var value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  });
})();

const DEFAULT_PORT = 8080;
const AI_MODEL_ALIASES = {
  'default-chat-model': 'deepseek-v3'
};

function readBoolean(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

function resolveAiModel(model) {
  var name = model || 'default-chat-model';
  return AI_MODEL_ALIASES[name] || name;
}

function defaultAiBaseUrl() {
  if (process.env.AI_BASE_URL || process.env.AI_CHAT_COMPLETIONS_URL) return '';
  if (process.env.DASHSCOPE_API_KEY || process.env.AI_API_KEY) {
    return 'https://dashscope.aliyuncs.com/compatible-mode';
  }
  return '';
}

const config = {
  port: Number(process.env.PORT || DEFAULT_PORT),
  env: process.env.NODE_ENV || 'development',
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 7200),
  enableDevSeed: readBoolean(process.env.ENABLE_DEV_SEED, true),
  adminAccount: process.env.ADMIN_ACCOUNT || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
  storeMode: process.env.STORE_MODE || 'file',
  storeFile: process.env.STORE_FILE || 'data/store.json',
  allowFileStoreInProduction: readBoolean(process.env.ALLOW_FILE_STORE_IN_PRODUCTION, false),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'yisheng',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'yisheng',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    charset: process.env.DB_CHARSET || 'utf8mb4'
  },
  allowUnknownDeviceBinding: readBoolean(
    process.env.ALLOW_UNKNOWN_DEVICE_BINDING,
    (process.env.NODE_ENV || 'development') !== 'production'
  ),
  autoRegisterBleDevices: readBoolean(process.env.AUTO_REGISTER_BLE_DEVICES, false),
  ocrEngine: process.env.OCR_ENGINE || 'paddleocr',
  ocrWorkerUrl: process.env.OCR_WORKER_URL || '',
  ocrTimeoutMs: Number(process.env.OCR_TIMEOUT_MS || 30000),
  ocrMaxImageBytes: Number(process.env.OCR_MAX_IMAGE_BYTES || 5 * 1024 * 1024),
  ocrCloudModel: process.env.OCR_CLOUD_MODEL || 'qwen-vl-ocr-2025-11-20',
  ocrCloudTask: process.env.OCR_CLOUD_TASK || 'text_recognition',
  ocrCloudBaseUrl: process.env.OCR_CLOUD_BASE_URL || process.env.DASHSCOPE_BASE_URL || process.env.ASR_CLOUD_BASE_URL || 'https://dashscope.aliyuncs.com',
  ocrCloudEnabled: readBoolean(process.env.OCR_CLOUD_ENABLED, true),
  dashscopeApiKey: process.env.AI_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.ASR_CLOUD_API_KEY || '',
  asrEngine: process.env.ASR_ENGINE || 'faster-whisper',
  asrWorkerUrl: process.env.ASR_WORKER_URL || '',
  asrTimeoutMs: Number(process.env.ASR_TIMEOUT_MS || 10 * 60 * 1000),
  asrMaxAudioBytes: Number(process.env.ASR_MAX_AUDIO_BYTES || 60 * 1024 * 1024),
  asrCloudApiKey: process.env.ASR_CLOUD_API_KEY || process.env.AI_API_KEY || process.env.DASHSCOPE_API_KEY || '',
  asrCloudBaseUrl: process.env.ASR_CLOUD_BASE_URL || process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com',
  asrCloudModel: process.env.ASR_CLOUD_MODEL || 'qwen3-asr-flash',
  aiProvider: process.env.AI_PROVIDER || 'openai-compatible',
  aiBaseUrl: process.env.AI_BASE_URL || defaultAiBaseUrl(),
  aiChatCompletionsUrl: process.env.AI_CHAT_COMPLETIONS_URL || '',
  aiApiKey: process.env.AI_API_KEY || process.env.DASHSCOPE_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'default-chat-model',
  aiResolvedModel: resolveAiModel(process.env.AI_MODEL || 'default-chat-model'),
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 30000),
  wechatAppId: process.env.WECHAT_APP_ID || '',
  wechatAppSecret: process.env.WECHAT_APP_SECRET || '',
  orderEntitlementHashSecret: process.env.ORDER_ENTITLEMENT_HASH_SECRET || '',
  agentServiceEnabled: readBoolean(
    process.env.AGENT_SERVICE_ENABLED,
    (process.env.NODE_ENV || 'development') !== 'production'
  ),
  agentServiceUrl: process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000',
  agentServiceApiKey: process.env.AGENT_SERVICE_API_KEY || 'dev-agent-key',
  agentServiceTimeout: Number(process.env.AGENT_SERVICE_TIMEOUT || 120000)
};

if (config.env === 'production') {
  var productionConfigErrors = [];
  if (!process.env.ADMIN_PASSWORD || /change\s*me/i.test(process.env.ADMIN_PASSWORD)) {
    productionConfigErrors.push('ADMIN_PASSWORD must be set to a non-default value');
  }
  if (!config.orderEntitlementHashSecret || config.orderEntitlementHashSecret.length < 32) {
    productionConfigErrors.push('ORDER_ENTITLEMENT_HASH_SECRET must contain at least 32 characters');
  }
  if (!config.wechatAppId || !config.wechatAppSecret) {
    productionConfigErrors.push('WECHAT_APP_ID and WECHAT_APP_SECRET are required');
  }
  if (!config.aiApiKey) {
    productionConfigErrors.push('AI_API_KEY or DASHSCOPE_API_KEY is required');
  }
  if (productionConfigErrors.length) {
    throw new Error('Invalid production configuration: ' + productionConfigErrors.join('; '));
  }
}

module.exports = {
  config,
  resolveAiModel
};
