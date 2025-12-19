-- PropertyAudit GEO Runs - Add Progress Tracking
-- For data-engine job execution monitoring

-- Add progress tracking columns to geo_runs
ALTER TABLE geo_runs
  ADD COLUMN IF NOT EXISTS progress_pct numeric DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  ADD COLUMN IF NOT EXISTS current_query_index int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now();

-- Add index for polling queries
CREATE INDEX IF NOT EXISTS idx_geo_runs_status_updated 
  ON geo_runs(status, last_updated_at DESC);

-- Add trigger to auto-update last_updated_at
CREATE OR REPLACE FUNCTION update_geo_runs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_geo_runs_timestamp
  BEFORE UPDATE ON geo_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_geo_runs_timestamp();

-- Add comment for documentation
COMMENT ON COLUMN geo_runs.progress_pct IS 
'Percentage of queries processed (0-100), updated by data-engine during execution';

COMMENT ON COLUMN geo_runs.current_query_index IS 
'Index of the query currently being processed (0-based), for resumability';

COMMENT ON COLUMN geo_runs.last_updated_at IS 
'Timestamp of last progress update, used for detecting stalled jobs';
