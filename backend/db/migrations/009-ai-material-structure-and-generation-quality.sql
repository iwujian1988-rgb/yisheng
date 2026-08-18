ALTER TABLE ai_materials
  ADD COLUMN structured_facts JSON NULL AFTER source_meta,
  ADD COLUMN quality_state VARCHAR(32) NOT NULL DEFAULT 'ready' AFTER structured_facts,
  ADD COLUMN relevance_state VARCHAR(32) NOT NULL DEFAULT 'relevant' AFTER quality_state;

ALTER TABLE ai_generations
  ADD COLUMN quality_report JSON NULL AFTER pending_items,
  ADD COLUMN timings JSON NULL AFTER quality_report,
  ADD COLUMN claim_token VARCHAR(96) NULL AFTER status,
  ADD COLUMN claimed_at DATETIME NULL AFTER claim_token,
  ALTER COLUMN status SET DEFAULT 'pending';
