const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function getFileSize(filePath) {
  return new Promise(function (resolve, reject) {
    wx.getFileSystemManager().getFileInfo({
      filePath: filePath,
      success: function (res) { resolve(Number(res.size || 0)); },
      fail: reject
    });
  });
}

function compressImage(filePath, quality) {
  return new Promise(function (resolve, reject) {
    wx.compressImage({
      src: filePath,
      quality: quality,
      success: function (res) { resolve(res.tempFilePath || filePath); },
      fail: reject
    });
  });
}

function ensureImageWithinLimit(filePath) {
  return getFileSize(filePath).then(function (size) {
    if (size <= MAX_IMAGE_BYTES) {
      return filePath;
    }

    return compressImage(filePath, 80)
      .then(function (path) {
        return getFileSize(path).then(function (nextSize) {
          if (nextSize <= MAX_IMAGE_BYTES) return path;
          return compressImage(path, 60);
        });
      })
      .then(function (path) {
        return getFileSize(path).then(function (nextSize) {
          if (nextSize <= MAX_IMAGE_BYTES) return path;
          return compressImage(path, 40);
        });
      })
      .then(function (path) {
        return getFileSize(path).then(function (finalSize) {
          if (finalSize > MAX_IMAGE_BYTES) {
            var error = new Error('图片过大，请重新拍摄或缩小裁剪范围');
            error.code = 'OCR_IMAGE_TOO_LARGE';
            throw error;
          }
          return path;
        });
      });
  });
}

function chooseImageSource() {
  return new Promise(function (resolve, reject) {
    wx.showActionSheet({
      itemList: ['拍照', '相册'],
      success: function (res) {
        resolve(res.tapIndex === 0 ? ['camera'] : ['album']);
      },
      fail: function (err) {
        var message = err && err.errMsg ? err.errMsg : '';
        if (message.indexOf('cancel') !== -1) {
          var cancelled = new Error('已取消选择');
          cancelled.code = 'PICK_CANCELLED';
          reject(cancelled);
          return;
        }
        reject(err || new Error('无法打开选图'));
      }
    });
  });
}

function pickImageFile(sourceType) {
  return new Promise(function (resolve, reject) {
    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: sourceType,
        sizeType: ['original'],
        success: function (res) {
          var file = res.tempFiles && res.tempFiles[0];
          if (!file || !file.tempFilePath) {
            reject(new Error('没有选择图片'));
            return;
          }
          resolve(file.tempFilePath);
        },
        fail: reject
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: sourceType,
      success: function (res) {
        var path = res.tempFilePaths && res.tempFilePaths[0];
        if (!path) {
          reject(new Error('没有选择图片'));
          return;
        }
        resolve(path);
      },
      fail: reject
    });
  });
}

function openCropper(imagePath) {
  return new Promise(function (resolve, reject) {
    wx.navigateTo({
      url: '/pages/ocr/cropper?src=' + encodeURIComponent(imagePath),
      events: {
        onCropComplete: function (croppedPath) {
          resolve(croppedPath);
        },
        onCropCancel: function () {
          var cancelled = new Error('已取消裁剪');
          cancelled.code = 'CROP_CANCELLED';
          reject(cancelled);
        }
      },
      fail: reject
    });
  });
}

function pickImageForCrop() {
  return chooseImageSource()
    .then(pickImageFile)
    .then(ensureImageWithinLimit);
}

function pickCropAndPrepare() {
  return pickImageForCrop().then(openCropper);
}

module.exports = {
  MAX_IMAGE_BYTES: MAX_IMAGE_BYTES,
  pickImageForCrop: pickImageForCrop,
  pickCropAndPrepare: pickCropAndPrepare
};
