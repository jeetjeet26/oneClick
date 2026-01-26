import sys
import os

# Add meta-ads to path so we can import config
target_dir = os.path.join('p11-platform', 'services', 'mcp-servers', 'meta-ads')
sys.path.append(target_dir)

try:
    import config
    print(f"Configured: {config.is_configured()}")
    print(f"Token: {config.META_ACCESS_TOKEN[:10] if config.META_ACCESS_TOKEN else 'None'}...")
    print(f"Account: {config.META_AD_ACCOUNT_ID}")
except Exception as e:
    print(f"Error: {e}")




