Component({
  properties: {
    chips: {
      type: Array,
      value: []
    },
    value: {
      type: String,
      value: ''
    },
    placeholder: {
      type: String,
      value: ''
    },
    disabled: {
      type: Boolean,
      value: false
    },
    canSend: {
      type: Boolean,
      value: false
    },
    sending: {
      type: Boolean,
      value: false
    },
    showHint: {
      type: Boolean,
      value: false
    },
    showTemplateSelector: {
      type: Boolean,
      value: false
    },
    templateLabel: {
      type: String,
      value: '选择模板，可选'
    },
    templateNames: {
      type: Array,
      value: []
    },
    templateSelected: {
      type: Boolean,
      value: false
    }
  },

  observers: {
    'chips, showTemplateSelector, value': function () {
      this.scheduleMeasure();
    }
  },

  lifetimes: {
    attached: function () {
      this.scheduleMeasure();
    },
    ready: function () {
      this.scheduleMeasure();
    }
  },

  methods: {
    scheduleMeasure: function () {
      var that = this;
      if (this._measureTimer) clearTimeout(this._measureTimer);
      this._measureTimer = setTimeout(function () {
        that.measureHeight();
      }, 50);
    },

    measureHeight: function () {
      var that = this;
      this.createSelectorQuery()
        .select('.ai-composer')
        .boundingClientRect(function (rect) {
          if (rect && rect.height) {
            that.triggerEvent('heightchange', { height: rect.height });
          }
        })
        .exec();
    },

    onInput: function (e) {
      this.triggerEvent('change', { value: e.detail.value || '' });
    },

    onChipTap: function (e) {
      var id = e.currentTarget.dataset.id;
      this.triggerEvent('chiptap', { id: id });
    },

    onHintTap: function () {
      this.triggerEvent('hinttap');
    },

    onVoiceTap: function () {
      this.triggerEvent('voice');
    },

    onImageTap: function () {
      this.triggerEvent('image');
    },

    onSendTap: function () {
      if (!this.properties.canSend || this.properties.sending) return;
      this.triggerEvent('send');
    },

    onTemplateChange: function (e) {
      this.triggerEvent('templatechange', { index: Number(e.detail.value || 0) });
    },

    onTemplateImport: function () {
      this.triggerEvent('templateimport');
    },

    onTemplateTap: function () {
      this.triggerEvent('templatepick');
    }
  }
});
