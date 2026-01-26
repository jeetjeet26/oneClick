-- Add batch support and cross-model analysis columns to geo_runs
-- These enable parallel execution of OpenAI + Claude runs and unified analysis

-- batch_id: Groups runs that should be analyzed together (e.g., same property, same time)
ALTER TABLE geo_runs 
  ADD COLUMN IF NOT EXISTS batch_id uuid;

-- cross_model_analysis: Stores results of comparing OpenAI vs Claude runs
ALTER TABLE geo_runs 
  ADD COLUMN IF NOT EXISTS cross_model_analysis jsonb DEFAULT NULL;

-- Index for efficient batch queries
CREATE INDEX IF NOT EXISTS idx_geo_runs_batch_id 
  ON geo_runs(batch_id) 
  WHERE batch_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN geo_runs.batch_id IS 
'Groups runs that should be analyzed together (e.g., OpenAI + Claude runs for same audit). All runs in a batch share this UUID.';

COMMENT ON COLUMN geo_runs.cross_model_analysis IS 
'JSON object containing cross-model analysis results: agreement_rate, score_comparison, visibility_comparison, recommendations. Set after all runs in a batch complete.';

-- Example structure for cross_model_analysis:
-- {
--   "analyzed_at": "2024-12-18T10:30:00Z",
--   "agreement_rate": 85.5,
--   "score_comparison": {
--     "openai_overall": 72.5,
--     "claude_overall": 68.3,
--     "difference": 4.2,
--     "higher_model": "openai"
--   },
--   "visibility_comparison": {
--     "openai_visibility": 80,
--     "claude_visibility": 75,
--     "difference": 5
--   },
--   "recommendations": {
--     "summary": "...",
--     "key_insights": [...],
--     "action_items": [...]
--   }
-- }







