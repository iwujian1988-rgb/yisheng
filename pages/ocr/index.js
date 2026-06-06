const ocrRecognizer = require('../../services/ocr/recognizer');

Page({
  data: {
    imageUrl: '',
    resultText: '',
    recognizing: false,
    errorMessage: ''
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const imageUrl = res.tempFilePaths && res.tempFilePaths[0] ? res.tempFilePaths[0] : '';
        this.setData({
          imageUrl,
          resultText: '',
          errorMessage: ''
        });
        this.recognizeSelectedImage(imageUrl);
      }
    });
  },

  recognizeSelectedImage(imageUrl) {
    if (!imageUrl) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }

    this.setData({ recognizing: true, errorMessage: '' });

    ocrRecognizer.recognizeImage({ path: imageUrl })
      .then((result) => {
        this.setData({
          resultText: result && result.text ? result.text : '',
          recognizing: false,
          errorMessage: ''
        });
      })
      .catch((error) => {
        this.setData({
          recognizing: false,
          errorMessage: error && error.message ? error.message : 'OCR 服务暂不可用'
        });
      });
  },

  confirmResult() {
    if (!this.data.resultText) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: '/pages/ocr/result?imageUrl=' + encodeURIComponent(this.data.imageUrl) + '&resultText=' + encodeURIComponent(this.data.resultText)
    });
  }
});
