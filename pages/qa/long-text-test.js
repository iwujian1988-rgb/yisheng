const qaState = require('../../services/qa/check-state');
const longText = require('../../services/qa/long-text');
const draftService = require('../../services/content/draft');

const FAILURE_CATEGORIES = [
  { value: 'missing_characters', label: '缺字' },
  { value: 'duplicated_characters', label: '重复' },
  { value: 'wrong_order', label: '乱序' },
  { value: 'write_timeout', label: '超时' },
  { value: 'device_disconnected', label: '断连' },
  { value: 'computer_not_focused', label: '未聚焦' },
  { value: 'unknown', label: '其他' }
];

Page({
  data: {
    targetChars: longText.TARGET_CHAR_COUNT,
    targetSeconds: longText.TARGET_SECONDS,
    records: [],
    selectedRecordId: '',
    elapsedMs: '',
    outputText: '',
    failureCategories: FAILURE_CATEGORIES,
    failureCategory: 'unknown'
  },

  onLoad() {
    this.refreshRecords();
  },

  onShow() {
    this.refreshRecords();
  },

  refreshRecords() {
    const records = qaState.getLongTextRecords();
    this.setData({
      records,
      selectedRecordId: this.data.selectedRecordId || (records[0] ? records[0].id : '')
    });
  },

  startTest() {
    const record = qaState.createLongTextTestRecord();
    const testText = longText.createTestText(record.charCount);
    draftService.saveDraft(testText, 'qa_long_text');
    this.setData({ selectedRecordId: record.id });
    this.refreshRecords();
    wx.navigateTo({
      url: '/pages/transfer/long-text-check?count=' + record.charCount + '&estimatedSeconds=' + record.estimatedSeconds
    });
  },

  selectRecord(event) {
    const recordId = event.currentTarget.dataset.id || '';
    this.setData({ selectedRecordId: recordId });
  },

  onElapsedInput(event) {
    this.setData({ elapsedMs: event.detail.value });
  },

  onOutputInput(event) {
    this.setData({ outputText: event.detail.value });
  },

  onFailureCategoryChange(event) {
    this.setData({ failureCategory: event.detail.value || 'unknown' });
  },

  submitResult() {
    if (!this.data.selectedRecordId) {
      wx.showToast({ title: '请先选择记录', icon: 'none' });
      return;
    }

    if (!this.data.elapsedMs) {
      wx.showToast({ title: '请填写耗时', icon: 'none' });
      return;
    }

    const record = this.data.records.find((item) => item.id === this.data.selectedRecordId);
    const updated = qaState.submitLongTextResult(this.data.selectedRecordId, {
      charCount: record ? record.charCount : longText.TARGET_CHAR_COUNT,
      elapsedMs: Number(this.data.elapsedMs),
      outputText: this.data.outputText,
      failureCategory: this.data.failureCategory
    });

    if (!updated) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return;
    }

    this.setData({
      elapsedMs: '',
      outputText: ''
    });
    this.refreshRecords();
    wx.showToast({ title: updated.pass ? '压测通过' : '已记录结果', icon: 'none' });
  }
});
