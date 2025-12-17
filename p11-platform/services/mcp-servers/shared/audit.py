"""Audit logging for MCP operations."""
import json
from datetime import datetime
from typing import Any, Optional
from .supabase_client import get_supabase

async def log_mcp_operation(
    platform: str,
    tool_name: str,
    operation_type: str,  # 'read' or 'write'
    parameters: dict,
    result: Any,
    success: bool = True,
    error_message: Optional[str] = None,
    property_id: Optional[str] = None,
):
    """Log an MCP operation to the audit table."""
    try:
        supabase = get_supabase()
        supabase.table('mcp_audit_log').insert({
            'platform': platform,
            'tool_name': tool_name,
            'operation_type': operation_type,
            'parameters': parameters,
            'result': result if isinstance(result, dict) else {'value': str(result)},
            'success': success,
            'error_message': error_message,
            'property_id': property_id,
            'created_at': datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        # Don't fail the operation if audit logging fails
        print(f"Warning: Failed to log MCP operation: {e}")














