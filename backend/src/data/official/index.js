const { createFirstCourseOfficialTemplate } = require('./first-course');
const { createDischargeOrderOfficialTemplate } = require('./discharge-order');
const { createTalk72hOfficialTemplate } = require('./talk-72h');
const { createAdmissionNoteOfficialTemplate } = require('./admission-note');
const { createConsultationOfficialTemplate } = require('./consultation');

const OFFICIAL_TEMPLATE_FACTORIES = [
  createFirstCourseOfficialTemplate,
  createDischargeOrderOfficialTemplate,
  createTalk72hOfficialTemplate,
  createAdmissionNoteOfficialTemplate,
  createConsultationOfficialTemplate
];

const OFFICIAL_TEMPLATE_IDS = OFFICIAL_TEMPLATE_FACTORIES.map(function (factory) {
  return factory('1970-01-01T00:00:00.000Z').id;
});

function seedOfficialTemplates(store, nowIso) {
  if (!Array.isArray(store.agentTemplates)) {
    store.agentTemplates = [];
  }
  OFFICIAL_TEMPLATE_FACTORIES.forEach(function (factory) {
    var seed = factory(nowIso);
    var existing = store.agentTemplates.find(function (item) {
      return item.id === seed.id;
    });
    if (!existing) {
      store.agentTemplates.push(seed);
      return;
    }
    if (existing.tag !== 'official') {
      return;
    }
    var fieldsEmpty = !existing.fields
      || (Array.isArray(existing.fields) && existing.fields.length === 0)
      || (typeof existing.fields === 'object' && !Array.isArray(existing.fields) && Object.keys(existing.fields).length === 0);
    if (fieldsEmpty) {
      existing.fields = seed.fields;
      if (!existing.sample) existing.sample = seed.sample;
      existing.updated_at = nowIso;
      return;
    }
    if (!existing.updated_by && Array.isArray(existing.fields) && existing.fields.length && seed.fields && typeof seed.fields === 'object' && !Array.isArray(seed.fields)) {
      existing.fields = seed.fields;
      if (!existing.sample) existing.sample = seed.sample;
      existing.updated_at = nowIso;
    }
  });
  return store.agentTemplates;
}

module.exports = {
  OFFICIAL_TEMPLATE_FACTORIES,
  OFFICIAL_TEMPLATE_IDS,
  seedOfficialTemplates,
  createFirstCourseOfficialTemplate,
  createDischargeOrderOfficialTemplate,
  createTalk72hOfficialTemplate,
  createAdmissionNoteOfficialTemplate,
  createConsultationOfficialTemplate
};
