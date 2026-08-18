CREATE TABLE admin_users (
  id VARCHAR(64) PRIMARY KEY,
  account VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  openid VARCHAR(128) UNIQUE,
  unionid VARCHAR(128),
  phone VARCHAR(32) UNIQUE,
  nickname VARCHAR(128),
  password_hash VARCHAR(255),
  status VARCHAR(32) NOT NULL,
  member_status VARCHAR(32) NOT NULL,
  member_start DATETIME NULL,
  member_end DATETIME NULL,
  disabled_at DATETIME NULL,
  disabled_reason VARCHAR(255),
  last_login DATETIME NULL,
  register_source VARCHAR(64),
  features JSON,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE devices (
  id VARCHAR(64) PRIMARY KEY,
  mac VARCHAR(64) UNIQUE,
  serial_no VARCHAR(128) NOT NULL UNIQUE,
  model VARCHAR(64),
  firmware_version VARCHAR(64),
  protocol_version VARCHAR(64),
  template_access VARCHAR(32) NOT NULL DEFAULT 'general',
  proof_code_hash VARCHAR(255),
  binding_mode VARCHAR(32) NOT NULL DEFAULT 'registered',
  bind_status VARCHAR(32) NOT NULL,
  reserved_user_id VARCHAR(64),
  bound_user_id VARCHAR(64),
  bound_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_devices_reserved_user_id (reserved_user_id),
  INDEX idx_devices_bound_user_id (bound_user_id),
  INDEX idx_devices_template_access (template_access)
);

CREATE TABLE orders (
  id VARCHAR(64) PRIMARY KEY,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  user_id VARCHAR(64) NOT NULL,
  plan_code VARCHAR(64) NOT NULL,
  amount_cents INT NOT NULL DEFAULT 0,
  pay_channel VARCHAR(32),
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  paid_at DATETIME NULL,
  cancel_at DATETIME NULL,
  refund_at DATETIME NULL,
  INDEX idx_orders_user_id (user_id),
  INDEX idx_orders_status (status)
);

CREATE TABLE activation_codes (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL,
  member_days INT NOT NULL DEFAULT 365,
  used_by VARCHAR(128),
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_activation_codes_status (status)
);

CREATE TABLE order_entitlements (
  id VARCHAR(64) PRIMARY KEY,
  order_no VARCHAR(128) NOT NULL UNIQUE,
  sku_type VARCHAR(32) NOT NULL,
  phone_hash CHAR(64) NULL,
  member_days INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL,
  claimed_by_user_id VARCHAR(64) NULL,
  claimed_at DATETIME NULL,
  refunded_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_order_entitlements_phone_status (phone_hash, status),
  INDEX idx_order_entitlements_claimed_by (claimed_by_user_id)
);

CREATE TABLE order_entitlement_requests (
  id VARCHAR(64) PRIMARY KEY,
  phone_hash CHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  entitlement_id VARCHAR(64) NULL,
  processed_by_admin_id VARCHAR(64) NULL,
  processed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_order_entitlement_requests_phone_status (phone_hash, status),
  INDEX idx_order_entitlement_requests_entitlement (entitlement_id)
);

CREATE TABLE token_usage_records (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  agent_type VARCHAR(64) NOT NULL,
  model_type VARCHAR(64) NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  question_summary VARCHAR(255),
  created_at DATETIME NOT NULL,
  INDEX idx_token_usage_user_id (user_id)
);

CREATE TABLE templates (
  id VARCHAR(64) PRIMARY KEY,
  template_code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(512),
  category VARCHAR(64),
  audience VARCHAR(32) NOT NULL DEFAULT 'general',
  department VARCHAR(64),
  scene VARCHAR(64),
  type VARCHAR(64),
  creator_id VARCHAR(64),
  prompt_content TEXT,
  variable_defs JSON,
  status VARCHAR(32) NOT NULL,
  use_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_templates_status (status),
  INDEX idx_templates_audience (audience),
  INDEX idx_templates_category (category)
);

CREATE TABLE encrypted_history (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  ciphertext TEXT NOT NULL,
  envelope JSON NOT NULL,
  source VARCHAR(32) NOT NULL,
  text_length INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  INDEX idx_encrypted_history_user_id (user_id),
  INDEX idx_encrypted_history_created_at (created_at)
);

CREATE TABLE feedbacks (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  content_length INT NOT NULL DEFAULT 0,
  has_contact BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL,
  review_remark_length INT NOT NULL DEFAULT 0,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_feedbacks_status (status),
  INDEX idx_feedbacks_user_id (user_id)
);

CREATE TABLE issues (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  description_length INT NOT NULL DEFAULT 0,
  has_serial_no BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_issues_status (status),
  INDEX idx_issues_user_id (user_id)
);

CREATE TABLE long_text_tests (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  char_count INT NOT NULL DEFAULT 0,
  elapsed_ms INT NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  mode VARCHAR(64),
  device_serial VARCHAR(64),
  created_at DATETIME NOT NULL,
  INDEX idx_long_text_tests_user_id (user_id)
);

CREATE TABLE bug_reports (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  reproduce_length INT NOT NULL DEFAULT 0,
  expected_length INT NOT NULL DEFAULT 0,
  actual_length INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_bug_reports_status (status),
  INDEX idx_bug_reports_user_id (user_id)
);

CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  operator_id VARCHAR(64),
  operator_account VARCHAR(64),
  ip VARCHAR(64),
  module VARCHAR(64) NOT NULL,
  action_type VARCHAR(64) NOT NULL,
  target_id VARCHAR(128),
  result VARCHAR(32) NOT NULL,
  before_json JSON,
  after_json JSON,
  detail VARCHAR(512),
  created_at DATETIME NOT NULL,
  INDEX idx_audit_logs_module (module),
  INDEX idx_audit_logs_created_at (created_at)
);

CREATE TABLE ai_workspaces (
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

CREATE TABLE ai_materials (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  text MEDIUMTEXT NOT NULL,
  field_key VARCHAR(255),
  client_material_id VARCHAR(96),
  status VARCHAR(32) NOT NULL DEFAULT 'included',
  source_meta JSON NOT NULL,
    structured_facts JSON NULL,
    quality_state VARCHAR(32) NOT NULL DEFAULT 'ready',
    relevance_state VARCHAR(32) NOT NULL DEFAULT 'relevant',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_ai_material_client (workspace_id, client_material_id),
  INDEX idx_ai_materials_workspace_created (workspace_id, created_at),
  INDEX idx_ai_materials_user (user_id)
);

CREATE TABLE ai_generations (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  input_revision INT NOT NULL,
  idempotency_key VARCHAR(96) NOT NULL,
  snapshot JSON NOT NULL,
  body_text MEDIUMTEXT,
  pending_items JSON NOT NULL,
  quality_report JSON NULL,
  timings JSON NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    claim_token VARCHAR(96),
    claimed_at DATETIME,
  created_at DATETIME NOT NULL,
  completed_at DATETIME,
  UNIQUE KEY uq_ai_generation_idempotency (workspace_id, idempotency_key),
  INDEX idx_ai_generations_workspace_created (workspace_id, created_at),
  INDEX idx_ai_generations_user (user_id)
);
