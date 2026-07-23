const https = require('https');
const { config } = require('../config');

let cachedAccessToken = '';
let cachedAccessTokenExpireAt = 0;
let tokenFetching = null;

const FILTERED_HINT = '[内容包含敏感信息，已过滤]';

function getAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessTokenExpireAt > now + 60000) {
    return Promise.resolve(cachedAccessToken);
  }
  if (tokenFetching) return tokenFetching;

  tokenFetching = new Promise((resolve, reject) => {
    const appid = config.wechatAppId;
    const secret = config.wechatAppSecret;
    if (!appid || !secret) {
      reject(new Error('WECHAT_APP_ID/SECRET_NOT_CONFIGURED'));
      return;
    }
    const path = '/cgi-bin/token?grant_type=client_credential&appid=' + encodeURIComponent(appid) + '&secret=' + encodeURIComponent(secret);
    const req = https.request({
      hostname: 'api.weixin.qq.com',
      path: path,
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.access_token) {
            cachedAccessToken = data.access_token;
            cachedAccessTokenExpireAt = now + (Number(data.expires_in || 7200) - 300) * 1000;
            resolve(cachedAccessToken);
          } else {
            reject(new Error('WECHAT_TOKEN_FAILED: ' + (data.errmsg || '')));
          }
        } catch (e) {
          reject(new Error('WECHAT_TOKEN_PARSE_FAILED'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('WECHAT_TOKEN_TIMEOUT')); });
    req.end();
  });

  tokenFetching.finally(() => { tokenFetching = null; });
  return tokenFetching;
}

function callMsgSecCheck(accessToken, text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      content: String(text || '').slice(0, 2500),
      version: 2,
      scene: 1
    });
    const req = https.request({
      hostname: 'api.weixin.qq.com',
      path: '/wxa/msg_sec_check?access_token=' + encodeURIComponent(accessToken),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch (e) {
          reject(new Error('WECHAT_CHECK_PARSE_FAILED'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('WECHAT_CHECK_TIMEOUT')); });
    req.write(payload);
    req.end();
  });
}

async function sanitizeText(text) {
  const raw = String(text || '');
  if (!raw.trim()) return raw;

  if (!config.wechatAppId || !config.wechatAppSecret) {
    return raw;
  }

  try {
    const token = await getAccessToken();
    const result = await callMsgSecCheck(token, raw);
    if (result && result.errcode === 0) {
      const detail = (result.detail) || [];
      const hit = detail.find((item) =>
        item && item.label !== 100 && item.label !== 1 && typeof item.label === 'number'
      );
      if (hit) {
        return FILTERED_HINT;
      }
    }
    return raw;
  } catch (e) {
    return raw;
  }
}

async function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const next = {};
  const keys = ['resultText', 'bodyText', 'confirmText', 'text', 'content', 'summary', 'document'];
  for (const key of Object.keys(obj)) {
    if (keys.indexOf(key) !== -1 && typeof obj[key] === 'string') {
      next[key] = await sanitizeText(obj[key]);
    } else {
      next[key] = obj[key];
    }
  }
  return next;
}

module.exports = {
  sanitizeText,
  sanitizeObject,
  FILTERED_HINT
};
