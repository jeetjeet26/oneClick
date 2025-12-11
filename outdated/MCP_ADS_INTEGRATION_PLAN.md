# MCP Integration Plan: Google Ads & Meta Ads Management

> **Purpose**: Enable LLM-driven read/write management of Google Ads and Meta Ads channels via Model Context Protocol (MCP) servers.
>
> **Strategy**: Build custom MCP servers with full Supabase integration, property-specific context, and audit logging
>
> **References**: 
> - [meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp) - Comprehensive Meta Ads MCP with 29 tools
> - [mcp-google-ads](https://github.com/cohnen/mcp-google-ads) - Google Ads MCP reference
> - [MCP Documentation](https://modelcontextprotocol.io/)
>
> **Created**: December 10, 2025  
> **Updated**: December 10, 2025 - Full custom build strategy

---

## 🚀 Quick Start Guide

### For the Impatient Developer

**Want to start coding right now?**

1. **Review the reference**: Browse [meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp) for architecture inspiration
2. **Jump to Phase 1**: [Infrastructure Setup](#phase-1-infrastructure-setup) (copy-paste ready)
3. **Get credentials**: Ensure Google Ads + Meta Ads tokens are in `.env.local`
4. **Run commands**: Execute Phase 1 Task 1.1 directory creation, then Phase 1 Task 1.5 venv setup
5. **Start coding**: Begin with Phase 2 Task 2.1 (Google Ads config)

**Timeline**: 20-27 hours for full READ-only implementation (Phases 1-5)

---

## Table of Contents

1. [Quick Start Guide](#-quick-start-guide)
2. [Executive Summary](#executive-summary)
3. [Current State](#current-state)
4. [Target State](#target-state)
5. [Risk Mitigation](#risk-mitigation)
6. [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
7. [Phase 2: Google Ads MCP Server (READ-only)](#phase-2-google-ads-mcp-server-read-only)
8. [Phase 3: Meta Ads MCP Server (READ-only)](#phase-3-meta-ads-mcp-server-read-only)
9. [Phase 4: Database & Audit Logging](#phase-4-database--audit-logging)
10. [Phase 5: Cursor Integration](#phase-5-cursor-integration)
11. [Phase 6: Write Operations (Future)](#phase-6-write-operations-future)
12. [Phase 7: Property-Context Integration](#phase-7-property-context-integration)
13. [Decision Matrix: Custom vs. Pre-built](#decision-matrix-custom-vs-pre-built)
14. [Testing Checklist](#testing-checklist)
15. [Appendix: Code Templates](#appendix-code-templates)

---

## Executive Summary

### What We're Building

Two **custom Python-based MCP servers** that integrate deeply with your P11 Platform:

```
User: "Show me Google Ads performance for Sunset Apartments this month"
Claude: [calls get_property_ads_performance tool]
        ↓ Looks up property_id from database
        ↓ Fetches from Google Ads API  
        ↓ Logs to mcp_audit_log table
        ↓ Syncs to fact_marketing_performance
        → Returns formatted results with budget alerts
```

### Why Custom Build?

**Inspired by [meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp)** (29 tools, production-ready), but extended for your needs:

| Feature | Pre-built MCP | **Our Custom Build** |
|---------|--------------|---------------------|
| Basic API access | ✅ | ✅ |
| **Supabase integration** | ❌ | ✅ Audit logs + data sync |
| **Property context** | ❌ | ✅ "Sunset Apartments" vs account IDs |
| **Multi-tenant aware** | ❌ | ✅ Org/property isolation |
| **Custom formatting** | ❌ | ✅ Budget alerts, PM-friendly output |
| **Database syncing** | ❌ | ✅ Auto-sync to fact_marketing_performance |

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Implementation approach | **Custom build for both** | Deep P11 integration required |
| Initial scope | **READ-only first** | Avoid accidental financial impact |
| Architecture reference | **meta-ads-mcp structure** | Battle-tested, 29-tool template |
| Credential strategy | **Shared env vars** | Simpler; can separate later |
| Python environment | **Separate venvs** | Avoid dependency conflicts |

### Timeline Estimate

| Phase | Duration | Priority | Deliverable |
|-------|----------|----------|-------------|
| Phase 1: Infrastructure | 3-4 hours | ⭐⭐⭐ | Shared utils, venvs, directory structure |
| Phase 2: Google Ads MCP (READ) | 6-8 hours | ⭐⭐⭐ | 6 read-only tools + Supabase integration |
| Phase 3: Meta Ads MCP (READ) | 8-10 hours | ⭐⭐⭐ | 20+ read-only tools (inspired by meta-ads-mcp) |
| Phase 4: Database & Audit | 2-3 hours | ⭐⭐⭐ | Migration, audit logging, data sync |
| Phase 5: Cursor Integration | 1-2 hours | ⭐⭐⭐ | MCP config, testing, verification |
| Phase 6: Write Operations | 12-16 hours | ⭐⭐ | CRUD ops with guardrails |
| Phase 7: Property Context | 4-6 hours | ⭐⭐ | Property-aware tools, auto-lookup |

**Total READ-only (Phases 1-5)**: 20-27 hours  
**Total with WRITE (Phases 6)**: 32-43 hours  
**Total with Property Context (Phase 7)**: 36-49 hours

---

## Current State

### Existing Google Ads Integration

**Location**: `services/data-engine/pipelines/google_ads.py`

```python
# Current capability: READ-only ETL
def fetch_google_data(customer_id, client_config, login_customer_id):
    """Fetches Campaign performance via GAQL (last 3 days only)"""
    query = """
        SELECT segments.date, campaign.id, campaign.name, 
               metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions 
        FROM campaign WHERE segments.date DURING LAST_3_DAYS
    """
```

**Credentials** (from `.env.local`):
- `GOOGLE_ADS_CUSTOMER_ID`: MCC ID (163-050-5086)
- `GOOGLE_ADS_DEVELOPER_TOKEN`: ✅ Configured
- `GOOGLE_ADS_REFRESH_TOKEN`: ✅ Configured
- `GOOGLE_ADS_CLIENT_ID`: ✅ Configured
- `GOOGLE_ADS_CLIENT_SECRET`: ✅ Configured

### Existing Meta Ads Integration

**Location**: `services/data-engine/pipelines/meta_ads.py`

```python
# Current capability: READ-only ETL
class MetaAdsClient:
    def get_insights(self, date_preset="yesterday"):
        """Fetches ad-level insights from Graph API v19.0"""
```

**Credentials** (from `.env.local`):
- `META_ACCESS_TOKEN`: ❌ Not configured
- `META_AD_ACCOUNT_ID`: ❌ Not configured
- `META_APP_ID`: ❌ Not configured (needed for OAuth)
- `META_APP_SECRET`: ❌ Not configured

### Database Tables

| Table | Purpose |
|-------|---------|
| `fact_marketing_performance` | Stores synced ad performance data |
| `ad_account_connections` | Links ad accounts to properties |
| `properties` | Multi-tenant property management |

---

## Target State

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cursor / Claude Desktop                       │
│                      (MCP Client / LLM)                          │
└─────────────┬───────────────────────────────────┬───────────────┘
              │                                   │
              ▼                                   ▼
┌─────────────────────────┐       ┌─────────────────────────────┐
│  mcp-google-ads-server  │       │    mcp-meta-ads-server      │
│  (Python, port: stdio)  │       │    (Python, port: stdio)    │
│                         │       │                             │
│  Tools:                 │       │  Tools:                     │
│  • list_accounts        │       │  • list_ad_accounts         │
│  • execute_gaql_query   │       │  • get_campaign_insights    │
│  • get_campaign_perf    │       │  • get_adset_insights       │
│  • get_ad_performance   │       │  • get_ad_performance       │
│  • get_keywords         │       │  • get_audiences            │
└─────────────┬───────────┘       └─────────────┬───────────────┘
              │                                   │
              ▼                                   ▼
┌─────────────────────────┐       ┌─────────────────────────────┐
│   Google Ads API v18    │       │   Meta Marketing API v19    │
└─────────────────────────┘       └─────────────────────────────┘
              │                                   │
              └───────────────┬───────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │      Supabase Database        │
              │  • mcp_audit_log (NEW)        │
              │  • fact_marketing_performance │
              └───────────────────────────────┘
```

### MCP Tools Inventory

#### Google Ads Tools (Phase 2)

| Tool | Type | Description |
|------|------|-------------|
| `list_accounts` | READ | List all accessible accounts via MCC |
| `execute_gaql_query` | READ | Run arbitrary GAQL SELECT queries |
| `get_campaign_performance` | READ | Campaign metrics with date range |
| `get_ad_performance` | READ | Ad-level metrics |
| `get_keywords` | READ | Keyword list with quality scores |
| `get_account_budget` | READ | Account-level budget info |

#### Meta Ads Tools (Phase 3)

**Inspired by [meta-ads-mcp's 29 tools](https://github.com/pipeboard-co/meta-ads-mcp)** - categorized for P11 Platform:

**Account Management (5 tools)**
| Tool | Type | Description |
|------|------|-------------|
| `list_ad_accounts` | READ | List accessible ad accounts |
| `get_account_info` | READ | Account spending limits, status, currency |
| `get_login_link` | READ | Get Meta authentication URL |
| `search_accounts` | READ | Search across accounts by name |
| `get_billing_events` | READ | Billing history and events |

**Campaign Management (8 tools)**
| Tool | Type | Description |
|------|------|-------------|
| `get_campaigns` | READ | List all campaigns |
| `get_campaign_insights` | READ | Campaign performance metrics |
| `create_campaign` | WRITE | Create new campaign |
| `update_campaign` | WRITE | Modify campaign settings |
| `delete_campaign` | WRITE | Remove campaign |
| `get_campaign_budget` | READ | Current budget allocation |
| `create_budget_schedule` | WRITE | Schedule budget changes |
| `search_campaigns` | READ | Search campaigns by criteria |

**AdSet Management (6 tools)**
| Tool | Type | Description |
|------|------|-------------|
| `get_adsets` | READ | List ad sets |
| `get_adset_insights` | READ | Adset-level performance |
| `create_adset` | WRITE | Create new ad set |
| `update_adset` | WRITE | Modify targeting/budget/frequency caps |
| `delete_adset` | WRITE | Remove ad set |
| `search_adsets` | READ | Search ad sets |

**Ad Management (7 tools)**
| Tool | Type | Description |
|------|------|-------------|
| `get_ads` | READ | List ads |
| `get_ad_insights` | READ | Ad creative performance |
| `get_ad_image` | READ | Download and visualize ad image |
| `create_ad` | WRITE | Create new ad |
| `update_ad` | WRITE | Modify ad status/bid |
| `delete_ad` | WRITE | Remove ad |
| `upload_image` | WRITE | Upload ad creative image |

**Targeting & Audiences (6 tools)**
| Tool | Type | Description |
|------|------|-------------|
| `get_audiences` | READ | Custom/lookalike audiences |
| `search_interests` | READ | Find interest targeting options |
| `get_interest_suggestions` | READ | Get related interests |
| `validate_interests` | READ | Verify interest IDs/names |
| `search_behaviors` | READ | Behavior targeting options |
| `search_demographics` | READ | Demographic targeting criteria |
| `search_geo_locations` | READ | Geographic targeting locations |

**Insights & Analytics (2 tools)**
| Tool | Type | Description |
|------|------|-------------|
| `get_insights` | READ | Universal insights (campaign/adset/ad/account) |
| `get_insights_breakdown` | READ | Insights with age/gender/country breakdown |

**Pages & Assets (2 tools)**
| Tool | Type | Description |
|------|------|-------------|
| `get_pages` | READ | List Facebook/Instagram pages |
| `search_pages` | READ | Search pages by name |

---

## Risk Mitigation

### Isolation Strategy

```
services/
├── data-engine/          # EXISTING - DO NOT MODIFY
│   ├── pipelines/
│   ├── venv/
│   └── ...
│
└── mcp-servers/          # NEW - ISOLATED
    ├── google-ads/
    │   └── venv/         # Separate Python environment
    └── meta-ads/
        └── venv/         # Separate Python environment
```

### Safety Rules

1. **READ-only first**: No write tools until Phase 6
2. **Separate venvs**: Avoid dependency conflicts
3. **Audit logging**: Log all MCP operations to database
4. **Credential reuse**: Use same env vars as existing pipelines

### What We're NOT Changing

- ❌ `pipelines/google_ads.py`
- ❌ `pipelines/meta_ads.py`
- ❌ `apps/web/` API routes
- ❌ Existing database tables
- ❌ Scheduled pipeline jobs

---

## Phase 1: Infrastructure Setup

**Duration**: 2-3 hours

### Task 1.1: Create Directory Structure

```bash
# Run from p11-platform/services/
mkdir -p mcp-servers/google-ads/tools
mkdir -p mcp-servers/meta-ads/tools
mkdir -p mcp-servers/shared
```

**Target structure**:
```
services/mcp-servers/
├── google-ads/
│   ├── __init__.py
│   ├── server.py
│   ├── config.py
│   ├── auth.py
│   ├── requirements.txt
│   └── tools/
│       ├── __init__.py
│       ├── accounts.py
│       ├── campaigns.py
│       ├── queries.py
│       └── performance.py
├── meta-ads/
│   ├── __init__.py
│   ├── server.py
│   ├── config.py
│   ├── auth.py
│   ├── requirements.txt
│   └── tools/
│       ├── __init__.py
│       ├── accounts.py
│       ├── campaigns.py
│       └── insights.py
└── shared/
    ├── __init__.py
    ├── supabase_client.py
    ├── audit.py
    └── formatters.py
```

### Task 1.2: Create Google Ads Requirements

**File**: `services/mcp-servers/google-ads/requirements.txt`

```txt
# MCP SDK
mcp>=1.0.0

# Google Ads
google-ads>=24.0.0

# Utilities
python-dotenv>=1.0.0
pydantic>=2.0.0
supabase>=2.0.0
httpx>=0.25.0
```

### Task 1.3: Create Meta Ads Requirements

**File**: `services/mcp-servers/meta-ads/requirements.txt`

```txt
# MCP SDK
mcp>=1.0.0

# HTTP client for Graph API
httpx>=0.25.0

# Utilities
python-dotenv>=1.0.0
pydantic>=2.0.0
supabase>=2.0.0
```

### Task 1.4: Create Shared Utilities

**File**: `services/mcp-servers/shared/supabase_client.py`

```python
"""Shared Supabase client for MCP servers."""
import os
from supabase import create_client, Client

_client: Client | None = None

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
```

**File**: `services/mcp-servers/shared/audit.py`

```python
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
```

**File**: `services/mcp-servers/shared/formatters.py`

```python
"""Output formatters for MCP tools."""

def format_currency(micros: int) -> str:
    """Convert micros to formatted currency string."""
    return f"${micros / 1_000_000:,.2f}"

def format_number(n: int) -> str:
    """Format large numbers with commas."""
    return f"{n:,}"

def format_percentage(value: float) -> str:
    """Format as percentage."""
    return f"{value:.2f}%"

def format_campaign_row(campaign: dict) -> str:
    """Format a campaign as a readable row."""
    return (
        f"• {campaign.get('name', 'Unknown')} "
        f"(ID: {campaign.get('id', 'N/A')})\n"
        f"  Status: {campaign.get('status', 'Unknown')} | "
        f"Spend: {format_currency(campaign.get('cost_micros', 0))} | "
        f"Clicks: {format_number(campaign.get('clicks', 0))} | "
        f"Conversions: {campaign.get('conversions', 0)}"
    )
```

### Task 1.5: Set Up Virtual Environments

```bash
# Google Ads MCP Server
cd services/mcp-servers/google-ads
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Meta Ads MCP Server
cd ../meta-ads
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Task 1.6: Create __init__.py Files

```bash
# Create empty __init__.py files
echo. > services/mcp-servers/__init__.py
echo. > services/mcp-servers/shared/__init__.py
echo. > services/mcp-servers/google-ads/__init__.py
echo. > services/mcp-servers/google-ads/tools/__init__.py
echo. > services/mcp-servers/meta-ads/__init__.py
echo. > services/mcp-servers/meta-ads/tools/__init__.py
```

---

## Phase 2: Google Ads MCP Server (READ-only)

**Duration**: 3-4 hours

### Task 2.1: Create Config Module

**File**: `services/mcp-servers/google-ads/config.py`

```python
"""Configuration for Google Ads MCP Server."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load from multiple possible locations
env_paths = [
    Path(__file__).parent.parent.parent.parent / "apps" / "web" / ".env.local",
    Path(__file__).parent.parent.parent.parent.parent / ".env",
    Path(__file__).parent / ".env",
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break

# Google Ads Configuration
GOOGLE_ADS_CUSTOMER_ID = os.environ.get("GOOGLE_ADS_CUSTOMER_ID", "").replace("-", "")
GOOGLE_ADS_DEVELOPER_TOKEN = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN")
GOOGLE_ADS_REFRESH_TOKEN = os.environ.get("GOOGLE_ADS_REFRESH_TOKEN")
GOOGLE_ADS_CLIENT_ID = os.environ.get("GOOGLE_ADS_CLIENT_ID")
GOOGLE_ADS_CLIENT_SECRET = os.environ.get("GOOGLE_ADS_CLIENT_SECRET")

# Supabase Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def get_google_ads_config() -> dict:
    """Get Google Ads client configuration dict."""
    if not all([GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_REFRESH_TOKEN, 
                GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET]):
        raise ValueError("Missing Google Ads credentials. Check environment variables.")
    
    return {
        "developer_token": GOOGLE_ADS_DEVELOPER_TOKEN,
        "refresh_token": GOOGLE_ADS_REFRESH_TOKEN,
        "client_id": GOOGLE_ADS_CLIENT_ID,
        "client_secret": GOOGLE_ADS_CLIENT_SECRET,
        "use_proto_plus": True,
    }

def is_configured() -> bool:
    """Check if Google Ads is properly configured."""
    return all([
        GOOGLE_ADS_CUSTOMER_ID,
        GOOGLE_ADS_DEVELOPER_TOKEN,
        GOOGLE_ADS_REFRESH_TOKEN,
        GOOGLE_ADS_CLIENT_ID,
        GOOGLE_ADS_CLIENT_SECRET,
    ])
```

### Task 2.2: Create Auth Module

**File**: `services/mcp-servers/google-ads/auth.py`

```python
"""Authentication utilities for Google Ads API."""
from google.ads.googleads.client import GoogleAdsClient
from .config import get_google_ads_config, GOOGLE_ADS_CUSTOMER_ID

_client: GoogleAdsClient | None = None

def get_client() -> GoogleAdsClient:
    """Get or create Google Ads client singleton."""
    global _client
    if _client is None:
        config = get_google_ads_config()
        _client = GoogleAdsClient.load_from_dict(config)
    return _client

def get_mcc_id() -> str:
    """Get the MCC (Manager) account ID."""
    return GOOGLE_ADS_CUSTOMER_ID

def format_customer_id(customer_id: str) -> str:
    """Format customer ID with dashes (123-456-7890)."""
    clean = customer_id.replace("-", "")
    if len(clean) != 10:
        return customer_id
    return f"{clean[:3]}-{clean[3:6]}-{clean[6:]}"

def clean_customer_id(customer_id: str) -> str:
    """Remove dashes from customer ID."""
    return customer_id.replace("-", "")
```

### Task 2.3: Create Account Tools

**File**: `services/mcp-servers/google-ads/tools/accounts.py`

```python
"""Account-related tools for Google Ads MCP."""
from typing import Any
from ..auth import get_client, get_mcc_id, format_customer_id

async def list_accounts() -> list[dict[str, Any]]:
    """
    List all Google Ads accounts accessible via the MCC.
    
    Returns:
        List of accounts with id, name, currency, and status.
    """
    client = get_client()
    mcc_id = get_mcc_id()
    
    # First, get accessible customer IDs
    customer_service = client.get_service("CustomerService")
    accessible = customer_service.list_accessible_customers()
    
    accounts = []
    ga_service = client.get_service("GoogleAdsService")
    
    for resource_name in accessible.resource_names:
        customer_id = resource_name.replace("customers/", "")
        
        try:
            query = """
                SELECT 
                    customer.id,
                    customer.descriptive_name,
                    customer.currency_code,
                    customer.time_zone,
                    customer.manager,
                    customer.test_account,
                    customer.status
                FROM customer
                LIMIT 1
            """
            
            response = ga_service.search(
                customer_id=customer_id,
                query=query,
                login_customer_id=mcc_id
            )
            
            for row in response:
                if not row.customer.manager:  # Skip manager accounts
                    accounts.append({
                        "id": format_customer_id(str(row.customer.id)),
                        "name": row.customer.descriptive_name,
                        "currency": row.customer.currency_code,
                        "timezone": row.customer.time_zone,
                        "is_test": row.customer.test_account,
                        "status": row.customer.status.name,
                    })
        except Exception as e:
            # Some accounts may not be accessible
            continue
    
    return accounts

async def get_account_info(customer_id: str) -> dict[str, Any]:
    """
    Get detailed information about a specific account.
    
    Args:
        customer_id: Google Ads customer ID (format: 123-456-7890)
    
    Returns:
        Account details including billing, settings, and access level.
    """
    client = get_client()
    mcc_id = get_mcc_id()
    clean_id = customer_id.replace("-", "")
    
    query = """
        SELECT 
            customer.id,
            customer.descriptive_name,
            customer.currency_code,
            customer.time_zone,
            customer.auto_tagging_enabled,
            customer.has_partners_badge,
            customer.optimization_score,
            customer.optimization_score_weight
        FROM customer
        LIMIT 1
    """
    
    ga_service = client.get_service("GoogleAdsService")
    response = ga_service.search(
        customer_id=clean_id,
        query=query,
        login_customer_id=mcc_id
    )
    
    for row in response:
        return {
            "id": format_customer_id(str(row.customer.id)),
            "name": row.customer.descriptive_name,
            "currency": row.customer.currency_code,
            "timezone": row.customer.time_zone,
            "auto_tagging": row.customer.auto_tagging_enabled,
            "partner_badge": row.customer.has_partners_badge,
            "optimization_score": row.customer.optimization_score,
        }
    
    return {"error": "Account not found"}
```

### Task 2.4: Create Query Tools

**File**: `services/mcp-servers/google-ads/tools/queries.py`

```python
"""GAQL query execution tools."""
from typing import Any
from ..auth import get_client, get_mcc_id, clean_customer_id

# Disallowed keywords for safety (READ-only)
WRITE_KEYWORDS = ["INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "MUTATE"]

def validate_query(query: str) -> tuple[bool, str]:
    """Validate that a query is read-only."""
    upper_query = query.upper()
    for keyword in WRITE_KEYWORDS:
        if keyword in upper_query:
            return False, f"Write operations not allowed. Found: {keyword}"
    
    if not upper_query.strip().startswith("SELECT"):
        return False, "Query must start with SELECT"
    
    return True, ""

async def execute_gaql_query(
    customer_id: str,
    query: str,
    limit: int = 100
) -> list[dict[str, Any]]:
    """
    Execute a GAQL (Google Ads Query Language) query.
    
    Args:
        customer_id: Google Ads customer ID (format: 123-456-7890)
        query: GAQL SELECT query
        limit: Maximum rows to return (default: 100)
    
    Returns:
        List of result rows as dictionaries.
    
    Example queries:
        - SELECT campaign.name, metrics.clicks FROM campaign
        - SELECT ad_group.name, metrics.impressions FROM ad_group WHERE campaign.id = 123
    """
    # Validate query is read-only
    is_valid, error = validate_query(query)
    if not is_valid:
        return [{"error": error}]
    
    # Add LIMIT if not present
    if "LIMIT" not in query.upper():
        query = f"{query.strip()} LIMIT {limit}"
    
    client = get_client()
    mcc_id = get_mcc_id()
    clean_id = clean_customer_id(customer_id)
    
    ga_service = client.get_service("GoogleAdsService")
    
    try:
        response = ga_service.search(
            customer_id=clean_id,
            query=query,
            login_customer_id=mcc_id
        )
        
        results = []
        for row in response:
            # Convert protobuf to dict
            row_dict = {}
            for field in row._pb.DESCRIPTOR.fields:
                value = getattr(row, field.name, None)
                if value is not None:
                    # Handle nested objects
                    if hasattr(value, '_pb'):
                        nested = {}
                        for nested_field in value._pb.DESCRIPTOR.fields:
                            nested_value = getattr(value, nested_field.name, None)
                            if nested_value is not None:
                                nested[nested_field.name] = str(nested_value) if hasattr(nested_value, '_pb') else nested_value
                        row_dict[field.name] = nested
                    else:
                        row_dict[field.name] = value
            results.append(row_dict)
        
        return results
        
    except Exception as e:
        return [{"error": str(e)}]
```

### Task 2.5: Create Campaign Performance Tools

**File**: `services/mcp-servers/google-ads/tools/performance.py`

```python
"""Performance reporting tools."""
from typing import Any, Literal
from ..auth import get_client, get_mcc_id, clean_customer_id
import sys
sys.path.append(str(Path(__file__).parent.parent.parent.parent))
from shared.formatters import format_currency, format_number

DateRange = Literal[
    "TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_14_DAYS", 
    "LAST_30_DAYS", "THIS_MONTH", "LAST_MONTH"
]

async def get_campaign_performance(
    customer_id: str,
    date_range: DateRange = "LAST_30_DAYS",
    limit: int = 20,
    order_by: str = "metrics.cost_micros DESC"
) -> list[dict[str, Any]]:
    """
    Get campaign performance metrics.
    
    Args:
        customer_id: Google Ads customer ID (format: 123-456-7890)
        date_range: GAQL date preset (LAST_7_DAYS, LAST_30_DAYS, etc.)
        limit: Maximum campaigns to return
        order_by: Sort order (default: by spend descending)
    
    Returns:
        List of campaigns with performance metrics.
    """
    client = get_client()
    mcc_id = get_mcc_id()
    clean_id = clean_customer_id(customer_id)
    
    query = f"""
        SELECT 
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            campaign_budget.amount_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value,
            metrics.ctr,
            metrics.average_cpc
        FROM campaign
        WHERE segments.date DURING {date_range}
        ORDER BY {order_by}
        LIMIT {limit}
    """
    
    ga_service = client.get_service("GoogleAdsService")
    response = ga_service.search(
        customer_id=clean_id,
        query=query,
        login_customer_id=mcc_id
    )
    
    campaigns = []
    for row in response:
        ctr = row.metrics.ctr * 100 if row.metrics.ctr else 0
        campaigns.append({
            "id": str(row.campaign.id),
            "name": row.campaign.name,
            "status": row.campaign.status.name,
            "channel": row.campaign.advertising_channel_type.name,
            "budget": row.campaign_budget.amount_micros,
            "budget_formatted": format_currency(row.campaign_budget.amount_micros),
            "impressions": row.metrics.impressions,
            "clicks": row.metrics.clicks,
            "spend": row.metrics.cost_micros,
            "spend_formatted": format_currency(row.metrics.cost_micros),
            "conversions": row.metrics.conversions,
            "conversion_value": row.metrics.conversions_value,
            "ctr": round(ctr, 2),
            "avg_cpc": row.metrics.average_cpc,
            "avg_cpc_formatted": format_currency(row.metrics.average_cpc),
        })
    
    return campaigns

async def get_ad_performance(
    customer_id: str,
    campaign_id: str | None = None,
    date_range: DateRange = "LAST_30_DAYS",
    limit: int = 50
) -> list[dict[str, Any]]:
    """
    Get ad-level performance metrics.
    
    Args:
        customer_id: Google Ads customer ID
        campaign_id: Optional campaign ID to filter by
        date_range: GAQL date preset
        limit: Maximum ads to return
    
    Returns:
        List of ads with performance metrics.
    """
    client = get_client()
    mcc_id = get_mcc_id()
    clean_id = clean_customer_id(customer_id)
    
    where_clause = f"WHERE segments.date DURING {date_range}"
    if campaign_id:
        where_clause += f" AND campaign.id = {campaign_id}"
    
    query = f"""
        SELECT 
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.ad.type,
            ad_group_ad.status,
            ad_group.name,
            campaign.name,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr
        FROM ad_group_ad
        {where_clause}
        ORDER BY metrics.cost_micros DESC
        LIMIT {limit}
    """
    
    ga_service = client.get_service("GoogleAdsService")
    response = ga_service.search(
        customer_id=clean_id,
        query=query,
        login_customer_id=mcc_id
    )
    
    ads = []
    for row in response:
        ads.append({
            "ad_id": str(row.ad_group_ad.ad.id),
            "ad_name": row.ad_group_ad.ad.name or "Unnamed Ad",
            "ad_type": row.ad_group_ad.ad.type_.name,
            "status": row.ad_group_ad.status.name,
            "ad_group": row.ad_group.name,
            "campaign": row.campaign.name,
            "impressions": row.metrics.impressions,
            "clicks": row.metrics.clicks,
            "spend": format_currency(row.metrics.cost_micros),
            "conversions": row.metrics.conversions,
            "ctr": round(row.metrics.ctr * 100, 2),
        })
    
    return ads

async def get_keywords(
    customer_id: str,
    campaign_id: str | None = None,
    date_range: DateRange = "LAST_30_DAYS",
    limit: int = 100
) -> list[dict[str, Any]]:
    """
    Get keyword performance with quality scores.
    
    Args:
        customer_id: Google Ads customer ID
        campaign_id: Optional campaign ID to filter by
        date_range: GAQL date preset
        limit: Maximum keywords to return
    
    Returns:
        List of keywords with metrics and quality scores.
    """
    client = get_client()
    mcc_id = get_mcc_id()
    clean_id = clean_customer_id(customer_id)
    
    where_clause = f"WHERE segments.date DURING {date_range}"
    if campaign_id:
        where_clause += f" AND campaign.id = {campaign_id}"
    
    query = f"""
        SELECT 
            ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type,
            ad_group_criterion.quality_info.quality_score,
            ad_group_criterion.status,
            ad_group.name,
            campaign.name,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.average_cpc
        FROM keyword_view
        {where_clause}
        ORDER BY metrics.cost_micros DESC
        LIMIT {limit}
    """
    
    ga_service = client.get_service("GoogleAdsService")
    response = ga_service.search(
        customer_id=clean_id,
        query=query,
        login_customer_id=mcc_id
    )
    
    keywords = []
    for row in response:
        keywords.append({
            "keyword": row.ad_group_criterion.keyword.text,
            "match_type": row.ad_group_criterion.keyword.match_type.name,
            "quality_score": row.ad_group_criterion.quality_info.quality_score,
            "status": row.ad_group_criterion.status.name,
            "ad_group": row.ad_group.name,
            "campaign": row.campaign.name,
            "impressions": row.metrics.impressions,
            "clicks": row.metrics.clicks,
            "spend": format_currency(row.metrics.cost_micros),
            "conversions": row.metrics.conversions,
            "avg_cpc": format_currency(row.metrics.average_cpc),
        })
    
    return keywords
```

### Task 2.6: Create Main Server

**File**: `services/mcp-servers/google-ads/server.py`

```python
"""Google Ads MCP Server - Main entry point."""
import asyncio
import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from .config import is_configured, GOOGLE_ADS_CUSTOMER_ID
from .auth import format_customer_id
from .tools.accounts import list_accounts, get_account_info
from .tools.queries import execute_gaql_query
from .tools.performance import (
    get_campaign_performance, 
    get_ad_performance, 
    get_keywords
)

# Create server instance
server = Server("google-ads-mcp")

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available Google Ads tools."""
    return [
        Tool(
            name="list_google_ads_accounts",
            description="List all Google Ads accounts accessible via the MCC (Manager account). Returns account IDs, names, and status.",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="get_google_ads_account_info",
            description="Get detailed information about a specific Google Ads account.",
            inputSchema={
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "string",
                        "description": "Google Ads customer ID (format: 123-456-7890)"
                    }
                },
                "required": ["customer_id"]
            }
        ),
        Tool(
            name="execute_google_ads_query",
            description="Execute a GAQL (Google Ads Query Language) SELECT query. Only read operations are allowed.",
            inputSchema={
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "string",
                        "description": "Google Ads customer ID (format: 123-456-7890)"
                    },
                    "query": {
                        "type": "string",
                        "description": "GAQL SELECT query (e.g., 'SELECT campaign.name, metrics.clicks FROM campaign')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum rows to return (default: 100)",
                        "default": 100
                    }
                },
                "required": ["customer_id", "query"]
            }
        ),
        Tool(
            name="get_google_ads_campaign_performance",
            description="Get campaign performance metrics including spend, clicks, impressions, and conversions.",
            inputSchema={
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "string",
                        "description": "Google Ads customer ID (format: 123-456-7890)"
                    },
                    "date_range": {
                        "type": "string",
                        "description": "Date range: TODAY, YESTERDAY, LAST_7_DAYS, LAST_14_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH",
                        "default": "LAST_30_DAYS"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum campaigns to return (default: 20)",
                        "default": 20
                    }
                },
                "required": ["customer_id"]
            }
        ),
        Tool(
            name="get_google_ads_ad_performance",
            description="Get ad-level performance metrics.",
            inputSchema={
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "string",
                        "description": "Google Ads customer ID"
                    },
                    "campaign_id": {
                        "type": "string",
                        "description": "Optional: Filter by campaign ID"
                    },
                    "date_range": {
                        "type": "string",
                        "description": "Date range preset",
                        "default": "LAST_30_DAYS"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 50
                    }
                },
                "required": ["customer_id"]
            }
        ),
        Tool(
            name="get_google_ads_keywords",
            description="Get keyword performance with quality scores.",
            inputSchema={
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "string",
                        "description": "Google Ads customer ID"
                    },
                    "campaign_id": {
                        "type": "string",
                        "description": "Optional: Filter by campaign ID"
                    },
                    "date_range": {
                        "type": "string",
                        "default": "LAST_30_DAYS"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 100
                    }
                },
                "required": ["customer_id"]
            }
        ),
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    
    if not is_configured():
        return [TextContent(
            type="text",
            text="❌ Google Ads is not configured. Please set environment variables:\n"
                 "- GOOGLE_ADS_CUSTOMER_ID\n"
                 "- GOOGLE_ADS_DEVELOPER_TOKEN\n"
                 "- GOOGLE_ADS_REFRESH_TOKEN\n"
                 "- GOOGLE_ADS_CLIENT_ID\n"
                 "- GOOGLE_ADS_CLIENT_SECRET"
        )]
    
    try:
        if name == "list_google_ads_accounts":
            result = await list_accounts()
            if not result:
                return [TextContent(type="text", text="No accounts found.")]
            
            output = f"📊 **Google Ads Accounts** (MCC: {format_customer_id(GOOGLE_ADS_CUSTOMER_ID)})\n\n"
            for acc in result:
                status_icon = "✅" if acc["status"] == "ENABLED" else "⏸️"
                output += f"{status_icon} **{acc['name']}**\n"
                output += f"   ID: `{acc['id']}` | Currency: {acc['currency']} | TZ: {acc['timezone']}\n\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "get_google_ads_account_info":
            result = await get_account_info(arguments["customer_id"])
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "execute_google_ads_query":
            result = await execute_gaql_query(
                customer_id=arguments["customer_id"],
                query=arguments["query"],
                limit=arguments.get("limit", 100)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "get_google_ads_campaign_performance":
            result = await get_campaign_performance(
                customer_id=arguments["customer_id"],
                date_range=arguments.get("date_range", "LAST_30_DAYS"),
                limit=arguments.get("limit", 20)
            )
            
            if not result:
                return [TextContent(type="text", text="No campaign data found for this period.")]
            
            output = f"📈 **Campaign Performance** ({arguments.get('date_range', 'LAST_30_DAYS')})\n\n"
            for i, camp in enumerate(result, 1):
                status_icon = "🟢" if camp["status"] == "ENABLED" else "🔴"
                output += f"{i}. {status_icon} **{camp['name']}**\n"
                output += f"   Spend: {camp['spend_formatted']} | Clicks: {camp['clicks']:,} | "
                output += f"Conv: {camp['conversions']:.1f} | CTR: {camp['ctr']}%\n\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "get_google_ads_ad_performance":
            result = await get_ad_performance(
                customer_id=arguments["customer_id"],
                campaign_id=arguments.get("campaign_id"),
                date_range=arguments.get("date_range", "LAST_30_DAYS"),
                limit=arguments.get("limit", 50)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "get_google_ads_keywords":
            result = await get_keywords(
                customer_id=arguments["customer_id"],
                campaign_id=arguments.get("campaign_id"),
                date_range=arguments.get("date_range", "LAST_30_DAYS"),
                limit=arguments.get("limit", 100)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
            
    except Exception as e:
        return [TextContent(type="text", text=f"❌ Error: {str(e)}")]

async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

### Task 2.7: Create __main__.py for Module Execution

**File**: `services/mcp-servers/google-ads/__main__.py`

```python
"""Allow running as python -m google-ads"""
from .server import main
import asyncio

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Phase 3: Meta Ads MCP Server (READ-only)

**Duration**: 8-10 hours  
**Architecture Reference**: [pipeboard-co/meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp)

### Architecture Overview

**Learning from meta-ads-mcp's structure:**
- ✅ Token caching for OAuth persistence
- ✅ Resource-based file serving for images
- ✅ Comprehensive error handling
- ✅ Generic search functionality
- ✅ Breakdown support for insights

**Our additions:**
- ✅ Supabase integration for audit logging
- ✅ Property-context aware tools
- ✅ Auto-sync to fact_marketing_performance table

### Task 3.1: Create Config Module

**File**: `services/mcp-servers/meta-ads/config.py`

```python
"""Configuration for Meta Ads MCP Server."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment
env_paths = [
    Path(__file__).parent.parent.parent.parent / "apps" / "web" / ".env.local",
    Path(__file__).parent.parent.parent.parent.parent / ".env",
    Path(__file__).parent / ".env",
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break

# Meta Ads Configuration
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN")
META_AD_ACCOUNT_ID = os.environ.get("META_AD_ACCOUNT_ID")
META_APP_ID = os.environ.get("META_APP_ID")
META_APP_SECRET = os.environ.get("META_APP_SECRET")

# API Version
META_API_VERSION = "v19.0"
META_BASE_URL = f"https://graph.facebook.com/{META_API_VERSION}"

# Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def is_configured() -> bool:
    """Check if Meta Ads is properly configured."""
    return bool(META_ACCESS_TOKEN and META_AD_ACCOUNT_ID)
```

### Task 3.2: Create Meta API Client

**File**: `services/mcp-servers/meta-ads/client.py`

```python
"""Meta Graph API client for ads management."""
import httpx
import json
from typing import Any, Optional, Literal
from pathlib import Path
from .config import META_ACCESS_TOKEN, META_BASE_URL, META_AD_ACCOUNT_ID

# Token cache location (inspired by meta-ads-mcp)
TOKEN_CACHE = Path.home() / ".meta-ads-mcp" / "token_cache.json"

class MetaAdsClient:
    """
    Client for Meta Marketing API.
    
    Features:
    - Token caching for OAuth persistence
    - Automatic retry logic
    - Rate limit handling
    - Comprehensive error messages
    """
    
    def __init__(self, access_token: str | None = None, account_id: str | None = None):
        self.access_token = access_token or self._load_cached_token() or META_ACCESS_TOKEN
        self.account_id = account_id or META_AD_ACCOUNT_ID
        self.base_url = META_BASE_URL
        
        if not self.access_token:
            raise ValueError("Meta access token not configured. Run authentication setup.")
    
    def _load_cached_token(self) -> Optional[str]:
        """Load cached OAuth token if available."""
        if TOKEN_CACHE.exists():
            try:
                with open(TOKEN_CACHE) as f:
                    data = json.load(f)
                    return data.get("access_token")
            except Exception:
                return None
        return None
    
    def _save_token(self, token: str):
        """Cache OAuth token for future use."""
        TOKEN_CACHE.parent.mkdir(parents=True, exist_ok=True)
        with open(TOKEN_CACHE, "w") as f:
            json.dump({"access_token": token}, f)
    
    async def _request(
        self, 
        method: Literal["GET", "POST", "DELETE"],
        endpoint: str, 
        params: dict | None = None,
        json_data: dict | None = None
    ) -> dict[str, Any]:
        """Make a request to the Graph API with error handling."""
        params = params or {}
        params["access_token"] = self.access_token
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                if method == "GET":
                    response = await client.get(f"{self.base_url}{endpoint}", params=params)
                elif method == "POST":
                    response = await client.post(
                        f"{self.base_url}{endpoint}", 
                        params=params,
                        json=json_data
                    )
                elif method == "DELETE":
                    response = await client.delete(f"{self.base_url}{endpoint}", params=params)
                
                response.raise_for_status()
                return response.json()
                
            except httpx.HTTPStatusError as e:
                # Parse Meta's error response
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get("error", {}).get("message", str(e))
                    raise Exception(f"Meta API Error: {error_msg}")
                except:
                    raise Exception(f"Meta API Error: {e}")
    
    async def _get(self, endpoint: str, params: dict | None = None) -> dict[str, Any]:
        """Make a GET request to the Graph API."""
        return await self._request("GET", endpoint, params)
    
    async def get_ad_accounts(self) -> list[dict[str, Any]]:
        """Get all ad accounts the user has access to."""
        result = await self._get("/me/adaccounts", {
            "fields": "id,name,account_status,currency,timezone_name,amount_spent"
        })
        return result.get("data", [])
    
    async def get_account_info(self, account_id: str | None = None) -> dict[str, Any]:
        """Get detailed info about an ad account."""
        acct = account_id or self.account_id
        return await self._get(f"/act_{acct}", {
            "fields": "id,name,account_status,currency,timezone_name,amount_spent,spend_cap,balance"
        })
    
    async def get_campaigns(
        self, 
        account_id: str | None = None,
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get campaigns for an ad account."""
        acct = account_id or self.account_id
        result = await self._get(f"/act_{acct}/campaigns", {
            "fields": "id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time",
            "limit": limit
        })
        return result.get("data", [])
    
    async def get_campaign_insights(
        self,
        account_id: str | None = None,
        date_preset: str = "last_30d",
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get campaign performance insights."""
        acct = account_id or self.account_id
        result = await self._get(f"/act_{acct}/insights", {
            "level": "campaign",
            "fields": "campaign_id,campaign_name,impressions,clicks,spend,ctr,cpc,conversions,actions",
            "date_preset": date_preset,
            "limit": limit
        })
        return result.get("data", [])
    
    async def get_adsets(
        self,
        campaign_id: str | None = None,
        account_id: str | None = None,
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get ad sets, optionally filtered by campaign."""
        if campaign_id:
            endpoint = f"/{campaign_id}/adsets"
        else:
            acct = account_id or self.account_id
            endpoint = f"/act_{acct}/adsets"
        
        result = await self._get(endpoint, {
            "fields": "id,name,status,targeting,daily_budget,optimization_goal,bid_strategy",
            "limit": limit
        })
        return result.get("data", [])
    
    async def get_adset_insights(
        self,
        account_id: str | None = None,
        date_preset: str = "last_30d",
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get ad set performance insights."""
        acct = account_id or self.account_id
        result = await self._get(f"/act_{acct}/insights", {
            "level": "adset",
            "fields": "adset_id,adset_name,impressions,clicks,spend,ctr,cpc,conversions",
            "date_preset": date_preset,
            "limit": limit
        })
        return result.get("data", [])
    
    async def get_ads(
        self,
        adset_id: str | None = None,
        account_id: str | None = None,
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get ads, optionally filtered by ad set."""
        if adset_id:
            endpoint = f"/{adset_id}/ads"
        else:
            acct = account_id or self.account_id
            endpoint = f"/act_{acct}/ads"
        
        result = await self._get(endpoint, {
            "fields": "id,name,status,creative,effective_status",
            "limit": limit
        })
        return result.get("data", [])
    
    async def get_ad_insights(
        self,
        account_id: str | None = None,
        date_preset: str = "last_30d",
        limit: int = 100
    ) -> list[dict[str, Any]]:
        """Get ad-level performance insights."""
        acct = account_id or self.account_id
        result = await self._get(f"/act_{acct}/insights", {
            "level": "ad",
            "fields": "ad_id,ad_name,impressions,clicks,spend,ctr,cpc,conversions",
            "date_preset": date_preset,
            "limit": limit
        })
        return result.get("data", [])
    
    async def get_custom_audiences(
        self,
        account_id: str | None = None,
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get custom audiences."""
        acct = account_id or self.account_id
        result = await self._get(f"/act_{acct}/customaudiences", {
            "fields": "id,name,subtype,approximate_count,data_source",
            "limit": limit
        })
        return result.get("data", [])
    
    # ========== TARGETING TOOLS (Inspired by meta-ads-mcp) ==========
    
    async def search_interests(
        self,
        query: str,
        account_id: str | None = None,
        limit: int = 25
    ) -> list[dict[str, Any]]:
        """Search for interest targeting options."""
        acct = account_id or self.account_id
        result = await self._get("/search", {
            "type": "adinterest",
            "q": query,
            "limit": limit
        })
        return result.get("data", [])
    
    async def get_interest_suggestions(
        self,
        interest_list: list[str],
        account_id: str | None = None,
        limit: int = 25
    ) -> list[dict[str, Any]]:
        """Get related interest suggestions."""
        acct = account_id or self.account_id
        result = await self._get(f"/act_{acct}/targetingsuggestions", {
            "interest_list": json.dumps(interest_list),
            "limit": limit
        })
        return result.get("data", [])
    
    async def validate_interests(
        self,
        interest_list: list[str] | None = None,
        interest_fbid_list: list[str] | None = None,
        account_id: str | None = None
    ) -> dict[str, Any]:
        """Validate interest names or IDs."""
        acct = account_id or self.account_id
        params = {}
        if interest_list:
            params["interest_list"] = json.dumps(interest_list)
        if interest_fbid_list:
            params["interest_fbid_list"] = json.dumps(interest_fbid_list)
        
        return await self._get(f"/act_{acct}/targetingvalidation", params)
    
    async def search_behaviors(
        self,
        account_id: str | None = None,
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get behavior targeting options."""
        acct = account_id or self.account_id
        result = await self._get(f"/act_{acct}/targetingbrowse", {
            "type": "behaviors",
            "limit": limit
        })
        return result.get("data", [])
    
    async def search_demographics(
        self,
        demographic_class: str = "demographics",
        account_id: str | None = None,
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """
        Get demographic targeting options.
        
        Classes: demographics, life_events, industries, income, 
                 family_statuses, user_device, user_os
        """
        acct = account_id or self.account_id
        result = await self._get(f"/act_{acct}/targetingbrowse", {
            "type": demographic_class,
            "limit": limit
        })
        return result.get("data", [])
    
    async def search_geo_locations(
        self,
        query: str,
        location_types: list[str] | None = None,
        limit: int = 25
    ) -> list[dict[str, Any]]:
        """Search for geographic targeting locations."""
        location_types = location_types or ["country", "region", "city"]
        result = await self._get("/search", {
            "type": "adgeolocation",
            "location_types": json.dumps(location_types),
            "q": query,
            "limit": limit
        })
        return result.get("data", [])
    
    # ========== PAGES & ASSETS ==========
    
    async def get_pages(self, limit: int = 50) -> list[dict[str, Any]]:
        """Get Facebook/Instagram pages the user manages."""
        result = await self._get("/me/accounts", {
            "fields": "id,name,access_token,category,fan_count,instagram_business_account",
            "limit": limit
        })
        return result.get("data", [])
    
    # ========== IMAGE HANDLING ==========
    
    async def upload_image(
        self,
        image_url: str | None = None,
        image_path: str | None = None,
        name: str | None = None,
        account_id: str | None = None
    ) -> dict[str, Any]:
        """Upload an image for ad creative."""
        acct = account_id or self.account_id
        
        if image_url:
            params = {"access_token": self.access_token}
            json_data = {"url": image_url, "name": name or "uploaded_image"}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/act_{acct}/adimages",
                    params=params,
                    json=json_data
                )
                response.raise_for_status()
                return response.json()
        
        elif image_path:
            # File upload handling
            with open(image_path, "rb") as f:
                files = {"source": f}
                params = {"access_token": self.access_token, "name": name or "uploaded_image"}
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.base_url}/act_{acct}/adimages",
                        params=params,
                        files=files
                    )
                    response.raise_for_status()
                    return response.json()
        
        raise ValueError("Either image_url or image_path must be provided")
    
    async def get_ad_image(self, ad_id: str) -> dict[str, Any]:
        """Get ad creative image details."""
        result = await self._get(f"/{ad_id}", {
            "fields": "creative{image_url,image_hash,thumbnail_url}"
        })
        return result
    
    # ========== BUDGET SCHEDULING ==========
    
    async def create_budget_schedule(
        self,
        campaign_id: str,
        budget_value: int,
        budget_value_type: Literal["ABSOLUTE", "MULTIPLIER"],
        time_start: int,
        time_end: int
    ) -> dict[str, Any]:
        """Create a budget schedule for high-demand periods."""
        json_data = {
            "budget_value": budget_value,
            "budget_value_type": budget_value_type,
            "time_start": time_start,
            "time_end": time_end
        }
        
        return await self._request("POST", f"/{campaign_id}/adscheduling", json_data=json_data)
```

### Task 3.3: Create Main Server

**File**: `services/mcp-servers/meta-ads/server.py`

```python
"""Meta Ads MCP Server - Main entry point."""
import asyncio
import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from .config import is_configured, META_AD_ACCOUNT_ID
from .client import MetaAdsClient

server = Server("meta-ads-mcp")

@server.list_tools()
async def list_tools() -> list[Tool]:
    """
    List available Meta Ads tools.
    
    Inspired by meta-ads-mcp's comprehensive 29-tool architecture.
    Organized into categories for better discoverability.
    """
    return [
        # ========== ACCOUNT MANAGEMENT ==========
        Tool(
            name="list_meta_ad_accounts",
            description="List all Meta (Facebook/Instagram) ad accounts you have access to.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="get_meta_account_info",
            description="Get detailed information about a Meta ad account.",
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {
                        "type": "string",
                        "description": "Ad account ID (numbers only, no 'act_' prefix)"
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="get_meta_campaigns",
            description="Get all campaigns for a Meta ad account.",
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"},
                    "limit": {"type": "integer", "default": 50}
                },
                "required": []
            }
        ),
        Tool(
            name="get_meta_campaign_insights",
            description="Get campaign performance metrics (spend, clicks, impressions, conversions).",
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"},
                    "date_preset": {
                        "type": "string",
                        "description": "Date range: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month",
                        "default": "last_30d"
                    },
                    "limit": {"type": "integer", "default": 50}
                },
                "required": []
            }
        ),
        Tool(
            name="get_meta_adsets",
            description="Get ad sets for an account or specific campaign.",
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"},
                    "campaign_id": {"type": "string", "description": "Optional: filter by campaign"},
                    "limit": {"type": "integer", "default": 50}
                },
                "required": []
            }
        ),
        Tool(
            name="get_meta_adset_insights",
            description="Get ad set performance metrics.",
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"},
                    "date_preset": {"type": "string", "default": "last_30d"},
                    "limit": {"type": "integer", "default": 50}
                },
                "required": []
            }
        ),
        Tool(
            name="get_meta_ads",
            description="Get ads for an account or specific ad set.",
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"},
                    "adset_id": {"type": "string", "description": "Optional: filter by ad set"},
                    "limit": {"type": "integer", "default": 50}
                },
                "required": []
            }
        ),
        Tool(
            name="get_meta_ad_insights",
            description="Get ad-level performance metrics.",
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"},
                    "date_preset": {"type": "string", "default": "last_30d"},
                    "limit": {"type": "integer", "default": 100}
                },
                "required": []
            }
        ),
        Tool(
            name="get_meta_audiences",
            description="Get custom audiences for an ad account.",
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"},
                    "limit": {"type": "integer", "default": 50}
                },
                "required": []
            }
        ),
        
        # ========== TARGETING TOOLS ==========
        Tool(
            name="search_meta_interests",
            description="Search for interest targeting options by keyword (e.g., 'baseball', 'cooking').",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search term"},
                    "account_id": {"type": "string"},
                    "limit": {"type": "integer", "default": 25}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="get_meta_interest_suggestions",
            description="Get related interest suggestions based on existing interests.",
            inputSchema={
                "type": "object",
                "properties": {
                    "interest_list": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of interest names (e.g., ['Basketball', 'Soccer'])"
                    },
                    "account_id": {"type": "string"},
                    "limit": {"type": "integer", "default": 25}
                },
                "required": ["interest_list"]
            }
        ),
        Tool(
            name="validate_meta_interests",
            description="Validate interest names or IDs for targeting accuracy.",
            inputSchema={
                "type": "object",
                "properties": {
                    "interest_list": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Interest names to validate"
                    },
                    "interest_fbid_list": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Interest IDs to validate"
                    },
                    "account_id": {"type": "string"}
                },
                "required": []
            }
        ),
        Tool(
            name="search_meta_behaviors",
            description="Get all available behavior targeting options.",
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {"type": "string"},
                    "limit": {"type": "integer", "default": 50}
                },
                "required": []
            }
        ),
        Tool(
            name="search_meta_demographics",
            description="Get demographic targeting options (demographics, life_events, industries, income, etc.).",
            inputSchema={
                "type": "object",
                "properties": {
                    "demographic_class": {
                        "type": "string",
                        "description": "Type: demographics, life_events, industries, income, family_statuses",
                        "default": "demographics"
                    },
                    "account_id": {"type": "string"},
                    "limit": {"type": "integer", "default": 50}
                },
                "required": []
            }
        ),
        Tool(
            name="search_meta_geo_locations",
            description="Search for geographic targeting locations (countries, regions, cities, etc.).",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Location search term"},
                    "location_types": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Types: country, region, city, zip, geo_market",
                        "default": ["country", "region", "city"]
                    },
                    "limit": {"type": "integer", "default": 25}
                },
                "required": ["query"]
            }
        ),
        
        # ========== PAGES & ASSETS ==========
        Tool(
            name="get_meta_pages",
            description="Get Facebook/Instagram pages you manage.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 50}
                },
                "required": []
            }
        ),
        Tool(
            name="upload_meta_ad_image",
            description="Upload an image for ad creative use.",
            inputSchema={
                "type": "object",
                "properties": {
                    "image_url": {"type": "string", "description": "URL of image to upload"},
                    "image_path": {"type": "string", "description": "Local file path"},
                    "name": {"type": "string", "description": "Optional image name"},
                    "account_id": {"type": "string"}
                },
                "required": []
            }
        ),
        Tool(
            name="get_meta_ad_image",
            description="Get ad creative image details and URLs.",
            inputSchema={
                "type": "object",
                "properties": {
                    "ad_id": {"type": "string", "description": "Meta Ads ad ID"}
                },
                "required": ["ad_id"]
            }
        ),
        Tool(
            name="create_meta_budget_schedule",
            description="Schedule budget changes for high-demand periods.",
            inputSchema={
                "type": "object",
                "properties": {
                    "campaign_id": {"type": "string"},
                    "budget_value": {"type": "integer", "description": "Budget amount in cents"},
                    "budget_value_type": {
                        "type": "string",
                        "description": "ABSOLUTE or MULTIPLIER",
                        "default": "ABSOLUTE"
                    },
                    "time_start": {"type": "integer", "description": "Unix timestamp"},
                    "time_end": {"type": "integer", "description": "Unix timestamp"}
                },
                "required": ["campaign_id", "budget_value", "time_start", "time_end"]
            }
        ),
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    
    if not is_configured():
        return [TextContent(
            type="text",
            text="❌ Meta Ads is not configured. Please set environment variables:\n"
                 "- META_ACCESS_TOKEN\n"
                 "- META_AD_ACCOUNT_ID"
        )]
    
    try:
        client = MetaAdsClient()
        account_id = arguments.get("account_id") or META_AD_ACCOUNT_ID
        
        if name == "list_meta_ad_accounts":
            result = await client.get_ad_accounts()
            if not result:
                return [TextContent(type="text", text="No ad accounts found.")]
            
            output = "📘 **Meta Ad Accounts**\n\n"
            for acc in result:
                status = "✅" if acc.get("account_status") == 1 else "⏸️"
                spent = float(acc.get("amount_spent", 0)) / 100
                output += f"{status} **{acc['name']}**\n"
                output += f"   ID: `{acc['id'].replace('act_', '')}` | "
                output += f"Currency: {acc.get('currency', 'N/A')} | "
                output += f"Total Spent: ${spent:,.2f}\n\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "get_meta_account_info":
            result = await client.get_account_info(account_id)
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "get_meta_campaigns":
            result = await client.get_campaigns(
                account_id=account_id,
                limit=arguments.get("limit", 50)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "get_meta_campaign_insights":
            result = await client.get_campaign_insights(
                account_id=account_id,
                date_preset=arguments.get("date_preset", "last_30d"),
                limit=arguments.get("limit", 50)
            )
            
            if not result:
                return [TextContent(type="text", text="No campaign data found.")]
            
            output = f"📈 **Meta Campaign Performance** ({arguments.get('date_preset', 'last_30d')})\n\n"
            for camp in result:
                spend = float(camp.get("spend", 0))
                output += f"• **{camp.get('campaign_name', 'Unknown')}**\n"
                output += f"  Spend: ${spend:,.2f} | Clicks: {camp.get('clicks', 0):,} | "
                output += f"Impr: {int(camp.get('impressions', 0)):,} | CTR: {camp.get('ctr', 'N/A')}\n\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "get_meta_adsets":
            result = await client.get_adsets(
                campaign_id=arguments.get("campaign_id"),
                account_id=account_id,
                limit=arguments.get("limit", 50)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "get_meta_adset_insights":
            result = await client.get_adset_insights(
                account_id=account_id,
                date_preset=arguments.get("date_preset", "last_30d"),
                limit=arguments.get("limit", 50)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "get_meta_ads":
            result = await client.get_ads(
                adset_id=arguments.get("adset_id"),
                account_id=account_id,
                limit=arguments.get("limit", 50)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "get_meta_ad_insights":
            result = await client.get_ad_insights(
                account_id=account_id,
                date_preset=arguments.get("date_preset", "last_30d"),
                limit=arguments.get("limit", 100)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "get_meta_audiences":
            result = await client.get_custom_audiences(
                account_id=account_id,
                limit=arguments.get("limit", 50)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        # ========== TARGETING TOOLS ==========
        
        elif name == "search_meta_interests":
            result = await client.search_interests(
                query=arguments["query"],
                account_id=account_id,
                limit=arguments.get("limit", 25)
            )
            
            if not result:
                return [TextContent(type="text", text="No interests found.")]
            
            output = f"🎯 **Interest Targeting Options** (query: '{arguments['query']}')\n\n"
            for interest in result[:10]:
                output += f"• **{interest.get('name')}**\n"
                output += f"  ID: {interest.get('id')} | "
                output += f"Audience: ~{interest.get('audience_size', 0):,}\n"
                if interest.get('path'):
                    output += f"  Path: {' > '.join(interest['path'])}\n"
                output += "\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "get_meta_interest_suggestions":
            result = await client.get_interest_suggestions(
                interest_list=arguments["interest_list"],
                account_id=account_id,
                limit=arguments.get("limit", 25)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "validate_meta_interests":
            result = await client.validate_interests(
                interest_list=arguments.get("interest_list"),
                interest_fbid_list=arguments.get("interest_fbid_list"),
                account_id=account_id
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "search_meta_behaviors":
            result = await client.search_behaviors(
                account_id=account_id,
                limit=arguments.get("limit", 50)
            )
            
            output = "🎭 **Behavior Targeting Options**\n\n"
            for behavior in result[:15]:
                output += f"• **{behavior.get('name')}**\n"
                output += f"  ID: {behavior.get('id')}\n"
                if behavior.get('description'):
                    output += f"  {behavior['description']}\n"
                output += "\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "search_meta_demographics":
            result = await client.search_demographics(
                demographic_class=arguments.get("demographic_class", "demographics"),
                account_id=account_id,
                limit=arguments.get("limit", 50)
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "search_meta_geo_locations":
            result = await client.search_geo_locations(
                query=arguments["query"],
                location_types=arguments.get("location_types", ["country", "region", "city"]),
                limit=arguments.get("limit", 25)
            )
            
            output = f"📍 **Geographic Locations** (query: '{arguments['query']}')\n\n"
            for loc in result[:15]:
                output += f"• **{loc.get('name')}**\n"
                output += f"  Type: {loc.get('type')} | Key: {loc.get('key')}\n"
                if loc.get('country_name'):
                    output += f"  Country: {loc['country_name']}\n"
                output += "\n"
            
            return [TextContent(type="text", text=output)]
        
        # ========== PAGES & ASSETS ==========
        
        elif name == "get_meta_pages":
            result = await client.get_pages(limit=arguments.get("limit", 50))
            
            if not result:
                return [TextContent(type="text", text="No pages found.")]
            
            output = "📄 **Facebook/Instagram Pages**\n\n"
            for page in result:
                output += f"• **{page.get('name')}**\n"
                output += f"  ID: {page.get('id')} | Category: {page.get('category', 'N/A')}\n"
                output += f"  Fans: {page.get('fan_count', 0):,}\n"
                if page.get('instagram_business_account'):
                    output += f"  ✅ Instagram Connected\n"
                output += "\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "upload_meta_ad_image":
            result = await client.upload_image(
                image_url=arguments.get("image_url"),
                image_path=arguments.get("image_path"),
                name=arguments.get("name"),
                account_id=account_id
            )
            return [TextContent(type="text", text=f"✅ Image uploaded: {json.dumps(result, indent=2)}")]
        
        elif name == "get_meta_ad_image":
            result = await client.get_ad_image(ad_id=arguments["ad_id"])
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "create_meta_budget_schedule":
            result = await client.create_budget_schedule(
                campaign_id=arguments["campaign_id"],
                budget_value=arguments["budget_value"],
                budget_value_type=arguments.get("budget_value_type", "ABSOLUTE"),
                time_start=arguments["time_start"],
                time_end=arguments["time_end"]
            )
            return [TextContent(type="text", text=f"✅ Budget schedule created: {json.dumps(result, indent=2)}")]
        
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
            
    except Exception as e:
        return [TextContent(type="text", text=f"❌ Error: {str(e)}")]

async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

### Task 3.4: Create __main__.py

**File**: `services/mcp-servers/meta-ads/__main__.py`

```python
"""Allow running as python -m meta-ads"""
from .server import main
import asyncio

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Phase 4: Database & Audit Logging

**Duration**: 1 hour

### Task 4.1: Create Migration

**File**: `supabase/migrations/20251211000000_mcp_audit_infrastructure.sql`

```sql
-- MCP Audit Log Table
-- Tracks all MCP operations for debugging and compliance

CREATE TABLE IF NOT EXISTS mcp_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    platform TEXT NOT NULL, -- 'google_ads', 'meta_ads'
    tool_name TEXT NOT NULL, -- 'get_campaign_performance', etc.
    operation_type TEXT NOT NULL DEFAULT 'read', -- 'read' or 'write'
    parameters JSONB, -- Input parameters
    result JSONB, -- API response (may be truncated)
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms INTEGER,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_mcp_audit_platform ON mcp_audit_log(platform);
CREATE INDEX idx_mcp_audit_property ON mcp_audit_log(property_id);
CREATE INDEX idx_mcp_audit_created ON mcp_audit_log(created_at DESC);
CREATE INDEX idx_mcp_audit_tool ON mcp_audit_log(tool_name);

-- RLS Policies
ALTER TABLE mcp_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs for their org
CREATE POLICY "Admins view org audit logs" ON mcp_audit_log
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN properties prop ON prop.org_id = p.org_id
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'manager')
        AND prop.id = mcp_audit_log.property_id
    )
);

-- Service role can insert
CREATE POLICY "Service role can insert audit logs" ON mcp_audit_log
FOR INSERT WITH CHECK (TRUE);

COMMENT ON TABLE mcp_audit_log IS 'Audit log for MCP server operations on ad platforms';
```

### Task 4.2: Apply Migration

```bash
# Run via Supabase CLI or dashboard
supabase db push
# OR apply directly in Supabase SQL Editor
```

---

## Phase 5: Cursor Integration

**Duration**: 30 minutes

### Task 5.1: Create MCP Configuration

**File**: `~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`)

```json
{
  "mcpServers": {
    "google-ads": {
      "command": "python",
      "args": ["-m", "server"],
      "cwd": "C:/Users/jasji/projects/oneClick/p11-platform/services/mcp-servers/google-ads",
      "env": {
        "GOOGLE_ADS_CUSTOMER_ID": "YOUR_CUSTOMER_ID",
        "GOOGLE_ADS_DEVELOPER_TOKEN": "YOUR_DEVELOPER_TOKEN",
        "GOOGLE_ADS_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN",
        "GOOGLE_ADS_CLIENT_ID": "YOUR_CLIENT_ID.apps.googleusercontent.com",
        "GOOGLE_ADS_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "SUPABASE_URL": "YOUR_SUPABASE_URL",
        "SUPABASE_SERVICE_KEY": "YOUR_SUPABASE_SERVICE_KEY"
      }
    },
    "meta-ads": {
      "command": "python",
      "args": ["-m", "server"],
      "cwd": "C:/Users/jasji/projects/oneClick/p11-platform/services/mcp-servers/meta-ads",
      "env": {
        "META_ACCESS_TOKEN": "",
        "META_AD_ACCOUNT_ID": "",
        "SUPABASE_URL": "https://lmjmutuggvzuadwreqxx.supabase.co",
        "SUPABASE_SERVICE_KEY": "sb_secret_PsI6Bdp38sYxtXXv6p9ATQ_BimwXE42"
      }
    }
  }
}
```

> ⚠️ **Security Note**: In production, use environment variable references like `${env:GOOGLE_ADS_DEVELOPER_TOKEN}` instead of hardcoded values.

### Task 5.2: Restart Cursor

After saving the MCP configuration, restart Cursor for the changes to take effect.

### Task 5.3: Verify Connection

In Cursor, open a new chat and ask:

```
List my Google Ads accounts
```

You should see Claude invoke the `list_google_ads_accounts` tool and return results.

---

## Phase 6: Write Operations (Future)

> ⚠️ **NOT IMPLEMENTED IN INITIAL RELEASE** - Add these ONLY after thoroughly testing read operations.

**Duration**: 12-16 hours

### Future Write Tools - Google Ads

| Tool | Risk Level | Guardrails Required |
|------|------------|---------------------|
| `update_campaign_budget` | 🔴 HIGH | Max budget limit, % change cap |
| `pause_campaign` | 🔴 HIGH | Confirmation required |
| `enable_campaign` | 🟡 MEDIUM | None |
| `update_keyword_bids` | 🔴 HIGH | Max bid limit |
| `add_negative_keywords` | 🟢 LOW | None |

### Future Write Tools - Meta Ads

| Tool | Risk Level | Guardrails Required |
|------|------------|---------------------|
| `update_campaign_budget` | 🔴 HIGH | Max budget limit |
| `pause_campaign` | 🔴 HIGH | Confirmation required |
| `update_adset_targeting` | 🔴 HIGH | Validation of targeting params |
| `update_ad_status` | 🟡 MEDIUM | None |

### Guardrail Implementation Pattern

```python
@server.tool()
async def update_campaign_budget(
    customer_id: str,
    campaign_id: str,
    new_budget_micros: int,
    confirm: bool = False
) -> list[TextContent]:
    """Update campaign daily budget. Requires confirmation."""
    
    MAX_BUDGET = 1_000_000_000  # $1000/day
    MAX_CHANGE_PERCENT = 50
    
    # Guardrail 1: Absolute limit
    if new_budget_micros > MAX_BUDGET:
        return [TextContent(text=f"❌ Budget ${new_budget_micros/1e6:.2f} exceeds maximum allowed (${MAX_BUDGET/1e6:.0f}/day)")]
    
    # Get current budget
    current = await get_current_budget(customer_id, campaign_id)
    change_pct = abs(new_budget_micros - current) / current * 100
    
    # Guardrail 2: Percentage change limit
    if change_pct > MAX_CHANGE_PERCENT and not confirm:
        return [TextContent(text=f"""
⚠️ **Confirmation Required**

This is a {change_pct:.0f}% budget change:
- Current: ${current/1e6:.2f}/day
- New: ${new_budget_micros/1e6:.2f}/day

To confirm, call with `confirm=True`
        """)]
    
    # Execute change
    result = await execute_budget_update(customer_id, campaign_id, new_budget_micros)
    
    # Audit log
    await log_mcp_operation(
        platform="google_ads",
        tool_name="update_campaign_budget",
        operation_type="write",
        parameters={"campaign_id": campaign_id, "new_budget": new_budget_micros},
        result=result
    )
    
    return [TextContent(text=f"✅ Budget updated to ${new_budget_micros/1e6:.2f}/day")]
```

---

## Phase 7: Property-Context Integration

**Duration**: 4-6 hours  
**Priority**: ⭐⭐ (Can be added after basic functionality works)

### What This Adds

Transform from account-ID-based to **property-aware** operations:

```python
# Before (generic):
get_campaign_performance(customer_id="163-050-5086")

# After (property-aware):
get_property_ads_performance(property_name="Sunset Apartments")
# ↓ Automatically looks up the right account
```

### Task 7.1: Create Property Lookup Service

**File**: `services/mcp-servers/shared/property_service.py`

```python
"""Property-context service for MCP tools."""
from typing import Optional
from .supabase_client import get_supabase

async def get_property_by_name(property_name: str) -> Optional[dict]:
    """Look up property by name."""
    supabase = get_supabase()
    result = supabase.table('properties')\
        .select('id, name, org_id')\
        .ilike('name', f'%{property_name}%')\
        .limit(1)\
        .execute()
    
    return result.data[0] if result.data else None

async def get_ad_account_for_property(
    property_id: str,
    platform: str  # 'google_ads' or 'meta_ads'
) -> Optional[str]:
    """Get the ad account ID linked to a property."""
    supabase = get_supabase()
    
    field_map = {
        'google_ads': 'google_ads_customer_id',
        'meta_ads': 'meta_ad_account_id'
    }
    
    result = supabase.table('ad_account_connections')\
        .select(field_map[platform])\
        .eq('property_id', property_id)\
        .limit(1)\
        .execute()
    
    if result.data:
        return result.data[0].get(field_map[platform])
    return None

async def get_properties_for_org(org_id: str) -> list[dict]:
    """Get all properties in an organization."""
    supabase = get_supabase()
    result = supabase.table('properties')\
        .select('id, name')\
        .eq('org_id', org_id)\
        .execute()
    
    return result.data or []

async def resolve_property_to_ad_account(
    property_identifier: str,  # Can be name or ID
    platform: str
) -> tuple[Optional[str], Optional[str]]:
    """
    Resolve a property name/ID to an ad account ID.
    
    Returns: (property_id, ad_account_id)
    """
    # Try as UUID first
    if len(property_identifier) == 36 and '-' in property_identifier:
        property_id = property_identifier
    else:
        # Look up by name
        prop = await get_property_by_name(property_identifier)
        if not prop:
            return None, None
        property_id = prop['id']
    
    # Get ad account
    ad_account_id = await get_ad_account_for_property(property_id, platform)
    
    return property_id, ad_account_id
```

### Task 7.2: Add Property-Aware Tools to Google Ads MCP

**File**: `services/mcp-servers/google-ads/tools/property_context.py`

```python
"""Property-context aware wrappers for Google Ads tools."""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from shared.property_service import resolve_property_to_ad_account
from .performance import get_campaign_performance, get_ad_performance

async def get_property_campaign_performance(
    property_identifier: str,
    date_range: str = "LAST_30_DAYS",
    limit: int = 20
):
    """
    Get Google Ads campaign performance for a specific property.
    
    Args:
        property_identifier: Property name (e.g., "Sunset Apartments") or ID
        date_range: Date range preset
        limit: Max campaigns to return
    """
    # Resolve property to ad account
    property_id, customer_id = await resolve_property_to_ad_account(
        property_identifier,
        platform="google_ads"
    )
    
    if not customer_id:
        return {
            "error": f"No Google Ads account found for property: {property_identifier}"
        }
    
    # Fetch performance
    campaigns = await get_campaign_performance(customer_id, date_range, limit)
    
    # Add property context to response
    return {
        "property_id": property_id,
        "property_identifier": property_identifier,
        "google_ads_customer_id": customer_id,
        "date_range": date_range,
        "campaigns": campaigns
    }

async def get_property_ad_performance(
    property_identifier: str,
    campaign_id: str | None = None,
    date_range: str = "LAST_30_DAYS",
    limit: int = 50
):
    """Get ad-level performance for a property's Google Ads account."""
    property_id, customer_id = await resolve_property_to_ad_account(
        property_identifier,
        platform="google_ads"
    )
    
    if not customer_id:
        return {"error": f"No Google Ads account found for property: {property_identifier}"}
    
    ads = await get_ad_performance(customer_id, campaign_id, date_range, limit)
    
    return {
        "property_id": property_id,
        "property_identifier": property_identifier,
        "google_ads_customer_id": customer_id,
        "ads": ads
    }
```

### Task 7.3: Register Property-Aware Tools in Server

**Update**: `services/mcp-servers/google-ads/server.py`

```python
# Add to imports:
from .tools.property_context import (
    get_property_campaign_performance,
    get_property_ad_performance
)

# Add to @server.list_tools():
Tool(
    name="get_google_ads_property_performance",
    description="Get Google Ads campaign performance for a property by NAME (e.g., 'Sunset Apartments'). No need to remember account IDs!",
    inputSchema={
        "type": "object",
        "properties": {
            "property_identifier": {
                "type": "string",
                "description": "Property name or ID (e.g., 'Sunset Apartments')"
            },
            "date_range": {
                "type": "string",
                "description": "Date range preset",
                "default": "LAST_30_DAYS"
            },
            "limit": {
                "type": "integer",
                "default": 20
            }
        },
        "required": ["property_identifier"]
    }
),

# Add to @server.call_tool():
elif name == "get_google_ads_property_performance":
    result = await get_property_campaign_performance(
        property_identifier=arguments["property_identifier"],
        date_range=arguments.get("date_range", "LAST_30_DAYS"),
        limit=arguments.get("limit", 20)
    )
    
    if result.get("error"):
        return [TextContent(type="text", text=f"❌ {result['error']}")]
    
    output = f"🏢 **{arguments['property_identifier']} - Google Ads Performance**\n\n"
    output += f"📅 Period: {result['date_range']}\n"
    output += f"🔗 Account: {result['google_ads_customer_id']}\n\n"
    
    for i, camp in enumerate(result['campaigns'], 1):
        output += f"{i}. **{camp['name']}**\n"
        output += f"   💰 Spend: {camp['spend_formatted']} | "
        output += f"Clicks: {camp['clicks']:,} | Conv: {camp['conversions']:.1f}\n\n"
    
    return [TextContent(type="text", text=output)]
```

### Task 7.4: Add Property-Aware Tools to Meta Ads MCP

**Repeat similar pattern** for Meta Ads server with property-context wrappers.

### Task 7.5: Update Database Schema (Optional)

**Add if not exists**: Ensure `ad_account_connections` table exists:

```sql
-- Migration: 20251211010000_ad_account_connections.sql
CREATE TABLE IF NOT EXISTS ad_account_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    google_ads_customer_id TEXT,
    meta_ad_account_id TEXT,
    google_ads_refresh_token TEXT,  -- Property-specific tokens
    meta_access_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, google_ads_customer_id),
    UNIQUE(property_id, meta_ad_account_id)
);

CREATE INDEX idx_ad_connections_property ON ad_account_connections(property_id);
CREATE INDEX idx_ad_connections_google ON ad_account_connections(google_ads_customer_id);
CREATE INDEX idx_ad_connections_meta ON ad_account_connections(meta_ad_account_id);

-- RLS Policy
ALTER TABLE ad_account_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org ad connections" ON ad_account_connections
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN properties prop ON prop.org_id = p.org_id
        WHERE p.id = auth.uid()
        AND prop.id = ad_account_connections.property_id
    )
);
```

### Benefits After Phase 7

**User Experience Transformation:**

```
❌ Before: "Show Google Ads for account 163-050-5086"
✅ After:  "Show Google Ads for Sunset Apartments"

❌ Before: Claude doesn't know which property you're asking about
✅ After:  Claude automatically resolves property → ad account

❌ Before: No connection between CRM data and ads data
✅ After:  Full integration with property management system
```

---

## Testing Checklist

### Phase 1 Tests
- [ ] Virtual environments created successfully
- [ ] All dependencies installed without errors
- [ ] Shared utilities import correctly

### Phase 2 Tests (Google Ads)
- [ ] Server starts without errors: `python -m server`
- [ ] `list_google_ads_accounts` returns accounts
- [ ] `get_google_ads_campaign_performance` returns data
- [ ] `execute_google_ads_query` validates read-only queries
- [ ] Invalid queries return error messages

### Phase 3 Tests (Meta Ads)
- [ ] Server starts without errors
- [ ] `list_meta_ad_accounts` returns accounts (requires configured token)
- [ ] `get_meta_campaign_insights` returns data
- [ ] API errors are handled gracefully

### Phase 5 Tests (Cursor Integration)
- [ ] MCP servers appear in Cursor's MCP panel
- [ ] Natural language queries invoke correct tools
- [ ] Results are formatted readably
- [ ] Errors are displayed clearly

### Phase 6 Tests (Write Operations)
- [ ] Write operations require confirmation
- [ ] Guardrails prevent excessive budget changes
- [ ] All write operations are logged to audit table
- [ ] Failed writes don't corrupt campaigns

### Phase 7 Tests (Property Context)
- [ ] Property name lookup works correctly
- [ ] Property → ad account resolution is accurate
- [ ] Property-aware tools return correct data
- [ ] Multi-tenant isolation is enforced
- [ ] Org-level aggregation works across properties

---

## Decision Matrix: Custom vs. Pre-built

### Quick Reference

| Need | Use Pre-built | Build Custom |
|------|---------------|--------------|
| **Just want ads data in Claude** | ✅ | ❌ |
| **Single account, no multi-tenancy** | ✅ | ❌ |
| **Need property-specific context** | ❌ | ✅ |
| **Must have audit logging** | ❌ | ✅ |
| **Multi-tenant platform** | ❌ | ✅ |
| **Auto-sync to database** | ❌ | ✅ |
| **Custom business rules** | ❌ | ✅ |
| **Budget/compliance guardrails** | ❌ | ✅ |

### What You Get with Custom Build

**Layer 1: Basic API Access** (Same as pre-built)
- Read/write to Google Ads & Meta Ads APIs
- Natural language queries via Claude
- Standard reporting and insights

**Layer 2: P11 Platform Integration** (Custom only)
- ✅ Audit logging to `mcp_audit_log` table
- ✅ Data sync to `fact_marketing_performance`
- ✅ Property-aware operations
- ✅ Multi-tenant isolation
- ✅ Custom formatting for property managers

**Layer 3: Business Logic** (Custom only)
- ✅ Budget guardrails tied to property budgets
- ✅ Auto-alerts for overspend
- ✅ Org-level aggregated reporting
- ✅ Role-based operation permissions

### Our Recommendation

**Start with**: Custom build for Meta Ads + Google's official MCP for Google Ads

**Then migrate to**: Full custom when you need:
- Property-context awareness
- Audit logging requirements
- Database integration
- Custom business rules

---

## Reference Comparison

### What We're Building vs. Existing Solutions

| Feature | meta-ads-mcp | Google Official MCP | **Our Custom Build** |
|---------|--------------|---------------------|----------------------|
| **Platform** | Meta Ads | Google Ads | Both |
| **Tools Count** | 29 | ~8-12 | 40+ (combined) |
| **Language** | Python | Node.js/Python | Python |
| **Supabase Integration** | ❌ | ❌ | ✅ |
| **Audit Logging** | ❌ | ❌ | ✅ To database |
| **Property Context** | ❌ | ❌ | ✅ Multi-tenant aware |
| **Token Caching** | ✅ | ✅ | ✅ (borrowed pattern) |
| **Image Resources** | ✅ | ❌ | ✅ (borrowed pattern) |
| **Targeting Search** | ✅ | ❌ | ✅ (borrowed pattern) |
| **Write Operations** | ✅ | ✅ | ✅ (Phase 6) |
| **Budget Scheduling** | ✅ | ❌ | ✅ (borrowed) |
| **Generic Search** | ✅ | ❌ | ✅ (borrowed) |
| **Database Sync** | ❌ | ❌ | ✅ Auto-sync to fact table |
| **Custom Formatting** | Basic | Basic | ✅ PM-friendly |
| **Business Rules** | ❌ | ❌ | ✅ Guardrails |
| **Maintenance** | Community | Google | Your team |
| **Customization** | Fork required | Limited | Full control |

### Code Patterns We're Borrowing from meta-ads-mcp

1. ✅ **Token caching architecture**
2. ✅ **Comprehensive targeting tools** (interests, behaviors, demographics, geo)
3. ✅ **Image upload and resource serving**
4. ✅ **Budget scheduling functionality**
5. ✅ **Generic search across entities**
6. ✅ **Error handling patterns**

### What We're Adding Beyond Reference Implementations

1. ✅ **Supabase integration** - Full database connectivity
2. ✅ **Property-specific context** - Multi-tenant property management
3. ✅ **Audit logging** - Compliance-ready operation logs
4. ✅ **Data synchronization** - Auto-sync to `fact_marketing_performance`
5. ✅ **Custom business logic** - Budget guardrails, alerts, approvals
6. ✅ **Unified architecture** - Both platforms in one consistent design

---

## Appendix: Code Templates

### Quick Test Script

**File**: `services/mcp-servers/test_google_ads.py`

```python
"""Quick test for Google Ads MCP tools."""
import asyncio
import sys
sys.path.insert(0, 'google-ads')

from google_ads.config import is_configured
from google_ads.tools.accounts import list_accounts
from google_ads.tools.performance import get_campaign_performance

async def main():
    print("Testing Google Ads MCP Server\n")
    
    if not is_configured():
        print("❌ Not configured. Check environment variables.")
        return
    
    print("✅ Configuration OK\n")
    
    print("Testing list_accounts...")
    accounts = await list_accounts()
    print(f"Found {len(accounts)} accounts")
    for acc in accounts[:3]:
        print(f"  - {acc['name']} ({acc['id']})")
    
    if accounts:
        print("\nTesting get_campaign_performance...")
        customer_id = accounts[0]['id']
        campaigns = await get_campaign_performance(customer_id, "LAST_7_DAYS", 5)
        print(f"Found {len(campaigns)} campaigns")
        for camp in campaigns[:3]:
            print(f"  - {camp['name']}: {camp['spend_formatted']}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Sample Prompts for Testing

```markdown
## Google Ads Prompts

1. "List all my Google Ads accounts"
2. "Show me campaign performance for account 163-050-5086 in the last 7 days"
3. "What are my top keywords by spend?"
4. "Run this query: SELECT campaign.name, metrics.clicks FROM campaign WHERE metrics.impressions > 1000"

## Meta Ads Prompts

1. "List my Meta ad accounts"
2. "Show me Facebook campaign performance for the last 30 days"
3. "What ad sets are running in my lead gen campaign?"
4. "Show me my custom audiences"
```

---

## Notes & Reminders

### Critical Setup Requirements

1. **Meta Ads OAuth** - Inspired by [meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp):
   - Implement token caching at `~/.meta-ads-mcp/token_cache.json`
   - Use long-lived tokens (60-90 days) or OAuth refresh
   - Store tokens per-property in `ad_account_connections` table

2. **Google Ads Developer Token**:
   - ✅ You have: `163-050-5086` (MCC ID)
   - ⚠️ Verify: Production mode vs. Test mode
   - Production mode needed for full access

3. **Rate Limits**:
   - Google Ads: ~15,000 operations/day
   - Meta: 200 calls/hour per user (default tier)
   - Implement caching for frequently-accessed data (account lists, campaigns)

4. **MCP Package Version**:
   - Check actual version: `pip search mcp` or visit PyPI
   - May need to adjust from `mcp>=1.0.0` to actual available version

5. **Cursor MCP Config Location**:
   - Windows: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
   - Mac: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
   - Linux: `~/.config/Cursor/User/globalStorage/mcp.json`

### Architecture Decisions

✅ **What We're Doing:**
- Isolated new code in `services/mcp-servers/`
- Separate virtual environments
- Shared utilities for Supabase/audit
- Property-context layer (Phase 7)

❌ **What We're NOT Changing:**
- Existing `pipelines/google_ads.py` (ETL continues unchanged)
- Existing `pipelines/meta_ads.py` (ETL continues unchanged)
- Web app API routes
- Scheduled pipeline jobs

### Implementation Strategy

**Recommended Path:**

```
Week 1: Foundation
├─ Phase 1: Infrastructure (3-4 hours)
├─ Phase 2: Google Ads READ-only (6-8 hours)
└─ Phase 5: Cursor Integration (1-2 hours)
   → Milestone: Can query Google Ads via Claude

Week 2: Meta Ads
├─ Phase 3: Meta Ads READ-only (8-10 hours)
├─ Phase 4: Database & Audit (2-3 hours)
└─ Testing & refinement
   → Milestone: Full READ access to both platforms

Week 3+: Advanced Features
├─ Phase 7: Property Context (4-6 hours)
├─ Phase 6: Write Operations (12-16 hours)
└─ Custom business logic
   → Milestone: Production-ready with guardrails
```

### Learning from meta-ads-mcp

**Key Patterns to Adopt:**

1. **Token Caching**:
   ```python
   TOKEN_CACHE = Path.home() / ".meta-ads-mcp" / "token_cache.json"
   ```

2. **Resource Serving** (for images):
   ```python
   @server.list_resources()
   async def list_resources() -> list[Resource]:
       # Serve ad images as MCP resources
   ```

3. **Generic Search**:
   ```python
   def search_all(query: str):
       # Search across accounts, campaigns, ads, pages
   ```

4. **Comprehensive Error Handling**:
   ```python
   try:
       response.raise_for_status()
   except httpx.HTTPStatusError as e:
       error_msg = e.response.json().get("error", {}).get("message")
   ```

### Security Considerations

1. **Token Storage**:
   - ❌ Don't hardcode in mcp.json
   - ✅ Use environment variables
   - ✅ Store per-property tokens in database (encrypted)

2. **Audit Logging**:
   - Log ALL operations (READ and WRITE)
   - Include user context when available
   - Retention policy: 90 days

3. **RLS Policies**:
   - Ensure org-level isolation
   - Property-level permissions
   - Audit log access restricted to admins

---

## Final Checklist Before Starting

- [ ] Review meta-ads-mcp architecture: https://github.com/pipeboard-co/meta-ads-mcp
- [ ] Verify Google Ads credentials in `.env.local`
- [ ] Set up Meta Business Manager access
- [ ] Generate Meta long-lived token
- [ ] Confirm Supabase connection works
- [ ] Check MCP Python package version
- [ ] Locate Cursor MCP config file
- [ ] Back up existing pipeline code
- [ ] Create git branch: `feature/mcp-ads-integration`

---

**Ready to implement!** 

**Decision Required**: Do you want to proceed with:
1. **Full custom build** (Phases 1-7, ~36-49 hours total)
2. **Hybrid approach** (Use Google's official MCP + custom Meta, ~15-25 hours)
3. **Phased rollout** (Start with READ-only custom for both, defer Phase 6-7)

**Recommended**: Option 3 - Build custom READ-only for both platforms (Phases 1-5), validate it works, then add write operations and property context.

