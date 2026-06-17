var fail = require('../http').fail;
var ok = require('../http').ok;
var parseBody = require('../http').parseBody;
var createId = require('../security/ids').createId;
var nowIso = require('../security/ids').nowIso;
var contentAccess = require('../security/content-access');

var MODE_DEFINITIONS = [
  {
    key: 'organize',
    label: '整理文字',
    description: '把零散内容整理成结构清晰的文本',
    placeholder: '输入需要整理的内容，也可以用语音或图片识别',
    showTemplateSelectorConnected: true,
    showTemplateSelectorDisconnected: false
  },
  {
    key: 'polish',
    label: '润色优化',
    description: '让文字更清楚、更适合发送',
    placeholder: '粘贴需要优化的文本',
    showTemplateSelectorConnected: false,
    showTemplateSelectorDisconnected: false
  },
  {
    key: 'extract',
    label: '提取要点',
    description: '从长文本里提取关键信息',
    placeholder: '粘贴需要提取重点的内容',
    showTemplateSelectorConnected: false,
    showTemplateSelectorDisconnected: false
  },
  {
    key: 'review',
    label: '内容检查',
    description: '检查文字是否完整、清楚',
    placeholder: '粘贴需要核对的内容',
    showTemplateSelectorConnected: true,
    showTemplateSelectorDisconnected: false
  },
  {
    key: 'convert',
    label: '格式转换',
    description: '按目标格式重新组织内容',
    placeholder: '粘贴原文后选择目标格式',
    showTemplateSelectorConnected: true,
    showTemplateSelectorDisconnected: true
  }
];

var MAX_USER_TEMPLATES = 20;

function createSmartCreationModule(deps) {
  var store = deps.store;
  var auth = deps.auth;

  function isMemberActive(userId) {
    return contentAccess.isMemberActive(store, userId);
  }

  function listModes(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;

    var accessContext = contentAccess.getAccessContext({
      store: store,
      req: req,
      actor: actor,
      businessKey: 'aiMode'
    });
    var modes = MODE_DEFINITIONS.map(function (mode) {
      return {
        key: mode.key,
        label: mode.label,
        description: mode.description,
        placeholder: mode.placeholder,
        showTemplateSelector: accessContext.hasProfessionalAccess
          ? mode.showTemplateSelectorConnected
          : mode.showTemplateSelectorDisconnected
      };
    });

    var systemTemplates = contentAccess.filterVisibleItems(store.templates || [], {
      businessKey: 'smartCreationTemplates',
      context: accessContext
    })
      .map(function (template) {
        return {
          id: template.id,
          name: template.name,
          category: template.category || template.scene || ''
        };
      });

    var customTemplates = (store.userTemplates || [])
      .filter(function (template) {
        return template.userId === actor.id && template.status === 'active';
      })
      .map(function (template) {
        return { id: template.id, name: template.name };
      });

    ok(res, {
      modes: modes,
      templates: {
        system: systemTemplates,
        custom: customTemplates
      }
    });
  }

  async function createUserTemplate(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;

    if (!isMemberActive(actor.id)) {
      fail(res, 403, 'MEMBER_REQUIRED', '需要开通服务后使用');
      return;
    }

    var body = await parseBody(req);
    var name = String(body.name || '').trim();
    var content = String(body.content || '').trim();
    var source = body.source === 'ocr' ? 'ocr' : 'paste';

    if (!name) {
      fail(res, 400, 'BAD_REQUEST', '模板名称不能为空');
      return;
    }
    if (!content) {
      fail(res, 400, 'BAD_REQUEST', '模板内容不能为空');
      return;
    }

    store.userTemplates = store.userTemplates || [];
    var userCount = store.userTemplates.filter(function (template) {
      return template.userId === actor.id && template.status === 'active';
    }).length;
    if (userCount >= MAX_USER_TEMPLATES) {
      fail(res, 400, 'LIMIT_EXCEEDED', '最多保存 ' + MAX_USER_TEMPLATES + ' 个自定义模板');
      return;
    }

    var template = {
      id: createId('utpl'),
      userId: actor.id,
      name: name,
      content: content,
      source: source,
      variableDefs: parseVariableDefs(content),
      outputStructure: parseOutputStructure(content),
      status: 'active',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    store.userTemplates.push(template);
    store.save && store.save();

    ok(res, {
      id: template.id,
      name: template.name,
      variableDefs: template.variableDefs,
      outputStructure: template.outputStructure,
      createdAt: template.createdAt
    }, '创建成功');
  }

  function listUserTemplates(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;

    var templates = (store.userTemplates || [])
      .filter(function (template) {
        return template.userId === actor.id && template.status === 'active';
      })
      .map(function (template) {
        return {
          id: template.id,
          name: template.name,
          source: template.source,
          createdAt: template.createdAt
        };
      });

    ok(res, { templates: templates });
  }

  function deleteUserTemplate(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;

    var id = ctx.params.id;
    var index = (store.userTemplates || []).findIndex(function (template) {
      return template.id === id && template.userId === actor.id && template.status === 'active';
    });

    if (index === -1) {
      fail(res, 404, 'NOT_FOUND', '模板不存在');
      return;
    }

    store.userTemplates[index].status = 'deleted';
    store.userTemplates[index].updatedAt = nowIso();
    store.save && store.save();

    ok(res, { id: id, deleted: true });
  }

  function getUserTemplateById(templateId, userId) {
    return (store.userTemplates || []).find(function (template) {
      return template.id === templateId && template.userId === userId && template.status === 'active';
    }) || null;
  }

  return {
    listModes: listModes,
    createUserTemplate: createUserTemplate,
    listUserTemplates: listUserTemplates,
    deleteUserTemplate: deleteUserTemplate,
    getUserTemplateById: getUserTemplateById
  };
}

function parseVariableDefs(content) {
  var lines = String(content || '').split('\n');
  var defs = [];
  lines.forEach(function (line) {
    var match = line.match(/^(?:[一二三四五六七八九十\d]+[、.)]\s*)?(.{2,20})[:：]/);
    if (match) {
      defs.push({
        key: 'section_' + defs.length,
        label: match[1].trim(),
        type: 'textarea',
        required: false
      });
    }
  });
  return defs;
}

function parseOutputStructure(content) {
  return parseVariableDefs(content).map(function (field) {
    return field.label;
  });
}

module.exports = { createSmartCreationModule: createSmartCreationModule };
