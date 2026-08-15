ALTER TABLE agent_templates
  ADD COLUMN template_version INT NOT NULL DEFAULT 1 AFTER tag,
  ADD COLUMN generation_contract JSON NULL AFTER sample,
  ADD COLUMN writing_blueprint JSON NULL AFTER generation_contract;
