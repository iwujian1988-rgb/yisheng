var INTERNAL_PAGE_ROLES = {
  admin: ['admin', 'super_admin'],
  qa: ['admin', 'super_admin', 'qa'],
  ops: ['admin', 'super_admin', 'ops'],
  sales: ['admin', 'super_admin', 'sales'],
  finance: ['admin', 'super_admin', 'finance'],
  customer: ['admin', 'super_admin', 'customer_success'],
  metrics: ['admin', 'super_admin', 'analyst'],
  compliance: ['admin', 'super_admin', 'compliance'],
  training: ['admin', 'super_admin', 'trainer'],
  legal: ['admin', 'super_admin', 'legal'],
  analytics: ['admin', 'super_admin', 'analyst'],
  integration: ['admin', 'super_admin', 'engineer'],
  release: ['admin', 'super_admin', 'release_manager'],
  maintenance: ['admin', 'super_admin', 'engineer'],
  backend: ['admin', 'super_admin', 'engineer'],
  manual: ['admin', 'super_admin'],
  demo: ['admin', 'super_admin'],
  dev: ['admin', 'super_admin', 'developer']
};

function getCurrentRole() {
  try {
    var userInfo = wx.getStorageSync('userInfo') || {};
    var account = wx.getStorageSync('adminAccount') || {};
    return userInfo.role || account.role || (userInfo.phone ? 'user' : 'guest');
  } catch (e) {
    return 'guest';
  }
}

function isInternalRoot(root) {
  return Object.prototype.hasOwnProperty.call(INTERNAL_PAGE_ROLES, root);
}

function canAccessRoot(root, role) {
  var allowed = INTERNAL_PAGE_ROLES[root];
  if (!allowed) return true;
  return allowed.indexOf(role) !== -1;
}

function requireRootAccess(root) {
  var role = getCurrentRole();
  if (canAccessRoot(root, role)) return true;
  wx.showModal({
    title: '无访问权限',
    content: '该页面仅限内部角色访问。',
    showCancel: false,
    confirmText: '返回',
    success: function () {
      wx.navigateBack({
        fail: function () { wx.reLaunch({ url: '/pages/home/home' }); }
      });
    }
  });
  return false;
}

module.exports = {
  INTERNAL_PAGE_ROLES: INTERNAL_PAGE_ROLES,
  getCurrentRole: getCurrentRole,
  isInternalRoot: isInternalRoot,
  canAccessRoot: canAccessRoot,
  requireRootAccess: requireRootAccess
};
