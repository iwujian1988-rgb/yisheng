const { request } = require('../../services/api/client');
const { ENDPOINTS } = require('../../services/api/endpoints');
const authSession = require('../../services/auth/session');
const localData = require('../../services/storage/local-data');

Page({
  data: {
    phone: '',
    memberText: '未开通',
    statusText: '正常',
    contactEmail: 'imwujianfei@163.com'
  },

  onLoad() {
    this.loadAccountInfo();
  },

  onShow() {
    this.loadAccountInfo();
  },

  loadAccountInfo() {
    request({
      url: ENDPOINTS.auth.me,
      method: 'GET'
    }).then((profile) => {
      const user = profile && profile.user ? profile.user : {};
      const purchaseStatus = profile && profile.purchaseStatus ? profile.purchaseStatus : 'none';
      this.setData({
        phone: user.phone || '未绑定',
        memberText: purchaseStatus === 'paid' ? '已开通会员' : '未开通',
        statusText: user.status === 'cancelled' ? '已注销' : '正常'
      });
    }).catch(() => {
      // 静默；用户停留在原页面，重新登录后会重新拉取
    });
  },

  goToAgreement() {
    wx.navigateTo({
      url: '/pages/common/agreement?type=userAgreement'
    });
  },

  goToPrivacy() {
    wx.navigateTo({
      url: '/pages/common/agreement?type=privacyPolicy'
    });
  },

  onCancelAccount() {
    wx.showModal({
      title: '确认注销账号',
      content: '注销后，账号下的历史记录、短语、片段、会员权益等将一并清除且无法恢复。请确认无未完成的订单或未结清的费用。',
      confirmText: '确认注销',
      confirmColor: '#F5222D',
      cancelText: '再想想',
      success: (res) => {
        if (!res.confirm) return;
        this.doCancelAccount();
      }
    });
  },

  doCancelAccount() {
    wx.showLoading({ title: '正在注销', mask: true });
    request({
      url: ENDPOINTS.auth.cancelAccount,
      method: 'POST',
      data: {}
    }).then(() => {
      ['transfer_history_v1', 'transfer_phrases_v1', 'transfer_snippets_v1'].forEach((key) => {
        try { wx.removeStorageSync(key); } catch (e) {}
      });
      try { localData.clearLocalContentData(); } catch (e) {}
      authSession.clearSession();
      wx.hideLoading();
      wx.showToast({ title: '账号已注销', icon: 'success', duration: 1500 });
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/login' });
      }, 1500);
    }).catch((err) => {
      wx.hideLoading();
      const msg = (err && err.message) || '注销失败，请稍后重试';
      wx.showToast({ title: msg, icon: 'none', duration: 2500 });
    });
  }
});
