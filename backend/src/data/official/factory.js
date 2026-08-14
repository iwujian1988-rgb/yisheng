function createOfficialTemplate(def, nowIso) {
  const { getGenerationContract } = require('./generation-contracts');
  const { getWritingBlueprint } = require('./writing-blueprints');
  return {
    id: def.id,
    template_type: def.template_type,
    audience: def.audience === 'general' ? 'general' : 'professional',
    tag: 'official',
    name: def.name,
    user_id: null,
    fields: def.fields,
    sample: def.sample,
    template_version: def.template_version || 3,
    generation_contract: def.generation_contract || getGenerationContract(def.id),
    writing_blueprint: def.writing_blueprint || getWritingBlueprint(def.id),
    status: 'active',
    created_at: nowIso,
    updated_at: nowIso,
    updated_by: null
  };
}

module.exports = {
  createOfficialTemplate: createOfficialTemplate
};
