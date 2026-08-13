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
