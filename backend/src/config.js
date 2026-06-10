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
  allowFileStoreInProduction: readBoolean(process.env.ALLOW_FILE_STORE_IN_PRODUCTION, false),
  allowUnknownDeviceBinding: readBoolean(
    process.env.ALLOW_UNKNOWN_DEVICE_BINDING,
    (process.env.NODE_ENV || 'development') !== 'production'
  ),
  ocrEngine: process.env.OCR_ENGINE || 'paddleocr',
  ocrWorkerUrl: process.env.OCR_WORKER_URL || '',
  ocrTimeoutMs: Number(process.env.OCR_TIMEOUT_MS || 30000),
  ocrMaxImageBytes: Number(process.env.OCR_MAX_IMAGE_BYTES || 5 * 1024 * 1024),
  asrEngine: process.env.ASR_ENGINE || 'faster-whisper',
  asrWorkerUrl: process.env.ASR_WORKER_URL || '',
  asrTimeoutMs: Number(process.env.ASR_TIMEOUT_MS || 10 * 60 * 1000),
  asrMaxAudioBytes: Number(process.env.ASR_MAX_AUDIO_BYTES || 60 * 1024 * 1024),
  aiProvider: process.env.AI_PROVIDER || 'openai-compatible',
  aiBaseUrl: process.env.AI_BASE_URL || '',
  aiChatCompletionsUrl: process.env.AI_CHAT_COMPLETIONS_URL || '',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'default-chat-model',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 30000),
  wechatAppId: process.env.WECHAT_APP_ID || '',
  wechatAppSecret: process.env.WECHAT_APP_SECRET || ''
};

module.exports = {
  config
};
