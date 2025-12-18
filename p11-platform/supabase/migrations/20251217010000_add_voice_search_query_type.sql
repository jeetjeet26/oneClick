-- Add voice_search to geo_query_type_enum
-- This allows tracking of question-based/conversational queries

-- Add new value to existing enum
alter type geo_query_type_enum add value if not exists 'voice_search';

-- Update any existing FAQ queries that are question-format to voice_search if desired
-- (Optional - keeping FAQ as-is for now, voice_search will be for new queries)
