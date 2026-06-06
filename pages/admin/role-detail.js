// pages/admin/role-detail.js
Page({
  data: { roleName: '', permissions: [], remark: '' },
  onLoad: function (options) {
    var data = {};
    if (options.roleName) { data.roleName = decodeURIComponent(options.roleName); }
    if (options.remark) { data.remark = decodeURIComponent(options.remark); }
    if (options.permissions) {
      try { data.permissions = JSON.parse(decodeURIComponent(options.permissions)); } catch (e) {}
    }
    this.setData(data);
  }
});
