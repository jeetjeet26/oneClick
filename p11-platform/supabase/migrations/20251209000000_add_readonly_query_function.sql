-- ============================================
-- Migration: Add execute_readonly_query function
-- Purpose: Safely execute read-only SQL queries
-- for the Natural Language to SQL feature
-- ============================================

-- Create a function to execute read-only queries safely
-- This function validates that queries are SELECT-only
CREATE OR REPLACE FUNCTION execute_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
    result JSONB;
    cleaned_query TEXT;
BEGIN
    -- Clean and normalize the query
    cleaned_query := UPPER(TRIM(query_text));
    
    -- Validate: Must start with SELECT
    IF NOT cleaned_query LIKE 'SELECT%' THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed';
    END IF;
    
    -- Validate: Block dangerous keywords
    IF cleaned_query LIKE '%INSERT%' OR 
       cleaned_query LIKE '%UPDATE%' OR 
       cleaned_query LIKE '%DELETE%' OR 
       cleaned_query LIKE '%DROP%' OR 
       cleaned_query LIKE '%TRUNCATE%' OR 
       cleaned_query LIKE '%ALTER%' OR 
       cleaned_query LIKE '%CREATE%' OR 
       cleaned_query LIKE '%GRANT%' OR 
       cleaned_query LIKE '%REVOKE%' THEN
        RAISE EXCEPTION 'Query contains blocked keywords';
    END IF;
    
    -- Validate: Block multiple statements
    IF query_text LIKE '%;%' AND query_text NOT LIKE '%;' AND LENGTH(query_text) - LENGTH(REPLACE(query_text, ';', '')) > 1 THEN
        RAISE EXCEPTION 'Multiple SQL statements not allowed';
    END IF;
    
    -- Execute the query and return results as JSONB
    EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', 
                   TRIM(TRAILING ';' FROM query_text))
    INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN jsonb_build_object(
            'error', true,
            'message', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION execute_readonly_query IS 'Safely executes read-only SQL queries for the NL-to-SQL feature. Blocks any write operations.';

