const qaState = require('../../services/qa/check-state');

Page({
  data: {
    items: [
      { id: 'privacy', title: '隐私说明', desc: '隐私政策和用户协议已更新且可正常展示', checked: false },
      { id: 'login', title: '登录开通', desc: '注册、登录、微信登录、开通状态判断正常', checked: false },
      { id: 'device', title: '设备绑定', desc: '蓝牙搜索、绑定、解绑流程正常', checked: false },
      { id: 'transfer', title: '蓝牙发送', desc: '文本编码、分片发送、进度、取消正常', checked: false },
      { id: 'ai', title: 'AI 脱敏', desc: '敏感字段脱敏、AI 结果审核流程正常', checked: false },
      { id: 'error', title: '错误处理', desc: '网络异常、蓝牙断开、超时等异常有友好提示', checked: false }
    ],
    checkedCount: 0,
    progressPercent: 0,
    allChecked: false
  },

  onLoad() {
    this.applyCheckedIds(qaState.getState('release'));
  },

  onCheckChange(e) {
    const checkedIds = e.detail.value || [];
    qaState.saveState('release', checkedIds);
    this.applyCheckedIds(checkedIds);
  },

  applyCheckedIds(checkedIds) {
    const items = this.data.items.map((item) => ({
      id: item.id,
      title: item.title,
      desc: item.desc,
      checked: checkedIds.indexOf(item.id) !== -1
    }));
    const checkedCount = items.filter((item) => item.checked).length;
    this.setData({
      items,
      checkedCount,
      progressPercent: Math.round((checkedCount / items.length) * 100),
      allChecked: checkedCount === items.length
    });
  }
});
