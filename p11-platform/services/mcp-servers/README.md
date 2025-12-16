# MCP Ads Integration Servers

Custom MCP servers for Google Ads and Meta Ads management, integrated with P11 Platform.

## 🚀 Quick Start

### 1. Set Up Virtual Environments

```powershell
# Google Ads
cd google-ads
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Meta Ads
cd ../meta-ads
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Add to `apps/web/.env.local`:

```env
# Google Ads
GOOGLE_ADS_CUSTOMER_ID=163-050-5086
GOOGLE_ADS_DEVELOPER_TOKEN=your_token
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=your_client_secret

# Meta Ads
META_ACCESS_TOKEN=your_access_token
META_AD_ACCOUNT_ID=your_account_id

# Supabase
SUPABASE_URL=https://lmjmutuggvzuadwreqxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

### 3. Test Servers

```powershell
# Test Google Ads
cd p11-platform/services/mcp-servers
python test_google_ads.py

# Test Meta Ads
python test_meta_ads.py
```

### 4. Configure Cursor

Copy `cursor-mcp-config.json` to your Cursor MCP config location:
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- Mac: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- Linux: `~/.config/Cursor/User/globalStorage/mcp.json`

### 5. Restart Cursor

After configuring, restart Cursor to load the MCP servers.

## 📁 Structure

```
mcp-servers/
├── shared/                     # Shared utilities
│   ├── supabase_client.py     # Database connection
│   ├── audit.py               # Audit logging
│   ├── property_service.py    # Property lookups
│   └── formatters.py          # Output formatting
│
├── google-ads/                 # Google Ads MCP Server
│   ├── config.py
│   ├── auth.py
│   ├── server.py
│   ├── __main__.py
│   ├── requirements.txt
│   └── tools/
│       ├── accounts.py
│       ├── queries.py
│       ├── performance.py
│       └── property_context.py
│
└── meta-ads/                   # Meta Ads MCP Server
    ├── config.py
    ├── client.py
    ├── server.py
    ├── __main__.py
    └── requirements.txt
```

## 🔧 Tools Available

### Google Ads (7 tools)
- `list_google_ads_accounts` - List all accessible accounts
- `get_google_ads_account_info` - Account details
- `execute_google_ads_query` - Run GAQL queries
- `get_google_ads_campaign_performance` - Campaign metrics
- `get_google_ads_ad_performance` - Ad-level metrics
- `get_google_ads_keywords` - Keyword performance
- `get_google_ads_property_performance` - Property-aware campaign metrics

### Meta Ads (20+ tools)
- Account management (2 tools)
- Campaign management (2 tools)
- AdSet management (2 tools)
- Ad management (3 tools)
- Targeting tools (6 tools)
- Pages & assets (4 tools)
- Insights (1 tool)

## 📊 Usage Examples

### Via Cursor/Claude

```
"Show me Google Ads performance for Sunset Apartments"
→ Calls: get_google_ads_property_performance

"List my Meta ad accounts"
→ Calls: list_meta_ad_accounts

"What interests should I target for apartment renters?"
→ Calls: search_meta_interests with relevant queries

"Show top 5 Google Ads campaigns by spend"
→ Calls: get_google_ads_campaign_performance
```

### Direct Python Testing

```python
# Test Google Ads
from google_ads.tools.accounts import list_accounts
accounts = await list_accounts()

# Test Meta Ads
from meta_ads.client import MetaAdsClient
client = MetaAdsClient()
accounts = await client.get_ad_accounts()
```

## 🗄️ Database

Apply migration:

```sql
-- Run in Supabase SQL Editor or via CLI
-- File: supabase/migrations/20251211000000_mcp_audit_infrastructure.sql
```

This creates:
- `mcp_audit_log` - Tracks all MCP operations
- `ad_account_connections` - Links ad accounts to properties

## 🔒 Security

- ✅ READ-only operations by default
- ✅ Audit logging to database
- ✅ Environment variable configuration
- ✅ Token caching for OAuth
- ✅ RLS policies for multi-tenant isolation

## 📝 Notes

- **Token caching**: Meta tokens cached at `~/.meta-ads-mcp/token_cache.json`
- **Python version**: Requires Python 3.10+
- **MCP version**: Uses `mcp>=0.9.0` package
- **Campaign filtering**: Both tools support filtering by campaign ID or name

## 🐛 Troubleshooting

**"Module not found" errors**:
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt`

**"Not configured" errors**:
- Check environment variables are set
- Verify `.env.local` path is correct

**"Account not found" errors**:
- Verify Google Ads MCC ID is correct
- Check Meta access token permissions

## 📚 References

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)
- [meta-ads-mcp inspiration](https://github.com/pipeboard-co/meta-ads-mcp)












