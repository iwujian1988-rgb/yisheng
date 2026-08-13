const crypto = require('crypto');
const { config } = require('../config');
const { fail, getIp, ok, parseBody } = require('../http');
const { createId, nowIso } = require('../security/ids');
const { parseCsvText } = require('../security/csv');
const { writeAudit } = require('../security/audit');

const BUNDLE_SKU = 'hardware_member';
const HARDWARE_ONLY_SKU = 'hardware_only';
const PRESET_MEMBER_DAYS = [365, 730, 36500];

function createOrderEntitlementsModule(deps) {
  var store = deps.store;
  var auth = deps.auth;

  function phoneHash(phone) {
    return crypto.createHmac('sha256', config.orderEntitlementHashSecret).update(String(phone)).digest('hex');
  }

  function validPhone(phone) {
    return /^1[3-9]\d{9}$/.test(String(phone || ''));
  }

  function requireHashSecret(res) {
    if (config.orderEntitlementHashSecret) return true;
    fail(res, 503, 'ORDER_ENTITLEMENT_NOT_CONFIGURED', 'order entitlement service is not configured');
    return false;
  }

  function normalizeRow(row) {
    var skuType = String(row.skuType || row.sku_type || '').trim();
    return {
      // The marketplace order number stays in the operations import only.
      orderNo: String(row.orderNo || row.order_no || '').trim(),
      phone: String(row.phone || row.receiverPhone || row.receiver_phone || '').trim(),
      skuType: skuType === BUNDLE_SKU ? BUNDLE_SKU : HARDWARE_ONLY_SKU,
      memberDays: Math.max(0, Number(row.memberDays || row.member_days || 365) || 0)
    };
  }

  function findPendingByPhoneHash(hash) {
    return store.orderEntitlements.find(function (item) {
      return item.status === 'pending' && item.skuType === BUNDLE_SKU && item.phoneHash === hash;
    }) || null;
  }

  function publicEntitlement(item) {
    return {
      id: item.id,
      skuType: item.skuType,
      memberDays: item.memberDays,
      status: item.status,
      claimedAt: item.claimedAt || '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  async function importOrders(req, res) {
    var actor = auth.requireAdmin(req, res, ['super_admin', 'operations_admin', 'customer_service_admin']);
    if (!actor || !requireHashSecret(res)) return;
    var body = await parseBody(req);
    var rows = Array.isArray(body.orders) ? body.orders : parseCsvText(body.ordersText || body.csv || '');
    if (!rows.length || rows.length > 1000) {
      fail(res, 400, 'ORDERS_INVALID', 'orders must contain 1 to 1000 rows');
      return;
    }
    var now = nowIso();
    var imported = [];
    var rejected = [];
    rows.forEach(function (row, index) {
      var item = normalizeRow(row);
      if (!item.orderNo || !validPhone(item.phone)) {
        rejected.push({ row: index + 1, reason: 'orderNo and receiver phone are required' });
        return;
      }
      var record = store.orderEntitlements.find(function (entry) { return entry.orderNo === item.orderNo; });
      if (!record) {
        record = { id: createId('ent'), orderNo: item.orderNo, createdAt: now };
        store.orderEntitlements.push(record);
      }
      if (record.status === 'claimed' && record.phoneHash !== phoneHash(item.phone)) {
        rejected.push({ row: index + 1, reason: 'claimed order cannot be reassigned by import' });
        return;
      }
      record.skuType = item.skuType;
      record.phoneHash = phoneHash(item.phone);
      record.memberDays = item.skuType === BUNDLE_SKU ? item.memberDays : 0;
      if (record.status !== 'claimed') record.status = item.skuType === BUNDLE_SKU ? 'pending' : HARDWARE_ONLY_SKU;
      record.updatedAt = now;
      imported.push({ row: index + 1, skuType: record.skuType, status: record.status });
    });
    writeAudit(store, { actor: actor, ip: getIp(req), module: 'order_entitlement', actionType: 'import', targetId: '', afterJson: { imported: imported.length, rejected: rejected.length } });
    ok(res, { importedCount: imported.length, rejected: rejected });
  }

  async function presetEntitlement(req, res) {
    var actor = auth.requireAdmin(req, res, ['super_admin', 'operations_admin', 'customer_service_admin']);
    if (!actor || !requireHashSecret(res)) return;
    var body = await parseBody(req);
    var phone = String(body.phone || '').trim();
    var memberDays = Number(body.memberDays || 0);
    if (!validPhone(phone)) { fail(res, 400, 'INVALID_PHONE', 'valid phone required'); return; }
    if (PRESET_MEMBER_DAYS.indexOf(memberDays) === -1) {
      fail(res, 400, 'INVALID_MEMBER_DAYS', 'member days must be 365, 730, or 36500');
      return;
    }

    var now = nowIso();
    var hash = phoneHash(phone);
    var record = findPendingByPhoneHash(hash);
    if (!record) {
      record = {
        id: createId('ent'),
        // A generated order marker keeps manual presets idempotent per pending phone.
        orderNo: 'manual-ai-' + hash.slice(0, 16) + '-' + Date.now(),
        createdAt: now
      };
      store.orderEntitlements.push(record);
    }
    record.skuType = BUNDLE_SKU;
    record.phoneHash = hash;
    record.memberDays = memberDays;
    record.status = 'pending';
    record.updatedAt = now;
    writeAudit(store, { actor: actor, ip: getIp(req), module: 'order_entitlement', actionType: 'preset_ai_membership', targetId: record.id, afterJson: { memberDays: memberDays } });
    ok(res, publicEntitlement(record));
  }

  function listEntitlements(req, res) {
    var actor = auth.requireAdmin(req, res, ['super_admin', 'operations_admin', 'customer_service_admin']);
    if (!actor) return;
    var url = new URL(req.url, 'http://localhost');
    var status = String(url.searchParams.get('status') || '').trim();
    var items = store.orderEntitlements.filter(function (item) { return !status || item.status === status; }).map(publicEntitlement);
    ok(res, { items: items, total: items.length });
  }

  async function reassignRecipient(req, res, ctx) {
    var actor = auth.requireAdmin(req, res, ['super_admin', 'operations_admin', 'customer_service_admin']);
    if (!actor || !requireHashSecret(res)) return;
    var record = store.orderEntitlements.find(function (item) { return item.id === ctx.params.id; });
    if (!record) { fail(res, 404, 'ORDER_ENTITLEMENT_NOT_FOUND', 'order entitlement not found'); return; }
    if (record.status === 'claimed') { fail(res, 409, 'ORDER_ENTITLEMENT_ALREADY_CLAIMED', 'claimed entitlement cannot be reassigned'); return; }
    var body = await parseBody(req);
    var phone = String(body.receiverPhone || body.phone || '').trim();
    if (!validPhone(phone)) { fail(res, 400, 'INVALID_PHONE', 'valid receiver phone required'); return; }
    record.phoneHash = phoneHash(phone);
    record.status = record.skuType === BUNDLE_SKU ? 'pending' : HARDWARE_ONLY_SKU;
    record.updatedAt = nowIso();
    writeAudit(store, { actor: actor, ip: getIp(req), module: 'order_entitlement', actionType: 'reassign_receiver', targetId: record.id, afterJson: { reasonLength: String(body.reason || '').length } });
    ok(res, publicEntitlement(record));
  }

  async function createClaimRequest(req, res) {
    if (!requireHashSecret(res)) return;
    var body = await parseBody(req);
    var phone = String(body.phone || '').trim();
    if (!validPhone(phone)) { fail(res, 400, 'INVALID_PHONE', 'valid phone required'); return; }
    var hash = phoneHash(phone);
    var entitlement = findPendingByPhoneHash(hash);
    // Return the same neutral result whether the phone has a matching order or not.
    var existing = store.orderEntitlementRequests.find(function (item) {
      return item.phoneHash === hash && item.status === 'pending';
    });
    if (!existing) {
      var now = nowIso();
      existing = { id: createId('entreq'), phoneHash: hash, status: 'pending', entitlementId: entitlement ? entitlement.id : '', processedByAdminId: '', processedAt: '', createdAt: now, updatedAt: now };
      store.orderEntitlementRequests.push(existing);
    }
    ok(res, { accepted: true, nextStep: 'open_miniprogram' });
  }

  async function exchangePhoneCode(code) {
    if (!config.wechatAppId || !config.wechatAppSecret) throw new Error('wechat configuration is missing');
    var tokenUrl = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + encodeURIComponent(config.wechatAppId) + '&secret=' + encodeURIComponent(config.wechatAppSecret);
    var tokenResponse = await fetch(tokenUrl);
    var tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || tokenPayload.errcode || !tokenPayload.access_token) throw new Error(tokenPayload.errmsg || 'wechat access token failed');
    var response = await fetch('https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=' + encodeURIComponent(tokenPayload.access_token), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) });
    var payload = await response.json();
    var phone = payload.phone_info && payload.phone_info.purePhoneNumber;
    if (!response.ok || payload.errcode || !validPhone(phone)) throw new Error(payload.errmsg || 'wechat phone authorization failed');
    return phone;
  }

  async function claim(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor || !requireHashSecret(res)) return;
    var body = await parseBody(req);
    var code = String(body.phoneCode || '').trim();
    if (!code) { fail(res, 400, 'WECHAT_PHONE_CODE_REQUIRED', 'phone authorization code is required'); return; }
    var phone;
    try { phone = await exchangePhoneCode(code); } catch (error) { fail(res, 502, 'WECHAT_PHONE_FAILED', 'wechat phone authorization failed'); return; }
    var user = store.users.find(function (item) { return item.id === actor.id; });
    if (!user) { fail(res, 404, 'USER_NOT_FOUND', 'user not found'); return; }
    if (user.phone && user.phone !== phone) { fail(res, 409, 'USER_PHONE_CHANGE_REQUIRES_SUPPORT', 'contact support to change the bound phone'); return; }
    var record = findPendingByPhoneHash(phoneHash(phone));
    if (!record) { fail(res, 404, 'ORDER_ENTITLEMENT_NOT_FOUND', '该手机号暂未查询到会员记录 请联系客服'); return; }
    var now = nowIso();
    var currentEnd = new Date(user.memberEnd || 0).getTime();
    var start = Math.max(Date.now(), currentEnd || 0);
    user.phone = phone;
    user.memberStatus = 'active';
    user.memberStart = user.memberStart || now;
    user.memberEnd = new Date(start + record.memberDays * 86400000).toISOString();
    user.updatedAt = now;
    record.status = 'claimed'; record.claimedByUserId = user.id; record.claimedAt = now; record.updatedAt = now;
    store.orderEntitlementRequests.forEach(function (item) {
      if (item.phoneHash === record.phoneHash && item.status === 'pending') { item.status = 'completed'; item.entitlementId = record.id; item.processedAt = now; item.updatedAt = now; }
    });
    writeAudit(store, { actor: actor, ip: getIp(req), module: 'order_entitlement', actionType: 'claim', targetId: record.id, afterJson: { memberDays: record.memberDays } });
    ok(res, { status: 'claimed', memberEnd: user.memberEnd });
  }

  return { importOrders: importOrders, presetEntitlement: presetEntitlement, listEntitlements: listEntitlements, reassignRecipient: reassignRecipient, createClaimRequest: createClaimRequest, claim: claim };
}

module.exports = { createOrderEntitlementsModule };
