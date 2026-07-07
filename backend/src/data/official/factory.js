function createOfficialTemplate(def, nowIso) {
  return {
    id: def.id,
    template_type: def.template_type,
    audience: 'professional',
    tag: 'official',
    name: def.name,
    user_id: null,
    fields: def.fields,
    sample: def.sample,
    status: 'active',
    created_at: nowIso,
    updated_at: nowIso,
    updated_by: null
  };
}

module.exports = {
  createOfficialTemplate: createOfficialTemplate
};
