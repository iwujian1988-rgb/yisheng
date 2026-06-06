const DEFAULT_PORT = 8080;

function readBoolean(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

const config = {
  port: Number(process.env.PORT || DEFAULT_PORT),
  env: process.env.NODE_ENV || 'development',
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 7200),
  enableDevSeed: readBoolean(process.env.ENABLE_DEV_SEED, true),
  adminAccount: process.env.ADMIN_ACCOUNT || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
  storeMode: process.env.STORE_MODE || 'file',
  storeFile: process.env.STORE_FILE || 'backend/data/store.json',
  ocrEngine: process.env.OCR_ENGINE || 'paddleocr',
  ocrWorkerUrl: process.env.OCR_WORKER_URL || '',
  asrEngine: process.env.ASR_ENGINE || 'faster-whisper',
  asrWorkerUrl: process.env.ASR_WORKER_URL || '',
  aiProvider: process.env.AI_PROVIDER || 'openai-compatible',
  aiBaseUrl: process.env.AI_BASE_URL || '',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'default-chat-model',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 30000),
  wechatAppId: process.env.WECHAT_APP_ID || '',
  wechatAppSecret: process.env.WECHAT_APP_SECRET || ''
};

module.exports = {
  config
};
