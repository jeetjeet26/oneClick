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
from .tools.property_context import (
    get_property_campaign_performance,
    get_property_ad_performance
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
            description="Get campaign performance metrics including spend, clicks, impressions, and conversions. Can filter by campaign ID or name.",
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
                    },
                    "campaign_id": {
                        "type": "string",
                        "description": "Optional: Filter by specific campaign ID"
                    },
                    "campaign_name_filter": {
                        "type": "string",
                        "description": "Optional: Filter campaigns by name substring"
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
        Tool(
            name="get_google_ads_property_performance",
            description="Get Google Ads campaign performance for a property by NAME (e.g., 'Sunset Apartments'). Automatically looks up the account. Can filter by campaign ID or name.",
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
                    },
                    "campaign_id": {
                        "type": "string",
                        "description": "Optional: Filter by specific campaign ID"
                    },
                    "campaign_name_filter": {
                        "type": "string",
                        "description": "Optional: Filter campaigns by name substring"
                    }
                },
                "required": ["property_identifier"]
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
                limit=arguments.get("limit", 20),
                campaign_id=arguments.get("campaign_id"),
                campaign_name_filter=arguments.get("campaign_name_filter")
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
        
        elif name == "get_google_ads_property_performance":
            result = await get_property_campaign_performance(
                property_identifier=arguments["property_identifier"],
                date_range=arguments.get("date_range", "LAST_30_DAYS"),
                limit=arguments.get("limit", 20),
                campaign_id=arguments.get("campaign_id"),
                campaign_name_filter=arguments.get("campaign_name_filter")
            )
            
            if result.get("error"):
                return [TextContent(type="text", text=f"❌ {result['error']}")]
            
            output = f"🏢 **{arguments['property_identifier']} - Google Ads Performance**\n\n"
            output += f"📅 Period: {result['date_range']}\n"
            output += f"🔗 Account: {result['google_ads_customer_id']}\n\n"
            
            for i, camp in enumerate(result['campaigns'], 1):
                status_icon = "🟢" if camp["status"] == "ENABLED" else "🔴"
                output += f"{i}. {status_icon} **{camp['name']}**\n"
                output += f"   💰 Spend: {camp['spend_formatted']} | "
                output += f"Clicks: {camp['clicks']:,} | Conv: {camp['conversions']:.1f}\n\n"
            
            return [TextContent(type="text", text=output)]
        
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















