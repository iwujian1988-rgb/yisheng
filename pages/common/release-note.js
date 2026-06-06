// pages/common/release-note.js
Page({
  data: {
    version: '',
    updates: [],
    notices: []
  },

  onLoad(options) {
    if (options.version) {
      this.setData({ version: decodeURIComponent(options.version) });
    }
    if (options.updates) {
      try {
        this.setData({ updates: JSON.parse(decodeURIComponent(options.updates)) });
      } catch (e) {}
    }
    if (options.notices) {
      try {
        this.setData({ notices: JSON.parse(decodeURIComponent(options.notices)) });
      } catch (e) {}
    }
  }
});
