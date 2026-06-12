const { fail, getBearerToken, getIp, ok, parseBody } = require('../http');
const { maskPhone } = require('../security/masking');
const { verifyPassword } = require('../security/password');
const { writeAudit } = require('../security/audit');
const { createId, nowIso } = require('../security/ids');
const { config } = require('../config');

function publicUser(user) {
  return {
    id: user.id,
    phone: maskPhone(user.phone),
    nickname: user.nickname || '',
    hasPhone: Boolean(user.phone),
    status: user.status,
    memberStatus: user.memberStatus,
    memberEnd: user.memberEnd
  };
}

function publicDevice(device) {
  if (!device) return null;
  var next = Object.assign({}, device);
  delete next.proofCodeHash;
  next.hasProofCode = Boolean(device.proofCodeHash);
  return next;
}

function createAuthModule(deps) {
  var store = deps.store;
  var sessions = deps.sessions;

  function getBoundDevice(userId) {
    return store.devices.find((item) => item.boundUserId === userId && item.bindStatus === 'bound') || null;
  }

  function buildUserSession(user, token) {
    var device = getBoundDevice(user.id);
    return {
      token: token,
      user: publicUser(user),
      purchaseStatus: user.memberStatus === 'active' ? 'paid' : 'none',
      deviceBindingStatus: device ? 'bound' : 'not_bound',
      serviceStatus: user.memberStatus,
      device: publicDevice(device),
      features: user.features || {}
    };
  }

  function requireAdmin(req, res, roles) {
    var actor = sessions.resolveSession(getBearerToken(req));
    if (!actor || actor.kind !== 'admin') {
      fail(res, 401, 'ADMIN_AUTH_REQUIRED', 'admin login required');
      return null;
    }
    if (roles && roles.length && roles.indexOf(actor.role) === -1) {
      fail(res, 403, 'ADMIN_FORBIDDEN', 'admin role forbidden');
      return null;
    }
    return actor;
  }

  function requireUser(req, res) {
    var actor = sessions.resolveSession(getBearerToken(req));
    if (!actor || actor.kind !== 'user') {
      fail(res, 401, 'AUTH_REQUIRED', 'login required');
      return null;
    }
    return actor;
  }

  async function adminLogin(req, res) {
    var body = await parseBody(req);
    var account = String(body.account || '').trim();
    var admin = store.adminUsers.find((item) => item.account === account);
    if (admin && admin.lockedUntil && Date.now() < new Date(admin.lockedUntil).getTime()) {
      fail(res, 423, 'ADMIN_ACCOUNT_LOCKED', 'admin account locked');
      return;
    }
    if (!admin || admin.status !== 'active' || !verifyPassword(body.password || '', admin.passwordHash)) {
      if (admin) {
        admin.failedLoginCount = Number(admin.failedLoginCount || 0) + 1;
        if (admin.failedLoginCount >= 5) {
          admin.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }
        admin.updatedAt = new Date().toISOString();
      }
      fail(res, 401, 'INVALID_CREDENTIALS', 'invalid account or password');
      return;
    }
    admin.failedLoginCount = 0;
    admin.lockedUntil = '';
    admin.updatedAt = new Date().toISOString();
    var actor = {
      kind: 'admin',
      id: admin.id,
      account: admin.account,
      role: admin.role
    };
    var token = sessions.issueSession(actor);
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'admin_auth',
      actionType: 'login',
      targetId: admin.id
    });
    ok(res, {
      token: token,
      admin: {
        id: admin.id,
        account: admin.account,
        role: admin.role
      }
    });
  }

  async function exchangeWechatCode(code) {
    if (!config.wechatAppId || !config.wechatAppSecret) {
      console.log('[auth] dev mode: skipping wechat code exchange');
      return {
        openid: 'dev-openid-' + String(code || 'anonymous'),
        unionid: ''
      };
    }
    var url = 'https://api.weixin.qq.com/sns/jscode2session'
      + '?appid=' + encodeURIComponent(config.wechatAppId)
      + '&secret=' + encodeURIComponent(config.wechatAppSecret)
      + '&js_code=' + encodeURIComponent(code)
      + '&grant_type=authorization_code';
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 10000);
    var response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (fetchErr) {
      clearTimeout(timer);
      throw new Error('微信登录服务暂不可用，请检查网络后重试');
    }
    clearTimeout(timer);
    var payload = await response.json();
    if (!response.ok || payload.errcode) {
      throw new Error(payload.errmsg || 'wechat code exchange failed');
    }
    return {
      openid: payload.openid,
      unionid: payload.unionid || ''
    };
  }

  async function wechatLogin(req, res) {
    var body = await parseBody(req);
    var code = String(body.code || '').trim();
    if (!code) {
      fail(res, 400, 'WECHAT_CODE_REQUIRED', 'wechat code required');
      return;
    }
    var wxIdentity;
    try {
      wxIdentity = await exchangeWechatCode(code);
    } catch (error) {
      console.error('[auth] wechat code exchange failed:', error.message);
      fail(res, 502, 'WECHAT_LOGIN_FAILED', error.message || '微信登录失败');
      return;
    }
    var user = store.users.find((item) => {
      return item.openid === wxIdentity.openid || (wxIdentity.unionid && item.unionid === wxIdentity.unionid);
    });
    var now = nowIso();
    if (!user) {
      user = {
        id: createId('user'),
        openid: wxIdentity.openid,
        unionid: wxIdentity.unionid || '',
        phone: '',
        nickname: (body.userInfo && body.userInfo.nickName) || '',
        status: 'active',
        memberStatus: 'none',
        memberStart: '',
        memberEnd: '',
        disabledAt: '',
        disabledReason: '',
        lastLogin: '',
        registerSource: 'wechat',
        features: {},
        createdAt: now,
        updatedAt: now
      };
      store.users.push(user);
    }
    if (body.userInfo && body.userInfo.nickName && !user.nickname) {
      user.nickname = body.userInfo.nickName;
    }
    user.lastLogin = now;
    user.updatedAt = now;

    var actor = {
      kind: 'user',
      id: user.id,
      openid: user.openid
    };
    var token = sessions.issueSession(actor);
    ok(res, buildUserSession(user, token));
  }

  function me(req, res) {
    var actor = sessions.resolveSession(getBearerToken(req));
    if (!actor) {
      fail(res, 401, 'AUTH_REQUIRED', 'login required');
      return;
    }
    if (actor.kind === 'admin') {
      ok(res, actor);
      return;
    }
    var user = store.users.find((item) => item.id === actor.id);
    if (!user) {
      ok(res, null);
      return;
    }
    ok(res, buildUserSession(user, ''));
  }

  return {
    adminLogin,
    me,
    requireAdmin,
    requireUser,
    wechatLogin
  };
}

module.exports = {
  createAuthModule,
  publicDevice,
  publicUser
};
