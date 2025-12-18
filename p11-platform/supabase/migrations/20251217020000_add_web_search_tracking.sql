-- Add web search tracking to geo_runs
-- This allows us to differentiate between runs with and without web search enabled

ALTER TABLE geo_runs ADD COLUMN IF NOT EXISTS uses_web_search BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_geo_runs_web_search ON geo_runs(uses_web_search);

-- Update existing runs to false (they didn't have web search)
UPDATE geo_runs SET uses_web_search = false WHERE uses_web_search IS NULL;

COMMENT ON COLUMN geo_runs.uses_web_search IS 'Whether this run used web search tools to enhance LLM responses';
