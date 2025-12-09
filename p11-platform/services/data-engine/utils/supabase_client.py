import os
from supabase import create_client, Client

# Environment is loaded by utils/config.py when imported
# This module can be imported directly or via config

def get_supabase() -> Client:
    """
    Returns a Supabase client using the service role key so ETL jobs can bypass RLS.
    """
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url:
        raise ValueError("Supabase URL not found in environment variables (SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL).")
    if not key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY not found. ETL jobs require service role access for writes.")
        
    return create_client(url, key)

# Alias for backward compatibility
get_supabase_client = get_supabase
