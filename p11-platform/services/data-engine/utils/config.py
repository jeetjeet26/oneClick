"""
Shared configuration loader for the data-engine.
Loads environment variables from the monorepo root .env file.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Find and load the root .env file
# Path: services/data-engine/utils/config.py -> p11-platform/.env
ROOT_DIR = Path(__file__).resolve().parents[3]
ROOT_ENV = ROOT_DIR / ".env"

if ROOT_ENV.exists():
    load_dotenv(ROOT_ENV)
    print(f"✓ Loaded environment from {ROOT_ENV}")
else:
    # Fallback: try local .env in data-engine folder
    LOCAL_ENV = Path(__file__).resolve().parents[1] / ".env"
    if LOCAL_ENV.exists():
        load_dotenv(LOCAL_ENV)
        print(f"✓ Loaded environment from {LOCAL_ENV}")
    else:
        print("⚠ No .env file found. Using system environment variables.")

# Export commonly used config values
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
TARGET_PROPERTY_ID = os.environ.get("TARGET_PROPERTY_ID")

# Apify configuration for apartments.com scraping
APIFY_API_TOKEN = os.environ.get("APIFY_API_TOKEN")

# Apify proxy configuration
# Proxy types: "residential" (recommended for apartments.com), "datacenter" (cheaper but may be blocked)
APIFY_PROXY_TYPE = os.environ.get("APIFY_PROXY_TYPE", "residential")
# Country code for geo-targeting (US recommended for apartments.com)
APIFY_PROXY_COUNTRY = os.environ.get("APIFY_PROXY_COUNTRY", "US")

# Google Maps for competitor discovery
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")


