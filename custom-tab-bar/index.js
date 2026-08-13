const featureEntitlements = require('../services/entitlements/features');

Component({
  data: {
    selected: 0,
    color: '#64739A',
    selectedColor: '#6F3DFF',
    list: [
      {
        pagePath: 'pages/home/home',
        text: '首页',
        icon: 'home',
        activeIcon: 'home'
      },
      {
        pagePath: 'pages/ai/detail',
        text: 'AI创作',
        featureKey: 'aiWriting',
        icon: 'edit-1',
        activeIcon: 'edit-1'
      },
      {
        pagePath: 'pages/templates/index',
        text: '场景模板',
        featureKey: 'templates',
        icon: 'view-module',
        activeIcon: 'view-module'
      },
      {
        pagePath: 'pages/profile/profile',
        text: '我的',
        icon: 'user',
        activeIcon: 'user'
      }
    ]
  },

  lifetimes: {
    attached() {
      this.syncSelectedByRoute();
    }
  },

  pageLifetimes: {
    show() {
      this.syncSelectedByRoute();
    }
  },

  methods: {
    setSelected(index) {
      if (index === this.data.selected) return;
      this.setData({ selected: index });
    },

    syncSelectedByRoute() {
      const pages = getCurrentPages();
      if (!pages.length) return;
      const route = pages[pages.length - 1].route || '';
      const index = this.data.list.findIndex(function (item) {
        return item.pagePath === route;
      });
      if (index >= 0) {
        this.setData({ selected: index });
      }
    },

    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.list[index];
      if (!item || index === this.data.selected) return;
      const that = this;
      const navigate = function () {
        wx.switchTab({ url: '/' + item.pagePath });
        that.setData({ selected: index });
      };
      if (!item.featureKey) {
        navigate();
        return;
      }
      featureEntitlements.guardAiFeature(item.featureKey, item.text).then(function (ok) {
        if (ok) navigate();
      });
    }
  }
});
