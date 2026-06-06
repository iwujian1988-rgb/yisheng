Page({
  data: { scenarioName: '', duration: '' },
  onLoad: function (options) {
    var names = {
      '1': '会议纪要演示',
      '2': '工作汇报演示',
      '3': 'AI 辅助录入',
      '4': '完整流程演示'
    };
    this.setData({ scenarioName: names[options.id] || '未知场景', duration: '--' });
  },
  goBack: function () { wx.navigateBack({ delta: 2 }); }
});
