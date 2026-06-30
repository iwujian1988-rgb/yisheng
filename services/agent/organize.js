const agentText = require('./text');

const TASK_KEYS = ['organize', 'polish', 'extract', 'review', 'convert'];

function pickTask() {
  return agentText.listTasks().then(function (tasks) {
    var labels = tasks.map(function (task) {
      return task.label || task.key;
    });
    return new Promise(function (resolve, reject) {
      wx.showActionSheet({
        itemList: labels,
        success: function (res) {
          var selected = tasks[res.tapIndex];
          if (!selected) {
            reject(new Error('未选择任务'));
            return;
          }
          resolve(selected.key || TASK_KEYS[res.tapIndex]);
        },
        fail: reject
      });
    });
  });
}

function pickTemplateIfNeeded(taskKey) {
  if (taskKey !== 'organize' && taskKey !== 'review' && taskKey !== 'convert') {
    return Promise.resolve('');
  }
  return agentText.listTemplates().then(function (templates) {
    if (!templates.length) {
      return '';
    }
    var labels = ['不使用模板'].concat(templates.map(function (item) {
      return item.name;
    }));
    return new Promise(function (resolve) {
      wx.showActionSheet({
        itemList: labels,
        success: function (res) {
          if (res.tapIndex === 0) {
            resolve('');
            return;
          }
          var item = templates[res.tapIndex - 1];
          resolve(item ? item.id : '');
        },
        fail: function () {
          resolve('');
        }
      });
    });
  });
}

function runSmartOrganize(text, options) {
  options = options || {};
  wx.showLoading({ title: '整理中...', mask: true });
  return pickTask()
    .then(function (taskKey) {
      return pickTemplateIfNeeded(taskKey).then(function (templateId) {
        return agentText.runTextAgent({
          text: text,
          task: taskKey,
          templateId: templateId || undefined,
          mode: options.mode
        });
      });
    })
    .then(function (result) {
      wx.hideLoading();
      return result;
    })
    .catch(function (error) {
      wx.hideLoading();
      throw error;
    });
}

module.exports = {
  pickTask,
  runSmartOrganize
};
