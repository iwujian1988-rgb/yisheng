Page({
  data: {
    imageSrc: '',
    toolbarHeight: 70,
    imageReady: false
  },

  onLoad(options) {
    const info = wx.getSystemInfoSync();
    const toolbarHeight = Math.ceil(120 / 750 * info.windowWidth) + 20 +
      (info.safeArea ? info.screenHeight - info.safeArea.bottom : 0);

    this.setData({
      imageSrc: decodeURIComponent(options.src || ''),
      toolbarHeight
    });

    this.eventChannel = this.getOpenerEventChannel();
    wx.showLoading({ title: '加载中...', mask: false });
    this._loadingTimer = setTimeout(() => wx.hideLoading(), 10000);
  },

  onUnload() {
    clearTimeout(this._loadingTimer);
    wx.hideLoading();
    if (this.eventChannel && this.eventChannel.emit && !this._cropCompleted) {
      this.eventChannel.emit('onCropCancel');
    }
  },

  getCropper() {
    return this.cropper || this.selectComponent('#imageCropper');
  },

  cropperLoad(e) {
    this.cropper = e.detail.cropper;
  },

  imageLoad(e) {
    const { cropper, imageObject, error } = e.detail;
    if (cropper) {
      this.cropper = cropper;
    }

    if (error) {
      clearTimeout(this._loadingTimer);
      wx.hideLoading();
      wx.showToast({ title: '图片加载失败', icon: 'none' });
      return;
    }

    if (!imageObject) return;

    clearTimeout(this._loadingTimer);
    wx.hideLoading();
    this.setData({ imageReady: true });
  },

  clickCut(e) {
    const { url } = e.detail;
    if (!url) {
      wx.showToast({ title: '裁剪失败，请重试', icon: 'none' });
      return;
    }

    if (this.eventChannel && this.eventChannel.emit) {
      this._cropCompleted = true;
      this.eventChannel.emit('onCropComplete', url);
    }
    wx.navigateBack();
  },

  onConfirmTap() {
    if (!this.data.imageReady) {
      wx.showToast({ title: '图片加载中，请稍候', icon: 'none' });
      return;
    }
    const cropper = this.getCropper();
    if (!cropper) {
      wx.showToast({ title: '组件未加载', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '裁剪中...', mask: false });
    cropper.getCropperImage(() => {
      wx.hideLoading();
    });
  },

  onRotateTap() {
    const cropper = this.getCropper();
    if (!cropper) return;
    cropper.rotate90({ toolbarHeight: this.data.toolbarHeight });
  }
});
