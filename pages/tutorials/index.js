const tutorialCatalog = require('../../services/tutorials/catalog');

Page({
  data: {
    activeTab: 'connect',
    tabs: [
      { key: 'connect', name: '首次连接' },
      { key: 'bind', name: '设备连接' },
      { key: 'transfer', name: '文本传输' },
      { key: 'faq', name: '常见问题' }
    ],
    tutorials: []
  },

  switchTab(e) {
    const activeTab = e.currentTarget.dataset.key;
    this.setData({ activeTab });
    tutorialCatalog.getTutorialsByCategory(activeTab)
      .then((tutorials) => {
        this.setData({ tutorials });
      });
  }
});
