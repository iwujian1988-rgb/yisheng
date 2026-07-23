const authSession = require('../../services/auth/session');
const featureEntitlements = require('../../services/entitlements/features');

Page({
  data: {
    isMember: false,
    memberExpiry: '',
    features: [
      { key: 'aiWriting', icon: '✨', title: '智能整理', desc: 'AI 帮你整理文本结构', path: '/pages/agent/text' },
      { key: 'templates', icon: '📑', title: '模板库', desc: '按模板生成结构化内容', path: '/pages/templates/list' },
      { key: 'ocr', icon: '📷', title: '图片识别', desc: '图片转文字', path: '/pages/ocr/index' },
      { key: 'asr', icon: '🎤', title: '语音转写', desc: '语音转文字', path: '/pages/asr/index' }
    ]
  },

  onLoad() {
    this.refreshMemberStatus();
  },

  onShow() {
    this.refreshMemberStatus();
  },

  refreshMemberStatus() {
    const summary = authSession.getStoredSessionSummary();
    const isMember = summary.purchaseStatus === 'paid' || (summary.user && summary.user.memberStatus === 'active');
    const memberExpiry = summary.user && summary.user.memberEnd ? String(summary.user.memberEnd).slice(0, 10) : '';
    this.setData({ isMember, memberExpiry });
  },

  goFeature(e) {
    const { key, path } = e.currentTarget.dataset;
    if (!path) return;
    featureEntitlements.guardAiFeature(key, 'AI 助手').then((ok) => {
      if (!ok) return;
      wx.navigateTo({ url: path });
    });
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '微信：imwujianfei\r\n(请手动添加好友)',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
