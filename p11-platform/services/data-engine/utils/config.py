"""
Shared configuration loader for the data-engine.
Loads environment variables from BOTH root and local .env files.
Local .env values override root .env values.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment files in order (root first, then local overlay)
# Path: services/data-engine/utils/config.py -> p11-platform/.env
ROOT_DIR = Path(__file__).resolve().parents[3]
ROOT_ENV = ROOT_DIR / ".env"
LOCAL_ENV = Path(__file__).resolve().parents[1] / ".env"

loaded_files = []

# Load root .env if it exists
if ROOT_ENV.exists():
    load_dotenv(ROOT_ENV, override=False)
    loaded_files.append(str(ROOT_ENV))

# Load local .env if it exists (overrides root values)
if LOCAL_ENV.exists():
    load_dotenv(LOCAL_ENV, override=True)
    loaded_files.append(str(LOCAL_ENV))

if loaded_files:
    print(f"[OK] Loaded environment from: {', '.join(loaded_files)}")
else:
    print("[WARN] No .env file found. Using system environment variables.")

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


