var roles = require('../services/auth/roles');

module.exports = Behavior({
  definitionFilter: function (defFields) {
    var requiredRoot = defFields && defFields.requiredRoot;
    if (!requiredRoot) return;
    defFields.methods = defFields.methods || {};
    var originalAttached = defFields.lifetimes && defFields.lifetimes.attached;
    defFields.lifetimes = defFields.lifetimes || {};
    defFields.lifetimes.attached = function () {
      if (!roles.requireRootAccess(requiredRoot)) return;
      if (typeof originalAttached === 'function') {
        originalAttached.call(this);
      }
    };
  }
});
