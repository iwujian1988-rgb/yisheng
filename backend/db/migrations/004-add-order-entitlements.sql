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
