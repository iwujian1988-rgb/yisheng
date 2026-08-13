const apiClient = require('../api/client');
const apiBase = require('../config/api-base');
const deviceSession = require('../device/session');
const liveHeartbeat = require('../device/live-heartbeat');
const { ENDPOINTS } = require('../api/endpoints');

function getToken() {
  return wx.getStorageSync('token') || '';
}

function getLiveProof() {
  try {
    return wx.getStorageSync('deviceLiveProof') || '';
  } catch (error) {
    return '';
  }
}

function getBaseUrl() {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData && app.globalData.resolvedBaseUrl) {
    return app.globalData.resolvedBaseUrl;
  }
  return apiBase.resolveApiBaseUrl();
}

function decodeChunk(buffer) {
  if (!buffer) return '';
  if (typeof buffer === 'string') return buffer;
  try {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(buffer);
    }
  } catch (error) {
    // fall through
  }
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < bytes.length; i += 1) {
    result += String.fromCharCode(bytes[i]);
  }
  try {
    return decodeURIComponent(escape(result));
  } catch (decodeError) {
    return result;
  }
}

function parseSseEvents(buffer) {
  const events = [];
  let remainder = buffer || '';
  let splitIndex = remainder.indexOf('\n\n');
  while (splitIndex >= 0) {
    const block = remainder.slice(0, splitIndex);
    remainder = remainder.slice(splitIndex + 2);
    const lines = block.split('\n');
    let eventName = 'message';
    const dataLines = [];
    lines.forEach((line) => {
      if (line.indexOf('event:') === 0) {
        eventName = line.slice(6).trim();
      } else if (line.indexOf('data:') === 0) {
        dataLines.push(line.slice(5).trim());
      }
    });
    if (dataLines.length) {
      events.push({
        event: eventName,
        data: dataLines.join('\n')
      });
    }
    splitIndex = remainder.indexOf('\n\n');
  }
  return { events: events, remainder: remainder };
}

function sendChat(options) {
  return apiClient.request({
    url: ENDPOINTS.agent.chat,
    method: 'POST',
    timeout: 120000,
    data: {
      message: options.message || '',
      attachments: options.attachments || [],
      messages: options.messages || [],
      templateId: options.templateId || '',
      templateType: options.templateType || '',
      mode: options.mode || ''
    }
  });
}

function sendChatStream(options, handlers) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return Promise.reject({
      code: 'API_BASE_URL_NOT_CONFIGURED',
      message: apiClient.friendlyMessage('API_BASE_URL_NOT_CONFIGURED')
    });
  }

  const token = getToken();
  const deviceToken = deviceSession.getDeviceSessionToken();
  let buffer = '';
  let settled = false;
  let aborted = false;
  let requestTask = null;

  function startRequest() {
    if (aborted) return;
    const liveProof = getLiveProof();
    requestTask = wx.request({
    url: baseUrl + ENDPOINTS.agent.chatStream,
    method: 'POST',
    enableChunked: true,
    responseType: 'arraybuffer',
    timeout: options.timeout || 120000,
    data: {
      message: options.message || '',
      attachments: options.attachments || [],
      messages: options.messages || [],
      templateId: options.templateId || '',
      templateType: options.templateType || '',
      mode: options.mode || ''
    },
    header: Object.assign({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: token ? 'Bearer ' + token : ''
    }, deviceToken ? { 'X-Device-Session': deviceToken } : {}, liveProof ? { 'X-Device-Live': liveProof } : {}),
    success(res) {
      if (settled) return;
      if (buffer) {
        const parsed = parseSseEvents(buffer + '\n\n');
        parsed.events.forEach(dispatchEvent);
        buffer = parsed.remainder;
      }
      if (res.statusCode >= 200 && res.statusCode < 300) {
        settled = true;
        if (handlers.onComplete) handlers.onComplete();
        return;
      }
      settled = true;
      let body = res.data || {};
      if (body instanceof ArrayBuffer) {
        try {
          body = JSON.parse(decodeChunk(body));
        } catch (error) {
          body = {};
        }
      }
      const message = apiClient.friendlyMessage(body.code, body.message || '请求失败');
      if (handlers.onError) {
        handlers.onError({ code: body.code || 'HTTP_ERROR', message: message, statusCode: res.statusCode });
      }
    },
    fail(err) {
      if (settled) return;
      settled = true;
      if (handlers.onError) {
        handlers.onError({
          code: 'NETWORK_ERROR',
          message: apiBase.getNetworkHint(baseUrl),
          raw: err
        });
      }
    }
    });

    if (requestTask && typeof requestTask.onChunkReceived === 'function') {
      requestTask.onChunkReceived((res) => {
        buffer += decodeChunk(res.data);
        const parsed = parseSseEvents(buffer);
        buffer = parsed.remainder;
        parsed.events.forEach(dispatchEvent);
      });
    }
  }

  function dispatchEvent(evt) {
    let payload = {};
    try {
      payload = evt.data ? JSON.parse(evt.data) : {};
    } catch (error) {
      payload = { message: evt.data || '' };
    }
    if (evt.event === 'delta' && handlers.onDelta) {
      handlers.onDelta(payload);
    } else if (evt.event === 'status' && handlers.onStatus) {
      handlers.onStatus(payload);
    } else if (evt.event === 'done' && handlers.onDone) {
      settled = true;
      handlers.onDone(payload);
    } else if (evt.event === 'error' && handlers.onError) {
      settled = true;
      handlers.onError(payload);
    }
  }

  if (deviceToken && !getLiveProof()) {
    liveHeartbeat.tick().then(startRequest, startRequest);
  } else {
    startRequest();
  }

  return {
    abort: function () {
      aborted = true;
      if (requestTask && typeof requestTask.abort === 'function') {
        requestTask.abort();
      }
    }
  };
}

module.exports = {
  sendChat,
  sendChatStream
};
