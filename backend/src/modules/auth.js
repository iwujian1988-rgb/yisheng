const { fail, getBearerToken, getIp, ok, parseBody } = require('../http');
const { maskPhone } = require('../security/masking');
const { hashPassword, verifyPassword } = require('../security/password');
const { writeAudit } = require('../security/audit');
const { createId, nowIso } = require('../security/ids');
const { config } = require('../config');

const TEST_VERIFICATION_CODE = '123456';

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

  function normalizePhone(phone) {
    return String(phone || '').trim();
  }

  function isValidPhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  }

  function validatePhoneCode(phone, code, res) {
    if (!isValidPhone(phone)) {
      fail(res, 400, 'INVALID_PHONE', '请输入正确的手机号码');
      return false;
    }
    if (String(code || '').trim() !== TEST_VERIFICATION_CODE) {
      fail(res, 400, 'INVALID_VERIFICATION_CODE', '验证码错误，请重新输入');
      return false;
    }
    return true;
  }

  function findUserByWechat(identity) {
    if (!identity) return null;
    return store.users.find((item) => {
      return item.openid === identity.openid || (identity.unionid && item.unionid === identity.unionid);
    }) || null;
  }

  function createPhoneUser(phone, identity, body, now) {
    return {
      id: createId('user'),
      openid: identity ? identity.openid : '',
      unionid: identity ? identity.unionid || '' : '',
      phone: phone,
      nickname: (body.userInfo && body.userInfo.nickName) || '',
      passwordHash: body.password ? hashPassword(String(body.password)) : '',
      status: 'active',
      memberStatus: 'none',
      memberStart: '',
      memberEnd: '',
      disabledAt: '',
      disabledReason: '',
      lastLogin: '',
      registerSource: 'phone',
      features: {},
      createdAt: now,
      updatedAt: now
    };
  }

  function issueUserSession(user) {
    var actor = {
      kind: 'user',
      id: user.id,
      openid: user.openid
    };
    var token = sessions.issueSession(actor);
    return buildUserSession(user, token);
  }

  function bindWechatIdentity(user, identity, body, res) {
    if (!identity) return true;
    var boundUser = findUserByWechat(identity);
    if (boundUser && boundUser.id !== user.id) {
      fail(res, 409, 'WECHAT_ALREADY_BOUND', '当前微信已绑定其他手机号，请使用原手机号登录或联系客服处理');
      return false;
    }
    if (user.openid && user.openid !== identity.openid) {
      fail(res, 409, 'PHONE_BOUND_TO_OTHER_WECHAT', '该手机号已绑定其他微信账号，请使用原微信登录或联系客服解绑');
      return false;
    }
    if (!user.openid) user.openid = identity.openid;
    if (!user.unionid && identity.unionid) user.unionid = identity.unionid;
    if (body.userInfo && body.userInfo.nickName && !user.nickname) {
      user.nickname = body.userInfo.nickName;
    }
    return true;
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
    var user = findUserByWechat(wxIdentity);
    var now = nowIso();
    if (!user) {
      fail(res, 404, 'WECHAT_NOT_BOUND', '微信未绑定账号，请用手机号验证码登录');
      return;
    }
    if (body.userInfo && body.userInfo.nickName && !user.nickname) {
      user.nickname = body.userInfo.nickName;
    }
    user.lastLogin = now;
    user.updatedAt = now;

    ok(res, issueUserSession(user));
  }

  async function requestRegisterCode(req, res) {
    var body = await parseBody(req);
    var phone = normalizePhone(body.phone);
    if (!isValidPhone(phone)) {
      fail(res, 400, 'INVALID_PHONE', '请输入正确的手机号码');
      return;
    }
    ok(res, {
      phone: maskPhone(phone),
      verificationCode: TEST_VERIFICATION_CODE,
      expiresIn: 300
    });
  }

  async function phoneCodeLogin(req, res) {
    var body = await parseBody(req);
    var phone = normalizePhone(body.phone || body.account);
    var code = String(body.code || body.verificationCode || '').trim();
    if (!validatePhoneCode(phone, code, res)) return;

    var wxIdentity = null;
    var wechatCode = String(body.wechatCode || '').trim();
    if (wechatCode) {
      try {
        wxIdentity = await exchangeWechatCode(wechatCode);
      } catch (error) {
        console.error('[auth] wechat code exchange failed:', error.message);
        fail(res, 502, 'WECHAT_LOGIN_FAILED', error.message || '微信登录失败');
        return;
      }
    }

    var now = nowIso();
    var user = store.users.find((item) => item.phone === phone);
    if (!user) {
      user = createPhoneUser(phone, wxIdentity, body, now);
      store.users.push(user);
    } else {
      if (!bindWechatIdentity(user, wxIdentity, body, res)) return;
      if (body.password && !user.passwordHash) {
        user.passwordHash = hashPassword(String(body.password));
      }
    }

    user.lastLogin = now;
    user.updatedAt = now;
    ok(res, issueUserSession(user));
  }

  async function login(req, res) {
    var body = await parseBody(req);
    if (body.phone || body.code || body.verificationCode) {
      req.__body = body;
      return phoneCodeLoginWithBody(body, res);
    }

    var account = String(body.account || '').trim();
    var password = String(body.password || '');
    var user = store.users.find((item) => item.phone === account);
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      fail(res, 401, 'INVALID_CREDENTIALS', '账号或密码错误');
      return;
    }
    user.lastLogin = nowIso();
    user.updatedAt = user.lastLogin;
    ok(res, issueUserSession(user));
  }

  async function phoneCodeLoginWithBody(body, res) {
    var phone = normalizePhone(body.phone || body.account);
    var code = String(body.code || body.verificationCode || '').trim();
    if (!validatePhoneCode(phone, code, res)) return;

    var wxIdentity = null;
    var wechatCode = String(body.wechatCode || '').trim();
    if (wechatCode) {
      try {
        wxIdentity = await exchangeWechatCode(wechatCode);
      } catch (error) {
        console.error('[auth] wechat code exchange failed:', error.message);
        fail(res, 502, 'WECHAT_LOGIN_FAILED', error.message || '微信登录失败');
        return;
      }
    }

    var now = nowIso();
    var user = store.users.find((item) => item.phone === phone);
    if (!user) {
      user = createPhoneUser(phone, wxIdentity, body, now);
      store.users.push(user);
    } else {
      if (!bindWechatIdentity(user, wxIdentity, body, res)) return;
      if (body.password && !user.passwordHash) {
        user.passwordHash = hashPassword(String(body.password));
      }
    }

    user.lastLogin = now;
    user.updatedAt = now;
    ok(res, issueUserSession(user));
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
    login,
    me,
    phoneCodeLogin,
    requireAdmin,
    requireUser,
    requestRegisterCode,
    wechatLogin
  };
}

module.exports = {
  createAuthModule,
  publicDevice,
  publicUser
};
