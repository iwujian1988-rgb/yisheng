const DEFAULT_TRANSFER_SETTINGS = {
  speedMode: 'safe'
};

const SPEED_MODE_LABELS = {
  slow: '慢速',
  safe: '稳定',
  balanced: '均衡',
  turbo: '快速'
};

const VUC_DELAY_MS = {
  slow: 350,
  turbo: 50,
  balanced: 100,
  safe: 200
};

// 固件 VUC 七键之间间隔（与 SPD 标签联动；快速档为 0 表示 print 连打）
const VUC_KEY_DELAY_MS = {
  turbo: 12,
  balanced: 20,
  safe: 28,
  slow: 40
};

const VUC_PRE_SPACE_DELAY_MS = {
  turbo: 12,
  balanced: 20,
  safe: 28,
  slow: 40
};

const SPEED_TO_SPD = {
  turbo: 'SPD1',
  balanced: 'SPD2',
  safe: 'SPD3',
  slow: 'SPD4'
};

const ACK_TIMEOUT_MS = 10000;

const BASE_DELAYS = {
  vuc: 180,
  letter: 60,
  digit: 100,
  default: 40
};

function getTransferSettings() {
  const settings = wx.getStorageSync('transferSettings');
  if (settings && typeof settings === 'object') {
    return {
      speedMode: settings.speedMode || DEFAULT_TRANSFER_SETTINGS.speedMode
    };
  }
  return Object.assign({}, DEFAULT_TRANSFER_SETTINGS);
}

function isTransferSpeedLocked() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return Boolean(app && app.globalData && app.globalData.transferSending);
}

function saveTransferSettings(settings) {
  const current = getTransferSettings();
  if (isTransferSpeedLocked()) {
    return Object.assign({}, current, { locked: true });
  }
  const nextSettings = {
    speedMode: (settings && settings.speedMode) || current.speedMode || DEFAULT_TRANSFER_SETTINGS.speedMode
  };
  wx.setStorageSync('transferSettings', nextSettings);
  return nextSettings;
}

function getSpeedDelays(speedMode) {
  const vucMs = VUC_DELAY_MS[speedMode] || VUC_DELAY_MS.balanced;
  const ratio = vucMs / BASE_DELAYS.vuc;
  return {
    vuc: vucMs,
    letter: Math.round(BASE_DELAYS.letter * ratio),
    digit: Math.round(BASE_DELAYS.digit * ratio),
    default: Math.round(BASE_DELAYS.default * ratio)
  };
}

function getVucDelayMs(speedMode) {
  return VUC_DELAY_MS[speedMode] || VUC_DELAY_MS.balanced;
}

function getVucKeyDelayMs(speedMode) {
  return VUC_KEY_DELAY_MS[speedMode] !== undefined
    ? VUC_KEY_DELAY_MS[speedMode]
    : VUC_KEY_DELAY_MS.balanced;
}

function getVucPreSpaceDelayMs(speedMode) {
  return VUC_PRE_SPACE_DELAY_MS[speedMode] || VUC_PRE_SPACE_DELAY_MS.balanced;
}

function getSpdTag(speedMode) {
  return SPEED_TO_SPD[speedMode] || SPEED_TO_SPD.balanced;
}

function usesAckFlow(speedMode) {
  return true;
}

function getAckTimeoutMs() {
  return ACK_TIMEOUT_MS;
}

function getSpeedModeSummary(speedMode) {
  const mode = speedMode || getTransferSettings().speedMode;
  const label = SPEED_MODE_LABELS[mode] || SPEED_MODE_LABELS.balanced;
  const delayMs = getVucDelayMs(mode);
  const keyDelayMs = getVucKeyDelayMs(mode);
  return {
    speedMode: mode,
    label,
    delayMs,
    keyDelayMs,
    preSpaceMs: getVucPreSpaceDelayMs(mode),
    spdTag: getSpdTag(mode),
    text: '传输速度：' + label
  };
}

module.exports = {
  DEFAULT_TRANSFER_SETTINGS,
  SPEED_MODE_LABELS,
  VUC_DELAY_MS,
  VUC_KEY_DELAY_MS,
  VUC_PRE_SPACE_DELAY_MS,
  SPEED_TO_SPD,
  getTransferSettings,
  isTransferSpeedLocked,
  saveTransferSettings,
  getSpeedDelays,
  getVucDelayMs,
  getVucKeyDelayMs,
  getVucPreSpaceDelayMs,
  getSpdTag,
  usesAckFlow,
  getAckTimeoutMs,
  getSpeedModeSummary
};
