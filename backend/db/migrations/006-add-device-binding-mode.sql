ALTER TABLE devices
  ADD COLUMN binding_mode VARCHAR(32) NOT NULL DEFAULT 'registered' AFTER proof_code_hash;
