const deviceSession = require('./device-session');

const AUDIENCE_ACCESS_RULES = {
  general: {
    requireMember: false,
    requireDeviceSession: false,
    listWhenNoProfessionalAccess: true,
    capability: ''
  },
  professional: {
    requireMember: true,
    requireDeviceSession: true,
    allowConnectedBoundDeviceFallback: true,
    listWhenNoProfessionalAccess: false,
    capability: ''
  }
};

const BUSINESS_ACCESS_CONFIG = {
  templates: {
    audienceField: 'audience',
    statusField: 'status',
    publishedStatus: 'published',
    professionalCapability: 'professional_templates',
    listMode: 'visibleAudience'
  },
  quickActions: {
    audienceField: 'audience',
    statusField: 'status',
    publishedStatus: 'published',
    professionalCapability: 'professional_quick_actions',
    listMode: 'visibleAudience'
  },
  smartCreationTemplates: {
    audienceField: 'audience',
    statusField: 'status',
    publishedStatus: 'published',
    professionalCapability: 'professional_ai',
    listMode: 'visibleAudience'
  },
  aiAssistant: {
    audienceField: 'audience',
    statusField: 'status',
    publishedStatus: 'published',
    professionalCapability: 'professional_quick_actions',
    listMode: 'allAccessible'
  },
  aiMode: {
    professionalCapability: 'professional_ai'
  }
};

function getBusinessConfig(businessKey) {
  return Object.assign({}, BUSINESS_ACCESS_CONFIG[businessKey] || {});
}

function normalizeAudience(value) {
  return value === 'professional' ? 'professional' : 'general';
}

function isMemberActive(store, userId) {
  var user = (store.users || []).find((item) => item.id === userId);
  return Boolean(user && user.memberStatus === 'active');
}

function requestConnected(req) {
  try {
    var url = new URL(req && req.url ? req.url : '/', 'http://localhost');
    return url.searchParams.get('connected') === 'true';
  } catch (error) {
    return false;
  }
}

function hasBoundDevice(store, userId) {
  return Boolean((store.devices || []).find((item) => {
    return item.boundUserId === userId && item.bindStatus === 'bound';
  }));
}

function getAccessContext(options) {
  var opts = options || {};
  var config = getBusinessConfig(opts.businessKey);
  var actor = opts.actor || {};
  var userId = actor.id || opts.userId || '';
  var capability = opts.capability || config.professionalCapability || '';
  var memberActive = opts.memberActive !== undefined
    ? Boolean(opts.memberActive)
    : isMemberActive(opts.store, userId);
  var deviceAccess = capability && opts.req && userId
    ? deviceSession.resolveDeviceSession(opts.store, opts.req, userId, capability)
    : { ok: false, code: 'DEVICE_SESSION_REQUIRED', message: 'device session required' };
  var connected = requestConnected(opts.req);
  var boundDevice = hasBoundDevice(opts.store, userId);
  var connectedBoundDevice = Boolean(connected && boundDevice);

  return {
    businessKey: opts.businessKey || '',
    userId,
    memberActive,
    capability,
    connected,
    hasBoundDevice: boundDevice,
    hasConnectedBoundDevice: connectedBoundDevice,
    hasProfessionalAccess: Boolean(memberActive && (deviceAccess.ok || connectedBoundDevice)),
    deviceAccess
  };
}

function itemIsPublished(item, config) {
  var statusField = config.statusField || 'status';
  var publishedStatus = config.publishedStatus || 'published';
  return Boolean(item && item[statusField] === publishedStatus);
}

function canAccessAudience(audience, context, overrideRule) {
  var normalized = normalizeAudience(audience);
  var rule = Object.assign({}, AUDIENCE_ACCESS_RULES[normalized], overrideRule || {});
  var ctx = context || {};

  if (rule.requireMember && !ctx.memberActive) return false;
  if (rule.requireDeviceSession && !ctx.deviceAccess.ok) {
    if (!rule.allowConnectedBoundDeviceFallback || !ctx.hasConnectedBoundDevice) return false;
  }
  return true;
}

function canAccessItem(item, options) {
  var opts = options || {};
  var config = getBusinessConfig(opts.businessKey);
  var audienceField = config.audienceField || 'audience';
  var audience = normalizeAudience(item && item[audienceField]);
  var context = opts.context || getAccessContext(opts);

  if (!itemIsPublished(item, config)) return false;
  return canAccessAudience(audience, context, opts.rule);
}

function shouldShowInCurrentAudience(item, options) {
  var opts = options || {};
  var config = getBusinessConfig(opts.businessKey);
  var listMode = opts.listMode || config.listMode || 'allAccessible';
  var audienceField = config.audienceField || 'audience';
  var audience = normalizeAudience(item && item[audienceField]);
  var context = opts.context || getAccessContext(opts);

  if (!canAccessItem(item, Object.assign({}, opts, { context }))) return false;
  if (listMode !== 'visibleAudience') return true;
  return context.hasProfessionalAccess
    ? audience === 'professional'
    : audience === 'general';
}

function filterVisibleItems(items, options) {
  var list = Array.isArray(items) ? items : [];
  var context = (options && options.context) || getAccessContext(options || {});
  return list.filter((item) => shouldShowInCurrentAudience(item, Object.assign({}, options || {}, { context })));
}

function requireItemAccess(item, options) {
  var opts = options || {};
  var context = opts.context || getAccessContext(opts);
  var config = getBusinessConfig(opts.businessKey);
  var audienceField = config.audienceField || 'audience';
  var audience = normalizeAudience(item && item[audienceField]);

  if (!itemIsPublished(item, config)) {
    return { ok: false, statusCode: 404, code: opts.notFoundCode || 'CONTENT_NOT_FOUND', message: opts.notFoundMessage || 'content not found' };
  }
  if (audience === 'professional' && !canAccessAudience(audience, context, opts.rule)) {
    if (!context.memberActive) {
      return {
        ok: false,
        statusCode: 403,
        code: opts.deniedCode || 'CONTENT_ACCESS_DENIED',
        message: opts.deniedMessage || 'content access denied'
      };
    }
    return {
      ok: false,
      statusCode: 403,
      code: context.deviceAccess.code,
      message: context.deviceAccess.message
    };
  }
  return { ok: true, context };
}

module.exports = {
  AUDIENCE_ACCESS_RULES,
  BUSINESS_ACCESS_CONFIG,
  canAccessAudience,
  canAccessItem,
  filterVisibleItems,
  getAccessContext,
  isMemberActive,
  normalizeAudience,
  requireItemAccess,
  shouldShowInCurrentAudience
};
