Component({
    properties: {
        /**     
         * 图片路径
         */
        'imgSrc': {
            type: String
        },
        /**
         * 裁剪框高度
         */
        'height': {
            type: Number,
            value: 200
        },
        /**
         * 裁剪框宽度
         */
        'width': {
            type: Number,
            value: 200
        },
        /**
         * 裁剪框最小尺寸
         */
        'min_width': {
            type: Number,
            value: 100
        },
        'min_height': {
            type: Number,
            value: 100
        },
        /**
         * 裁剪框最大尺寸
         */
        'max_width': {
            type: Number,
            value: 750
        },
        'max_height': {
            type: Number,
            value: 1200
        },
        /**
         * 裁剪框禁止拖动
         */
        'disable_width': {
            type: Boolean,
            value: false
        },
        'disable_height': {
            type: Boolean,
            value: false
        },
        /**
         * 锁定裁剪框比例
         */
        'disable_ratio': {
            type: Boolean,
            value: false
        },
        /**
         * 生成的图片尺寸相对剪裁框的比例
         */
        'export_scale': {
            type: Number,
            value: 3
        },
        /**
         * 生成的图片质量0-1
         */
        'quality': {
            type: Number,
            value: 1
        },
        'cut_top': {
            type: Number,
            value: null
        },
        'cut_left': {
            type: Number,
            value: null
        },
        /**
         * canvas上边距（不设置默认不显示）
         */
        'canvas_top': {
            type: Number,
            value: null
        },
        /**
         * canvas左边距（不设置默认不显示）
         */
        'canvas_left': {
            type: Number,
            value: null
        },
        /**
         * 图片宽度
         */
        'img_width': {
            type: null,
            value: null
        },
        /**
         * 图片高度
         */
        'img_height': {
            type: null,
            value: null
        },
        /**
         * 图片缩放比
         */
        'scale': {
            type: Number,
            value: 1
        },
        /**
         * 图片旋转角度
         */
        'angle': {
            type: Number,
            value: 0
        },
        /**
         * 最小缩放比
         */
        'min_scale': {
            type: Number,
            value: 0.5
        },
        /**
         * 最大缩放比
         */
        'max_scale': {
            type: Number,
            value: 2
        },
        /**
         * 是否禁用旋转
         */
        'disable_rotate': {
            type: Boolean,
            value: false
        },
        /**
         * 是否限制移动范围(剪裁框只能在图片内)
         */
        'limit_move': {
            type: Boolean,
            value: false
        },
        /**
         * 禁止拖动图片（仅操作裁剪框）
         */
        'disable_image_move': {
            type: Boolean,
            value: false
        },
        /**
         * 禁止裁剪框自动居中
         */
        'disable_auto_center': {
            type: Boolean,
            value: false
        },
        /**
         * 图片加载后自动适配并全图裁剪
         */
        'auto_fit_full': {
            type: Boolean,
            value: false
        },
        /**
         * 底部工具栏高度（用于计算可用区域）
         */
        'toolbarHeight': {
            type: Number,
            value: 60
        }
    },
    data: {
        el: 'image-cropper', //暂时无用
        info: wx.getSystemInfoSync(),
        MOVE_THROTTLE: null, //触摸移动节流settimeout
        MOVE_THROTTLE_FLAG: true, //节流标识
        INIT_IMGWIDTH: 0, //图片设置尺寸,此值不变（记录最初设定的尺寸）
        INIT_IMGHEIGHT: 0, //图片设置尺寸,此值不变（记录最初设定的尺寸）
        TIME_BG: null, //背景变暗延时函数
        TIME_CUT_CENTER: null,
        _touch_img_relative: [{
            x: 0,
            y: 0
        }], //鼠标和图片中心的相对位置
        _flag_cut_touch: false, //是否是拖动裁剪框
        _flag_pan_image: false, //裁剪框内单指平移图片
        _hypotenuse_length: 0, //双指触摸时斜边长度
        _flag_img_endtouch: false, //是否结束触摸
        _flag_bright: true, //背景是否亮
        _canvas_overflow: true, //canvas缩略图是否在屏幕外面
        _canvas_width: 200,
        _canvas_height: 200,
        origin_x: 0.5, //图片旋转中心
        origin_y: 0.5, //图片旋转中心
        _cut_animation: false, //是否开启图片和裁剪框过渡
        _img_top: wx.getSystemInfoSync().windowHeight / 2, //图片上边距
        _img_left: wx.getSystemInfoSync().windowWidth / 2, //图片左边距
        watch: {
            //监听截取框宽高变化
            width(value, that) {
                    if (value < that.data.min_width) {
                        that.setData({
                            width: that.data.min_width
                        });
                    }
                    that._computeCutSize();
                },
                height(value, that) {
                    if (value < that.data.min_height) {
                        that.setData({
                            height: that.data.min_height
                        });
                    }
                    that._computeCutSize();
                },
                angle(value, that) {
                    //停止居中裁剪框，继续修改图片位置
                    that._moveStop();
                    if (that.data.limit_move) {
                        if (that.data.angle % 90) {
                            that.setData({
                                angle: Math.round(that.data.angle / 90) * 90
                            });
                            return;
                        }
                    }
                },
                _cut_animation(value, that) {
                    //开启过渡300毫秒之后自动关闭
                    clearTimeout(that.data._cut_animation_time);
                    if (value) {
                        that.data._cut_animation_time = setTimeout(() => {
                            that.setData({
                                _cut_animation: false
                            });
                        }, 300)
                    }
                },
                limit_move(value, that) {
                    if (value) {
                        if (that.data.angle % 90) {
                            that.setData({
                                angle: Math.round(that.data.angle / 90) * 90
                            });
                        }
                        that._imgMarginDetectionScale();
                        !that.data._canvas_overflow && that._draw();
                    }
                },
                canvas_top(value, that) {
                    that._canvasDetectionPosition();
                },
                canvas_left(value, that) {
                    that._canvasDetectionPosition();
                },
                imgSrc(value, that) {
                    that.pushImg();
                },
                cut_top(value, that) {
                    that._cutDetectionPosition();
                    if (that.data.limit_move) {
                        !that.data._canvas_overflow && that._draw();
                    }
                },
                cut_left(value, that) {
                    that._cutDetectionPosition();
                    if (that.data.limit_move) {
                        !that.data._canvas_overflow && that._draw();
                    }
                }
        }
    },
    attached() {
        this.data.info = wx.getSystemInfoSync();
        //启用数据监听
        this._watcher();
        this.data.INIT_IMGWIDTH = this.data.img_width;
        this.data.INIT_IMGHEIGHT = this.data.img_height;
        this.setData({
            _canvas_height: this.data.height,
            _canvas_width: this.data.width,
        });
        this._initCanvas();
        this.data.imgSrc && (this.data.imgSrc = this.data.imgSrc);
        //根据开发者设置的图片目标尺寸计算实际尺寸
        this._initImageSize();
        //设置裁剪框大小>设置图片尺寸>绘制canvas
        this._computeCutSize();
        //检查裁剪框是否在范围内
        this._cutDetectionPosition();
        //检查canvas是否在范围内
        this._canvasDetectionPosition();
        //初始化完成
        this.triggerEvent('load', {
            cropper: this
        });
    },
    methods: {
        /**
         * 上传图片
         */
        upload() {
                let that = this;
                wx.chooseImage({
                    count: 1,
                    sizeType: ['original', 'compressed'],
                    sourceType: ['album', 'camera'],
                    success(res) {
                        const tempFilePaths = res.tempFilePaths[0];
                        that.pushImg(tempFilePaths);
                        wx.showLoading({
                            title: '加载中...'
                        })
                    }
                })
            },
            /**
             * 返回图片信息
             */
            getImg(getCallback) {
                this._draw(() => {
                    wx.canvasToTempFilePath({
                        width: this.data.width * this.data.export_scale,
                        height: Math.round(this.data.height * this.data.export_scale),
                        destWidth: this.data.width * this.data.export_scale,
                        destHeight: Math.round(this.data.height) * this.data.export_scale,
                        fileType: 'png',
                        quality: this.data.quality,
                        canvasId: this.data.el,
                        success: (res) => {
                            getCallback({
                                url: res.tempFilePath,
                                width: this.data.width * this.data.export_scale,
                                height: this.data.height * this.data.export_scale
                            });
                        }
                    }, this)
                });
            },
            /**
             * 设置图片动画
             * {
             *    x:10,//图片在原有基础上向下移动10px
             *    y:10,//图片在原有基础上向右移动10px
             *    angle:10,//图片在原有基础上旋转10deg
             *    scale:0.5,//图片在原有基础上增加0.5倍
             * }
             */
            setTransform(transform) {
                if (!transform) return;
                if (!this.data.disable_rotate) {
                    this.setData({
                        angle: transform.angle ? this.data.angle + transform.angle : this.data.angle
                    });
                }
                var scale = this.data.scale;
                if (transform.scale) {
                    scale = this.data.scale + transform.scale;
                    scale = scale <= this.data.min_scale ? this.data.min_scale : scale;
                    scale = scale >= this.data.max_scale ? this.data.max_scale : scale;
                }
                this.data.scale = scale;
                let cutX = this.data.cut_left;
                let cutY = this.data.cut_top;
                if (transform.cutX) {
                    this.setData({
                        cut_left: cutX + transform.cutX
                    });
                    this.data.watch.cut_left(null, this);
                }
                if (transform.cutY) {
                    this.setData({
                        cut_top: cutY + transform.cutY
                    });
                    this.data.watch.cut_top(null, this);
                }
                this.data._img_top = transform.y ? this.data._img_top + transform.y : this.data._img_top;
                this.data._img_left = transform.x ? this.data._img_left + transform.x : this.data._img_left;
                //图像边缘检测,防止截取到空白
                this._imgMarginDetectionScale();
                //停止居中裁剪框，继续修改图片位置
                this._moveDuring();
                this.setData({
                    scale: this.data.scale,
                    _img_top: this.data._img_top,
                    _img_left: this.data._img_left
                });
                !this.data._canvas_overflow && this._draw();
                //可以居中裁剪框了
                this._moveStop(); //结束操作
            },
            /**
             * 设置剪裁框位置
             */
            setCutXY(x, y) {
                this.setData({
                    cut_top: y,
                    cut_left: x
                });
            },
            /**
             * 设置剪裁框尺寸
             */
            setCutSize(w, h) {
                this.setData({
                    width: w,
                    height: h
                });
                this._computeCutSize();
            },
            /**
             * 设置剪裁框和图片居中
             */
            setCutCenter() {
                let cut_top = (this.data.info.windowHeight - this.data.height) * 0.5;
                let cut_left = (this.data.info.windowWidth - this.data.width) * 0.5;
                //顺序不能变
                this.setData({
                    _img_top: this.data._img_top - this.data.cut_top + cut_top,
                    cut_top: cut_top, //截取的框上边距
                    _img_left: this.data._img_left - this.data.cut_left + cut_left,
                    cut_left: cut_left, //截取的框左边距
                });
            },
            _setCutCenter() {
                let cut_top = (this.data.info.windowHeight - this.data.height) * 0.5;
                let cut_left = (this.data.info.windowWidth - this.data.width) * 0.5;
                this.setData({
                    cut_top: cut_top, //截取的框上边距
                    cut_left: cut_left, //截取的框左边距
                });
            },
            /**
             * 设置剪裁框宽度-即将废弃
             */
            setWidth(width) {
                this.setData({
                    width: width
                });
                this._computeCutSize();
            },
            /**
             * 设置剪裁框高度-即将废弃
             */
            setHeight(height) {
                this.setData({
                    height: height
                });
                this._computeCutSize();
            },
            /**
             * 是否锁定旋转
             */
            setDisableRotate(value) {
                this.data.disable_rotate = value;
            },
            /**
             * 是否限制移动
             */
            setLimitMove(value) {
                this.setData({
                    _cut_animation: true,
                    limit_move: !!value
                });
            },
            /**
             * 初始化图片，包括位置、大小、旋转角度
             */
            imgReset() {
                this.setData({
                    scale: 1,
                    angle: 0,
                    _img_top: wx.getSystemInfoSync().windowHeight / 2,
                    _img_left: wx.getSystemInfoSync().windowWidth / 2,
                })
            },
            /**
             * 加载（更换）图片
             */
            pushImg(src) {
                if (src) {
                    this.setData({
                        imgSrc: src
                    });
                    //发现是手动赋值直接返回，交给watch处理
                    return;
                }

                // getImageInfo接口传入 src: '' 会导致内存泄漏

                if (!this.data.imgSrc) return;
                if (this.data._pushImgBusy) return;
                this.data._pushImgBusy = true;
                wx.getImageInfo({
                    src: this.data.imgSrc,
                    success: (res) => {
                            this.data._pushImgBusy = false;
                            this.data.imageObject = res;
                            const localPath = res.path;
                            if (localPath && this.data.imgSrc !== localPath) {
                                this.data.imgSrc = localPath;
                                this.setData({ imgSrc: localPath });
                            }
                            const exifAngle = this._resolveExifAngle(res);
                            this.data.angle = exifAngle;
                            this.setData({ angle: exifAngle });
                            setTimeout(() => {
                                this.fitImageFullCrop({
                                    toolbarHeight: this.properties.toolbarHeight || 60
                                });
                                setTimeout(() => this._emitImageLoad(), 50);
                            }, 0);
                        },
                        fail: (err) => {
                            this.data._pushImgBusy = false;
                            this.setData({
                                imgSrc: ''
                            });
                            this.triggerEvent('imageload', {
                                cropper: this,
                                imageObject: null,
                                error: true
                            });
                        }
                });
            },
            imageLoad(e) {
                // 图片 DOM 加载完成，尺寸计算在 pushImg → getImageInfo 回调中
            },
            _emitImageLoad() {
                this.triggerEvent('imageload', {
                    cropper: this,
                    imageObject: this.data.imageObject
                });
            },
            _resolveExifAngle(imageObject) {
                if (!imageObject) return 0;
                const o = imageObject.orientation;
                if (typeof o === 'number') {
                    const map = { 1: 0, 3: 180, 6: 90, 8: 270 };
                    return map[o] || 0;
                }
                if (typeof o === 'string') {
                    const map = {
                        up: 0,
                        down: 180,
                        right: 90,
                        left: 270,
                        'up-mirrored': 0,
                        'down-mirrored': 180,
                        'left-mirrored': 270,
                        'right-mirrored': 90
                    };
                    return map[o] || 0;
                }
                return 0;
            },
            /**
             * 检测触摸点是否落在裁剪框四角热区，0=框内拖动，1-4=四角
             */
            _detectCropCorner(clientX, clientY) {
                const CORNER_HIT = 56;
                const cutTop = this.data.cut_top;
                const cutLeft = this.data.cut_left;
                const boxW = this.data.width;
                const boxH = this.data.height;

                const inCorner = (left, top, right, bottom) =>
                    clientX > left && clientX < right && clientY > top && clientY < bottom;

                if (inCorner(
                    cutLeft - CORNER_HIT,
                    cutTop + boxH - CORNER_HIT,
                    cutLeft + CORNER_HIT,
                    cutTop + boxH + CORNER_HIT
                )) return 1;
                if (inCorner(
                    cutLeft + boxW - CORNER_HIT,
                    cutTop - CORNER_HIT,
                    cutLeft + boxW + CORNER_HIT,
                    cutTop + CORNER_HIT
                )) return 2;
                if (inCorner(
                    cutLeft - CORNER_HIT,
                    cutTop - CORNER_HIT,
                    cutLeft + CORNER_HIT,
                    cutTop + CORNER_HIT
                )) return 3;
                if (inCorner(
                    cutLeft + boxW - CORNER_HIT,
                    cutTop + boxH - CORNER_HIT,
                    cutLeft + boxW + CORNER_HIT,
                    cutTop + boxH + CORNER_HIT
                )) return 4;
                return 0;
            },
            _beginCornerTouch(corner, clientX, clientY) {
                this._moveDuring();
                this.data._flag_cut_touch = true;
                this.data._flag_img_endtouch = true;
                this.data.CUT_START = {
                    width: this.data.width,
                    height: this.data.height,
                    cut_top: this.data.cut_top,
                    cut_left: this.data.cut_left,
                    x: clientX,
                    y: clientY,
                    corner: corner
                };
            },
            /**
             * 图片适配屏幕，裁剪框默认覆盖整张图片
             */
            fitImageFullCrop(options = {}) {
                if (!this.data.imageObject) return;

                const info = this.data.info;
                const toolbarHeight = options.toolbarHeight || this.properties.toolbarHeight || 60;
                const availableWidth = info.windowWidth;
                const availableHeight = info.windowHeight - toolbarHeight;

                // 原图像素尺寸（未旋转）
                const origW = this.data.imageObject.width;
                const origH = this.data.imageObject.height;
                const angle = this.data.angle || 0;
                const isRotated90 = Math.abs(Math.round(angle / 90) % 2) === 1;

                const margin = 16;
                const maxW = availableWidth - margin * 2;
                const maxH = availableHeight - margin * 2;

                // 旋转后的视觉包围盒（用于适配屏幕）
                const boundW = isRotated90 ? origH : origW;
                const boundH = isRotated90 ? origW : origH;
                const fitScale = Math.min(maxW / boundW, maxH / boundH, 1);

                // image 元素宽高：始终按未旋转尺寸设置，旋转由 CSS transform 完成
                const imgWidth = Math.floor(origW * fitScale);
                const imgHeight = Math.floor(origH * fitScale);

                // 裁剪框：匹配旋转后的视觉区域
                const cropW = isRotated90 ? imgHeight : imgWidth;
                const cropH = isRotated90 ? imgWidth : imgHeight;
                const cutLeft = Math.floor((availableWidth - cropW) / 2);
                const cutTop = Math.floor((availableHeight - cropH) / 2);

                this.setData({
                    scale: 1,
                    img_width: imgWidth,
                    img_height: imgHeight,
                    width: cropW,
                    height: cropH,
                    cut_left: cutLeft,
                    cut_top: cutTop,
                    max_width: cropW,
                    max_height: cropH,
                    min_width: 60,
                    min_height: 60,
                    _img_left: cutLeft + cropW / 2,
                    _img_top: cutTop + cropH / 2,
                    limit_move: true,
                    disable_image_move: false,
                    disable_auto_center: true,
                    _canvas_width: cropW,
                    _canvas_height: cropH,
                    _cut_animation: false
                }, () => {
                    setTimeout(() => this._draw(), 50);
                });
            },
            /**
             * 旋转 90° 并重新适配
             */
            rotate90(options = {}) {
                const angle = ((this.data.angle || 0) + 90) % 360;
                this.data.angle = angle;
                this.setData({ angle, _cut_animation: false });
                this.fitImageFullCrop(options);
            },
            /**
             * 获取裁剪后的图片
             */
            getCropperImage(callback) {
                this._draw(() => {
                    wx.canvasToTempFilePath({
                        width: this.data.width * this.data.export_scale,
                        height: Math.round(this.data.height * this.data.export_scale),
                        destWidth: this.data.width * this.data.export_scale,
                        destHeight: Math.round(this.data.height) * this.data.export_scale,
                        fileType: 'jpg',
                        quality: this.data.quality,
                        canvasId: this.data.el,
                        success: (res) => {
                            const result = {
                                url: res.tempFilePath,
                                width: this.data.width * this.data.export_scale,
                                height: this.data.height * this.data.export_scale
                            };
                            callback && callback(result.url);
                            this.triggerEvent('tapcut', result);
                        },
                        fail: (err) => {
                            callback && callback(null, err);
                            this.triggerEvent('tapcutfail', { error: err });
                        }
                    }, this);
                });
            },
            /**
             * 兼容 we-cropper API：旋转或重新载入图片
             */
            pushOrign(src, angle) {
                if (angle) {
                    this.setAngle((this.data.angle || 0) + angle);
                    if (this.data.auto_fit_full) {
                        setTimeout(() => this.fitImageFullCrop(), 350);
                    }
                } else if (src) {
                    this.pushImg(src);
                }
            },
            /**
             * 获取图片在屏幕上的边界
             */
            _getImageBounds() {
                const scale = this.data.scale;
                let imgW = this.data.img_width * scale;
                let imgH = this.data.img_height * scale;
                if (this.data.angle / 90 % 2) {
                    const temp = imgW;
                    imgW = imgH;
                    imgH = temp;
                }
                const left = this.data._img_left - imgW / 2;
                const top = this.data._img_top - imgH / 2;
                return {
                    left,
                    top,
                    right: left + imgW,
                    bottom: top + imgH,
                    width: imgW,
                    height: imgH
                };
            },
            /**
             * 限制裁剪框在图片范围内
             */
            _constrainCropBoxToImage() {
                const bounds = this._getImageBounds();
                let {
                    cut_left,
                    cut_top,
                    width,
                    height
                } = this.data;

                width = Math.min(width, bounds.width);
                height = Math.min(height, bounds.height);
                width = Math.max(width, this.data.min_width);
                height = Math.max(height, this.data.min_height);

                cut_left = Math.max(bounds.left, Math.min(cut_left, bounds.right - width));
                cut_top = Math.max(bounds.top, Math.min(cut_top, bounds.bottom - height));

                this.setData({
                    cut_left,
                    cut_top,
                    width,
                    height
                });
            },
            /**
             * 设置图片放大缩小
             */
            setScale(scale) {
                if (!scale) return;
                this.setData({
                    scale: scale
                });
                !this.data._canvas_overflow && this._draw();
            },
            /**
             * 设置图片旋转角度
             */
            setAngle(angle) {
                if (!angle) return;
                this.setData({
                    _cut_animation: true,
                    angle: angle
                });
                this._imgMarginDetectionScale();
                !this.data._canvas_overflow && this._draw();
            },
            _initCanvas() {
                this.data.ctx = wx.createCanvasContext("image-cropper", this);
            },
            /**
             * 根据开发者设置的图片目标尺寸计算实际尺寸
             */
            _initImageSize() {
                //处理宽高特殊单位 %>px
                if (this.data.INIT_IMGWIDTH && typeof this.data.INIT_IMGWIDTH == "string" && this.data.INIT_IMGWIDTH.indexOf("%") != -1) {
                    let width = this.data.INIT_IMGWIDTH.replace("%", "");
                    this.data.INIT_IMGWIDTH = this.data.img_width = this.data.info.windowWidth / 100 * width;
                }
                if (this.data.INIT_IMGHEIGHT && typeof this.data.INIT_IMGHEIGHT == "string" && this.data.INIT_IMGHEIGHT.indexOf("%") != -1) {
                    let height = this.data.img_height.replace("%", "");
                    this.data.INIT_IMGHEIGHT = this.data.img_height = this.data.info.windowHeight / 100 * height;
                }
            },
            /**
             * 检测剪裁框位置是否在允许的范围内(屏幕内)
             */
            _cutDetectionPosition() {
                let _cutDetectionPositionTop = () => {
                        //检测上边距是否在范围内
                        if (this.data.cut_top < 0) {
                            this.setData({
                                cut_top: 0
                            });
                        }
                        if (this.data.cut_top > this.data.info.windowHeight - this.data.height) {
                            this.setData({
                                cut_top: this.data.info.windowHeight - this.data.height
                            });
                        }
                    },
                    _cutDetectionPositionLeft = () => {
                        //检测左边距是否在范围内
                        if (this.data.cut_left < 0) {
                            this.setData({
                                cut_left: 0
                            });
                        }
                        if (this.data.cut_left > this.data.info.windowWidth - this.data.width) {
                            this.setData({
                                cut_left: this.data.info.windowWidth - this.data.width
                            });
                        }
                    };
                //裁剪框坐标处理（如果只写一个参数则另一个默认为0，都不写默认居中）
                if (this.data.cut_top == null && this.data.cut_left == null) {
                    this._setCutCenter();
                } else if (this.data.cut_top != null && this.data.cut_left != null) {
                    _cutDetectionPositionTop();
                    _cutDetectionPositionLeft();
                } else if (this.data.cut_top != null && this.data.cut_left == null) {
                    _cutDetectionPositionTop();
                    this.setData({
                        cut_left: (this.data.info.windowWidth - this.data.width) / 2
                    });
                } else if (this.data.cut_top == null && this.data.cut_left != null) {
                    _cutDetectionPositionLeft();
                    this.setData({
                        cut_top: (this.data.info.windowHeight - this.data.height) / 2
                    });
                }
            },
            /**
             * 检测canvas位置是否在允许的范围内(屏幕内)如果在屏幕外则不开启实时渲染
             * 如果只写一个参数则另一个默认为0，都不写默认超出屏幕外
             */
            _canvasDetectionPosition() {
                if (this.data.canvas_top == null && this.data.canvas_left == null) {
                    this.data._canvas_overflow = false;
                    this.setData({
                        canvas_top: -5000,
                        canvas_left: -5000
                    });
                } else if (this.data.canvas_top != null && this.data.canvas_left != null) {
                    if (this.data.canvas_top < -this.data.height || this.data.canvas_top > this.data.info.windowHeight) {
                        this.data._canvas_overflow = true;
                    } else {
                        this.data._canvas_overflow = false;
                    }
                } else if (this.data.canvas_top != null && this.data.canvas_left == null) {
                    this.setData({
                        canvas_left: 0
                    });
                } else if (this.data.canvas_top == null && this.data.canvas_left != null) {
                    this.setData({
                        canvas_top: 0
                    });
                    if (this.data.canvas_left < -this.data.width || this.data.canvas_left > this.data.info.windowWidth) {
                        this.data._canvas_overflow = true;
                    } else {
                        this.data._canvas_overflow = false;
                    }
                }
            },
            /**
             * 图片边缘检测-位置
             */
            _imgMarginDetectionPosition(scale) {
                if (!this.data.limit_move) return;
                let left = this.data._img_left;
                let top = this.data._img_top;
                var scale = scale || this.data.scale;
                let img_width = this.data.img_width;
                let img_height = this.data.img_height;
                if (this.data.angle / 90 % 2) {
                    img_width = this.data.img_height;
                    img_height = this.data.img_width;
                }
                left = this.data.cut_left + img_width * scale / 2 >= left ? left : this.data.cut_left + img_width * scale / 2;
                left = this.data.cut_left + this.data.width - img_width * scale / 2 <= left ? left : this.data.cut_left + this.data.width - img_width * scale / 2;
                top = this.data.cut_top + img_height * scale / 2 >= top ? top : this.data.cut_top + img_height * scale / 2;
                top = this.data.cut_top + this.data.height - img_height * scale / 2 <= top ? top : this.data.cut_top + this.data.height - img_height * scale / 2;
                this.setData({
                    _img_left: left,
                    _img_top: top,
                    scale: scale
                })
            },
            /**
             * 图片边缘检测-缩放
             */
            _imgMarginDetectionScale() {
                if (!this.data.limit_move) return;
                let scale = this.data.scale;
                let img_width = this.data.img_width;
                let img_height = this.data.img_height;
                if (this.data.angle / 90 % 2) {
                    img_width = this.data.img_height;
                    img_height = this.data.img_width;
                }
                if (img_width * scale < this.data.width) {
                    scale = this.data.width / img_width;
                }
                if (img_height * scale < this.data.height) {
                    scale = Math.max(scale, this.data.height / img_height);
                }
                this._imgMarginDetectionPosition(scale);
            },
            _setData(obj) {
                let data = {};
                for (var key in obj) {
                    if (this.data[key] != obj[key]) {
                        data[key] = obj[key];
                    }
                }
                this.setData(data);
                return data;
            },
            /**
             * 计算图片尺寸
             */
            _imgComputeSize() {
                let img_width = this.data.img_width,
                    img_height = this.data.img_height;
                if (!this.data.INIT_IMGHEIGHT && !this.data.INIT_IMGWIDTH) {
                    //默认按图片最小边 = 对应裁剪框尺寸
                    img_width = this.data.imageObject.width;
                    img_height = this.data.imageObject.height;
                    if (img_width / img_height > this.data.width / this.data.height) {
                        img_height = this.data.height;
                        img_width = this.data.imageObject.width / this.data.imageObject.height * img_height;
                    } else {
                        img_width = this.data.width;
                        img_height = this.data.imageObject.height / this.data.imageObject.width * img_width;
                    }
                } else if (this.data.INIT_IMGHEIGHT && !this.data.INIT_IMGWIDTH) {
                    img_width = this.data.imageObject.width / this.data.imageObject.height * this.data.INIT_IMGHEIGHT;
                } else if (!this.data.INIT_IMGHEIGHT && this.data.INIT_IMGWIDTH) {
                    img_height = this.data.imageObject.height / this.data.imageObject.width * this.data.INIT_IMGWIDTH;
                }
                this.setData({
                    img_width: img_width,
                    img_height: img_height
                });
            },
            //改变截取框大小
            _computeCutSize() {
                if (this.data.width > this.data.info.windowWidth) {
                    this.setData({
                        width: this.data.info.windowWidth,
                    });
                } else if (this.data.width + this.data.cut_left > this.data.info.windowWidth) {
                    this.setData({
                        cut_left: this.data.info.windowWidth - this.data.cut_left,
                    });
                };
                if (this.data.height > this.data.info.windowHeight) {
                    this.setData({
                        height: this.data.info.windowHeight,
                    });
                } else if (this.data.height + this.data.cut_top > this.data.info.windowHeight) {
                    this.setData({
                        cut_top: this.data.info.windowHeight - this.data.cut_top,
                    });
                }!this.data._canvas_overflow && this._draw();
            },
            //开始触摸
            _start(event) {
                if (this.data.disable_image_move) return;
                this.data._flag_img_endtouch = false;
                if (event.touches.length == 1) {
                    //单指拖动
                    this.data._touch_img_relative[0] = {
                        x: (event.touches[0].clientX - this.data._img_left),
                        y: (event.touches[0].clientY - this.data._img_top)
                    }
                } else {
                    //双指放大
                    let width = Math.abs(event.touches[0].clientX - event.touches[1].clientX);
                    let height = Math.abs(event.touches[0].clientY - event.touches[1].clientY);
                    this.data._touch_img_relative = [{
                        x: (event.touches[0].clientX - this.data._img_left),
                        y: (event.touches[0].clientY - this.data._img_top)
                    }, {
                        x: (event.touches[1].clientX - this.data._img_left),
                        y: (event.touches[1].clientY - this.data._img_top)
                    }];
                    this.data._hypotenuse_length = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
                }!this.data._canvas_overflow && this._draw();
            },
            _move_throttle() {
                //安卓需要节流
                if (this.data.info.platform == 'android') {
                    clearTimeout(this.data.MOVE_THROTTLE);
                    this.data.MOVE_THROTTLE = setTimeout(() => {
                        this.data.MOVE_THROTTLE_FLAG = true;
                    }, 1000 / 40)
                    return this.data.MOVE_THROTTLE_FLAG;
                } else {
                    this.data.MOVE_THROTTLE_FLAG = true;
                }
            },
            _move(event) {
                if (this.data.disable_image_move) return;
                if (this.data._flag_img_endtouch || !this.data.MOVE_THROTTLE_FLAG) return;
                this.data.MOVE_THROTTLE_FLAG = false;
                this._move_throttle();
                this._moveDuring();
                if (event.touches.length == 1) {
                    //单指拖动
                    let left = (event.touches[0].clientX - this.data._touch_img_relative[0].x),
                        top = (event.touches[0].clientY - this.data._touch_img_relative[0].y);
                    //图像边缘检测,防止截取到空白
                    this.data._img_left = left;
                    this.data._img_top = top;
                    this._imgMarginDetectionPosition();
                    this.setData({
                        _img_left: this.data._img_left,
                        _img_top: this.data._img_top
                    });
                } else {
                    //双指放大
                    let width = (Math.abs(event.touches[0].clientX - event.touches[1].clientX)),
                        height = (Math.abs(event.touches[0].clientY - event.touches[1].clientY)),
                        hypotenuse = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2)),
                        scale = this.data.scale * (hypotenuse / this.data._hypotenuse_length),
                        current_deg = 0;
                    scale = scale <= this.data.min_scale ? this.data.min_scale : scale;
                    scale = scale >= this.data.max_scale ? this.data.max_scale : scale;
                    //图像边缘检测,防止截取到空白
                    this.data.scale = scale;
                    this._imgMarginDetectionScale();
                    //双指旋转(如果没禁用旋转)
                    let _touch_img_relative = [{
                        x: (event.touches[0].clientX - this.data._img_left),
                        y: (event.touches[0].clientY - this.data._img_top)
                    }, {
                        x: (event.touches[1].clientX - this.data._img_left),
                        y: (event.touches[1].clientY - this.data._img_top)
                    }];
                    if (!this.data.disable_rotate) {
                        let first_atan = 180 / Math.PI * Math.atan2(_touch_img_relative[0].y, _touch_img_relative[0].x);
                        let first_atan_old = 180 / Math.PI * Math.atan2(this.data._touch_img_relative[0].y, this.data._touch_img_relative[0].x);
                        let second_atan = 180 / Math.PI * Math.atan2(_touch_img_relative[1].y, _touch_img_relative[1].x);
                        let second_atan_old = 180 / Math.PI * Math.atan2(this.data._touch_img_relative[1].y, this.data._touch_img_relative[1].x);
                        //当前旋转的角度
                        let first_deg = first_atan - first_atan_old,
                            second_deg = second_atan - second_atan_old;
                        if (first_deg != 0) {
                            current_deg = first_deg;
                        } else if (second_deg != 0) {
                            current_deg = second_deg;
                        }
                    }
                    this.data._touch_img_relative = _touch_img_relative;
                    this.data._hypotenuse_length = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
                    //更新视图
                    this.setData({
                        angle: this.data.angle + current_deg,
                        scale: this.data.scale
                    });
                }!this.data._canvas_overflow && this._draw();
            },
            //结束操作
            _end(event) {
                this.data._flag_img_endtouch = true;
                this._moveStop();
            },
            //点击中间剪裁框处理
            _click(event) {
                if (!this.data.imgSrc) {
                    //调起上传
                    this.upload();
                    return;
                }
                this._draw(() => {
                    let x = event.detail ? event.detail.x : event.touches[0].clientX;
                    let y = event.detail ? event.detail.y : event.touches[0].clientY;
                    if ((x >= this.data.cut_left && x <= (this.data.cut_left + this.data.width)) && (y >= this.data.cut_top && y <= (this.data.cut_top + this.data.height))) {
                        //生成图片并回调
                        wx.canvasToTempFilePath({
                            width: this.data.width * this.data.export_scale,
                            height: Math.round(this.data.height * this.data.export_scale),
                            destWidth: this.data.width * this.data.export_scale,
                            destHeight: Math.round(this.data.height) * this.data.export_scale,
                            fileType: 'png',
                            quality: this.data.quality,
                            canvasId: this.data.el,
                            success: (res) => {
                                this.triggerEvent('tapcut', {
                                    url: res.tempFilePath,
                                    width: this.data.width * this.data.export_scale,
                                    height: this.data.height * this.data.export_scale
                                });
                            }
                        }, this)
                    }
                });
            },
            //渲染
            _draw(callback) {
                if (!this.data.imgSrc) return;
                const runDraw = () => {
                    this._initCanvas();
                    const ctx = this.data.ctx;
                    const exportScale = this.data.export_scale;
                    const canvasW = this.data.width * exportScale;
                    const canvasH = this.data.height * exportScale;
                    const img_width = this.data.img_width * this.data.scale * exportScale;
                    const img_height = this.data.img_height * this.data.scale * exportScale;
                    const xpos = this.data._img_left - this.data.cut_left;
                    const ypos = this.data._img_top - this.data.cut_top;
                    ctx.clearRect(0, 0, canvasW, canvasH);
                    ctx.translate(xpos * exportScale, ypos * exportScale);
                    ctx.rotate(this.data.angle * Math.PI / 180);
                    ctx.drawImage(this.data.imgSrc, -img_width / 2, -img_height / 2, img_width, img_height);
                    ctx.draw(false, () => {
                        callback && callback();
                    });
                };
                if (this.data._canvas_width !== this.data.width || this.data._canvas_height !== this.data.height) {
                    this.setData({
                        _canvas_width: this.data.width,
                        _canvas_height: this.data.height
                    }, () => setTimeout(runDraw, 50));
                } else {
                    runDraw();
                }
            },
            //裁剪框处理
            _cutTouchMove(e) {
                if (this.data._flag_cut_touch && this.data.MOVE_THROTTLE_FLAG) {
                    if (this.data.disable_ratio && (this.data.disable_width || this.data.disable_height)) return;
                    //节流
                    this.data.MOVE_THROTTLE_FLAG = false;
                    this._move_throttle();
                    let width = this.data.width,
                        height = this.data.height,
                        cut_top = this.data.cut_top,
                        cut_left = this.data.cut_left,
                        size_correct = () => {
                            width = width <= this.data.max_width ? width >= this.data.min_width ? width : this.data.min_width : this.data.max_width;
                            height = height <= this.data.max_height ? height >= this.data.min_height ? height : this.data.min_height : this.data.max_height;
                        },
                        size_inspect = () => {
                            if ((width > this.data.max_width || width < this.data.min_width || height > this.data.max_height || height < this.data.min_height) && this.data.disable_ratio) {
                                size_correct();
                                return false;
                            } else {
                                size_correct();
                                return true;
                            }
                        };
                    if (this.data.CUT_START.corner === 0) {
                        cut_left = this.data.CUT_START.cut_left + (e.touches[0].clientX - this.data.CUT_START.x);
                        cut_top = this.data.CUT_START.cut_top + (e.touches[0].clientY - this.data.CUT_START.y);
                        this.setData({
                            cut_left,
                            cut_top
                        });
                        this._constrainCropBoxToImage();
                        return;
                    }
                    height = this.data.CUT_START.height + ((this.data.CUT_START.corner > 1 && this.data.CUT_START.corner < 4 ? 1 : -1) * (this.data.CUT_START.y - e.touches[0].clientY));
                    switch (this.data.CUT_START.corner) {
                    case 1:
                        width = this.data.CUT_START.width + this.data.CUT_START.x - e.touches[0].clientX;
                        if (this.data.disable_ratio) {
                            height = width / (this.data.width / this.data.height)
                        }
                        if (!size_inspect()) return;
                        cut_left = this.data.CUT_START.cut_left - (width - this.data.CUT_START.width);
                        break
                    case 2:
                        width = this.data.CUT_START.width + this.data.CUT_START.x - e.touches[0].clientX;
                        if (this.data.disable_ratio) {
                            height = width / (this.data.width / this.data.height)
                        }
                        if (!size_inspect()) return;
                        cut_top = this.data.CUT_START.cut_top - (height - this.data.CUT_START.height)
                        cut_left = this.data.CUT_START.cut_left - (width - this.data.CUT_START.width)
                        break
                    case 3:
                        width = this.data.CUT_START.width - this.data.CUT_START.x + e.touches[0].clientX;
                        if (this.data.disable_ratio) {
                            height = width / (this.data.width / this.data.height)
                        }
                        if (!size_inspect()) return;
                        cut_top = this.data.CUT_START.cut_top - (height - this.data.CUT_START.height);
                        break
                    case 4:
                        width = this.data.CUT_START.width - this.data.CUT_START.x + e.touches[0].clientX;
                        if (this.data.disable_ratio) {
                            height = width / (this.data.width / this.data.height)
                        }
                        if (!size_inspect()) return;
                        break
                    }
                    if (!this.data.disable_width && !this.data.disable_height) {
                        this.setData({
                            width: width,
                            cut_left: cut_left,
                            height: height,
                            cut_top: cut_top,
                        })
                    } else if (!this.data.disable_width) {
                        this.setData({
                            width: width,
                            cut_left: cut_left
                        })
                    } else if (!this.data.disable_height) {
                        this.setData({
                            height: height,
                            cut_top: cut_top
                        })
                    }
                    if (this.data.disable_image_move) {
                        this._constrainCropBoxToImage();
                    } else {
                        this._imgMarginDetectionScale();
                    }
                }
            },
            _cornerTouchStart(e) {
                if (this.data._flag_cut_touch) return;
                const corner = Number(e.currentTarget.dataset.corner);
                if (!corner) return;
                const touch = e.touches[0];
                this._beginCornerTouch(corner, touch.clientX, touch.clientY);
            },
            _cropBoxDragStart(e) {
                if (this.data._flag_cut_touch || this.data._flag_pan_image) return;
                const touch = e.touches[0];
                const corner = this._detectCropCorner(touch.clientX, touch.clientY);
                if (corner > 0) {
                    this._beginCornerTouch(corner, touch.clientX, touch.clientY);
                    return;
                }
                this._moveDuring();
                if (!this.data.disable_image_move) {
                    this.data._flag_pan_image = true;
                    this.data._flag_img_endtouch = false;
                    this.data._touch_img_relative[0] = {
                        x: touch.clientX - this.data._img_left,
                        y: touch.clientY - this.data._img_top
                    };
                    return;
                }
                this.data._flag_cut_touch = true;
                this.data._flag_img_endtouch = true;
                this.data.CUT_START = {
                    corner: 0,
                    x: touch.clientX,
                    y: touch.clientY,
                    cut_left: this.data.cut_left,
                    cut_top: this.data.cut_top,
                    width: this.data.width,
                    height: this.data.height
                };
            },
            _cropBoxDragMove(e) {
                if (this.data._flag_pan_image) {
                    if (!this.data.MOVE_THROTTLE_FLAG) return;
                    this.data.MOVE_THROTTLE_FLAG = false;
                    this._move_throttle();
                    const touch = e.touches[0];
                    this.data._img_left = touch.clientX - this.data._touch_img_relative[0].x;
                    this.data._img_top = touch.clientY - this.data._touch_img_relative[0].y;
                    this._imgMarginDetectionPosition();
                    this.setData({
                        _img_left: this.data._img_left,
                        _img_top: this.data._img_top
                    });
                    !this.data._canvas_overflow && this._draw();
                    return;
                }
                if (!this.data._flag_cut_touch) return;
                this._cutTouchMove(e);
            },
            _cutTouchStart(e) {
                const touch = e.touches[0];
                const corner = this._detectCropCorner(touch.clientX, touch.clientY);
                if (corner > 0) {
                    this._beginCornerTouch(corner, touch.clientX, touch.clientY);
                }
            },
            _cutTouchEnd(e) {
                this._moveStop();
                this.data._flag_cut_touch = false;
                this.data._flag_pan_image = false;
                this.data._flag_img_endtouch = true;
            },
            //停止移动时需要做的操作
            _moveStop() {
                //清空之前的自动居中延迟函数并添加最新的
                clearTimeout(this.data.TIME_CUT_CENTER);
                if (!this.data.disable_auto_center) {
                    this.data.TIME_CUT_CENTER = setTimeout(() => {
                            //动画启动
                            if (!this.data._cut_animation) {
                                this.setData({
                                    _cut_animation: true
                                });
                            }
                            this.setCutCenter();
                        }, 1000)
                }
                    //清空之前的背景变化延迟函数并添加最新的
                clearTimeout(this.data.TIME_BG);
                this.data.TIME_BG = setTimeout(() => {
                    if (this.data._flag_bright) {
                        this.setData({
                            _flag_bright: false
                        });
                    }
                }, 2000)
            },
            //移动中
            _moveDuring() {
                //清空之前的自动居中延迟函数
                clearTimeout(this.data.TIME_CUT_CENTER);
                //清空之前的背景变化延迟函数
                clearTimeout(this.data.TIME_BG);
                //高亮背景
                if (!this.data._flag_bright) {
                    this.setData({
                        _flag_bright: true
                    });
                }
            },
            //监听器
            _watcher() {
                Object.keys(this.data).forEach(v => {
                    this._observe(this.data, v, this.data.watch[v]);
                })
            },
            _observe(obj, key, watchFun) {
                var val = obj[key];
                Object.defineProperty(obj, key, {
                    configurable: true,
                    enumerable: true,
                    set: (value) => {
                            val = value;
                            watchFun && watchFun(val, this);
                        },
                        get() {
                            if (val && '_img_top|img_left||width|height|min_width|max_width|min_height|max_height|export_scale|cut_top|cut_left|canvas_top|canvas_left|img_width|img_height|scale|angle|min_scale|max_scale'.indexOf(key) != -1) {
                                let ret = parseFloat(parseFloat(val).toFixed(3));
                                if (typeof val == "string" && val.indexOf("%") != -1) {
                                    ret += '%';
                                }
                                return ret;
                            }
                            return val;
                        }
                })
            },
            _preventTouchMove() {}
    }
})