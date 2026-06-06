const FAILURE_REPORTS_KEY = 'transferFailureReports';

function submitFailureReason(reason, description) {
  const reports = wx.getStorageSync(FAILURE_REPORTS_KEY) || [];
  const report = {
    id: 'failure_' + Date.now(),
    reason,
    description: description || '',
    createdAt: Date.now()
  };
  const nextReports = [report].concat(Array.isArray(reports) ? reports : []);
  wx.setStorageSync(FAILURE_REPORTS_KEY, nextReports);
  return Promise.resolve(report);
}

module.exports = {
  submitFailureReason
};
