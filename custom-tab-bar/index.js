Component({
  data: {
    selected: 0,
    color: '#8A94A6',
    selectedColor: '#1677FF',
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
        icon: 'edit-1',
        activeIcon: 'edit-1'
      },
      {
        pagePath: 'pages/templates/index',
        text: '场景模板',
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
      wx.switchTab({ url: '/' + item.pagePath });
      this.setData({ selected: index });
    }
  }
});
