CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(64) PRIMARY KEY,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  subject_kind VARCHAR(32) NOT NULL,
  subject_id VARCHAR(64) NOT NULL,
  subject_openid VARCHAR(128),
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_auth_sessions_subject (subject_kind, subject_id),
  INDEX idx_auth_sessions_expires_at (expires_at)
);
