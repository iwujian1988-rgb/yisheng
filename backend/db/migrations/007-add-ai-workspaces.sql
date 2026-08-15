CREATE TABLE IF NOT EXISTS ai_workspaces (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  template_id VARCHAR(64) NOT NULL,
  template_version INT NOT NULL DEFAULT 1,
  audience VARCHAR(32) NOT NULL DEFAULT 'general',
  detail_level VARCHAR(32) NOT NULL DEFAULT 'standard',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  field_values JSON NOT NULL,
  material_revision INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_ai_workspaces_user_updated (user_id, updated_at),
  INDEX idx_ai_workspaces_template (template_id),
  INDEX idx_ai_workspaces_status (status)
);

CREATE TABLE IF NOT EXISTS ai_materials (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  text MEDIUMTEXT NOT NULL,
  field_key VARCHAR(255),
  client_material_id VARCHAR(96),
  status VARCHAR(32) NOT NULL DEFAULT 'included',
  source_meta JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_ai_material_client (workspace_id, client_material_id),
  INDEX idx_ai_materials_workspace_created (workspace_id, created_at),
  INDEX idx_ai_materials_user (user_id)
);

CREATE TABLE IF NOT EXISTS ai_generations (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  input_revision INT NOT NULL,
  idempotency_key VARCHAR(96) NOT NULL,
  snapshot JSON NOT NULL,
  body_text MEDIUMTEXT,
  pending_items JSON NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  created_at DATETIME NOT NULL,
  completed_at DATETIME,
  UNIQUE KEY uq_ai_generation_idempotency (workspace_id, idempotency_key),
  INDEX idx_ai_generations_workspace_created (workspace_id, created_at),
  INDEX idx_ai_generations_user (user_id)
);
