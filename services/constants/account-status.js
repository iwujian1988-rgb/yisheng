const ACCOUNT_STATUS = {
  UNREGISTERED: 'unregistered',
  REGISTERED_NOT_PAID: 'registered_not_paid',
  PAID_NOT_BOUND: 'paid_not_bound',
  ACTIVE: 'active',
  DISABLED: 'disabled',
  EXPIRED: 'expired',
  DEVICE_CONFLICT: 'device_conflict'
};

const PURCHASE_STATUS = {
  NONE: 'none',
  PAID: 'paid',
  REFUNDED: 'refunded',
  EXPIRED: 'expired',
  DISABLED: 'disabled'
};

const DEVICE_BINDING_STATUS = {
  NOT_BOUND: 'not_bound',
  BOUND: 'bound',
  CONFLICT: 'conflict',
  DISABLED: 'disabled'
};

const SERVICE_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  DISABLED: 'disabled'
};

function resolveAccountStatus(profile) {
  if (!profile || !profile.user) {
    return ACCOUNT_STATUS.UNREGISTERED;
  }

  if (profile.user.disabled || profile.serviceStatus === SERVICE_STATUS.DISABLED) {
    return ACCOUNT_STATUS.DISABLED;
  }

  if (
    profile.purchaseStatus === PURCHASE_STATUS.EXPIRED ||
    profile.serviceStatus === SERVICE_STATUS.EXPIRED
  ) {
    return ACCOUNT_STATUS.EXPIRED;
  }

  if (profile.purchaseStatus !== PURCHASE_STATUS.PAID) {
    return ACCOUNT_STATUS.REGISTERED_NOT_PAID;
  }

  if (profile.deviceBindingStatus === DEVICE_BINDING_STATUS.CONFLICT) {
    return ACCOUNT_STATUS.DEVICE_CONFLICT;
  }

  if (profile.deviceBindingStatus !== DEVICE_BINDING_STATUS.BOUND) {
    return ACCOUNT_STATUS.PAID_NOT_BOUND;
  }

  return ACCOUNT_STATUS.ACTIVE;
}

function canUseCoreFeatures(profile) {
  return resolveAccountStatus(profile) === ACCOUNT_STATUS.ACTIVE;
}

module.exports = {
  ACCOUNT_STATUS,
  PURCHASE_STATUS,
  DEVICE_BINDING_STATUS,
  SERVICE_STATUS,
  resolveAccountStatus,
  canUseCoreFeatures
};

