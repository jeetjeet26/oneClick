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
        
        # ========== CAMPAIGN MANAGEMENT ==========
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
        
        # ========== ADSET MANAGEMENT ==========
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
        
        # ========== AD MANAGEMENT ==========
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
                        "description": "Types: country, region, city, zip, geo_market"
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
        # WRITE TOOL - DISABLED FOR SAFETY
        # Tool(
        #     name="upload_meta_ad_image",
        #     description="Upload an image for ad creative use.",
        #     inputSchema={
        #         "type": "object",
        #         "properties": {
        #             "image_url": {"type": "string", "description": "URL of image to upload"},
        #             "image_path": {"type": "string", "description": "Local file path"},
        #             "name": {"type": "string", "description": "Optional image name"},
        #             "account_id": {"type": "string"}
        #         },
        #         "required": []
        #     }
        # ),
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
        # WRITE TOOL - DISABLED FOR SAFETY
        # Tool(
        #     name="create_meta_budget_schedule",
        #     description="Schedule budget changes for high-demand periods.",
        #     inputSchema={
        #         "type": "object",
        #         "properties": {
        #             "campaign_id": {"type": "string"},
        #             "budget_value": {"type": "integer", "description": "Budget amount in cents"},
        #             "budget_value_type": {
        #                 "type": "string",
        #                 "description": "ABSOLUTE or MULTIPLIER",
        #                 "default": "ABSOLUTE"
        #             },
        #             "time_start": {"type": "integer", "description": "Unix timestamp"},
        #             "time_end": {"type": "integer", "description": "Unix timestamp"}
        #         },
        #         "required": ["campaign_id", "budget_value", "time_start", "time_end"]
        #     }
        # ),
        
        # ========== INSIGHTS ==========
        Tool(
            name="get_meta_insights",
            description="Get universal performance insights for any object (campaign/adset/ad/account) with optional breakdowns.",
            inputSchema={
                "type": "object",
                "properties": {
                    "object_id": {"type": "string", "description": "ID of campaign/adset/ad/account"},
                    "date_preset": {"type": "string", "default": "last_30d"},
                    "breakdown": {"type": "string", "description": "Optional: age, gender, country, etc."},
                    "level": {"type": "string", "default": "ad", "description": "ad, adset, campaign, or account"}
                },
                "required": ["object_id"]
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
        
        # WRITE TOOL - DISABLED FOR SAFETY
        # elif name == "upload_meta_ad_image":
        #     result = await client.upload_image(
        #         image_url=arguments.get("image_url"),
        #         image_path=arguments.get("image_path"),
        #         name=arguments.get("name"),
        #         account_id=account_id
        #     )
        #     return [TextContent(type="text", text=f"✅ Image uploaded: {json.dumps(result, indent=2)}")]
        
        elif name == "get_meta_ad_image":
            result = await client.get_ad_image(ad_id=arguments["ad_id"])
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        
        # WRITE TOOL - DISABLED FOR SAFETY
        # elif name == "create_meta_budget_schedule":
        #     result = await client.create_budget_schedule(
        #         campaign_id=arguments["campaign_id"],
        #         budget_value=arguments["budget_value"],
        #         budget_value_type=arguments.get("budget_value_type", "ABSOLUTE"),
        #         time_start=arguments["time_start"],
        #         time_end=arguments["time_end"]
        #     )
        #     return [TextContent(type="text", text=f"✅ Budget schedule created: {json.dumps(result, indent=2)}")]
        
        elif name == "get_meta_insights":
            result = await client.get_insights(
                object_id=arguments["object_id"],
                date_preset=arguments.get("date_preset", "last_30d"),
                breakdown=arguments.get("breakdown"),
                level=arguments.get("level", "ad")
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



















