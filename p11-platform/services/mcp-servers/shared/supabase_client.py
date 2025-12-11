"""Shared Supabase client for MCP servers."""
import os
from supabase import create_client, Client
from typing import Optional

_client: Optional[Client] = None

def get_supabase() -> Client:
    """Get or create Supabase client singleton."""
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        _client = create_client(url, key)
    return _client



