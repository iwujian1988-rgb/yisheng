const imagePipeline = require('./image-pipeline');
const ocrRecognizer = require('./recognizer');
const deviceSession = require('../device/session');

function extractRecognizedText(result) {
  var lines = result && Array.isArray(result.lines) ? result.lines : [];
  if (lines.length) {
    return lines
      .map(function (item) { return item && item.text ? String(item.text).trim() : ''; })
      .filter(Boolean)
      .join('\n');
  }
  return String(result && result.text ? result.text : '').trim();
}

function captureAndRecognize() {
  return imagePipeline.pickCropAndPrepare()
    .then(function (imagePath) {
      wx.showLoading({ title: '正在识别...', mask: true });
      return deviceSession.ensureActiveSession()
        .catch(function () { return null; })
        .then(function () {
          return ocrRecognizer.recognizeImage({ path: imagePath });
        });
    })
    .then(function (result) {
      var text = extractRecognizedText(result);
      if (!text) {
        var emptyError = new Error('未识别到文字，请重新拍摄或调整裁剪范围');
        emptyError.code = 'OCR_EMPTY';
        throw emptyError;
      }
      return text;
    })
    .finally(function () {
      wx.hideLoading();
    });
}

module.exports = {
  captureAndRecognize: captureAndRecognize
};
