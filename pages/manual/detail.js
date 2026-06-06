const manualCatalog = require('../../services/manual/catalog');

Page({
  data: {
    title: '',
    steps: [],
    notices: []
  },

  onLoad(options) {
    if (options.type) {
      this.setData(manualCatalog.getManualSection(decodeURIComponent(options.type)));
      return;
    }

    const data = {};
    if (options.title) {
      data.title = decodeURIComponent(options.title);
    }
    if (options.steps) {
      try {
        data.steps = JSON.parse(decodeURIComponent(options.steps));
      } catch (e) {
        data.steps = [];
      }
    }
    if (options.notices) {
      try {
        data.notices = JSON.parse(decodeURIComponent(options.notices));
      } catch (e) {
        data.notices = [];
      }
    }
    this.setData(data);
  }
});
