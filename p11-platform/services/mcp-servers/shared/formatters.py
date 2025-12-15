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









