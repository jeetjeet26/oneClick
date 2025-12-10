# ReviewFlow AI - Multi-Source Integration

## Overview

ReviewFlow AI now supports multiple review sources with automatic sync, AI analysis, and response generation.

## Supported Platforms

### Google Business (Recommended)
- **Connection Types:**
  - **API (Recommended):** Uses Google Places API
  - **Scraper:** Uses data-engine for scraping (fallback)
- **Reviews per Request:** Up to 5 (Google API limitation)
- **Required:** Google Place ID

### Yelp
- **Connection Type:** Yelp Fusion API (via data-engine)
- **Reviews per Request:** **3 maximum** (hard Yelp API limit)
- **Required:** Yelp Business ID or Yelp Business URL

### Manual Import
- **CSV Upload:** Bulk import from spreadsheet
- **Manual Entry:** Single review at a time

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 ReviewFlow Frontend                     │
│  ImportReviewsModal → ReviewFlowConfig → ReviewList    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│             Next.js API Routes                          │
│  /api/reviewflow/sync → connections → reviews          │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     ┌────────────────┐       ┌────────────────┐
     │   Direct API   │       │  Data Engine   │
     │  (Google API)  │       │   (FastAPI)    │
     └────────────────┘       └────────────────┘
                                     │
                         ┌───────────┴───────────┐
                         ▼                       ▼
                ┌───────────────┐       ┌───────────────┐
                │ google_places │       │    yelp.py    │
                │   .py         │       │  (Fusion API) │
                └───────────────┘       └───────────────┘
```

## Files Modified/Created

### Python (Data Engine)
- `scrapers/google_places.py` - Extended with review extraction
- `scrapers/yelp.py` - **NEW** - Yelp Fusion API client
- `main.py` - Added review scraping endpoints

### Next.js API Routes
- `app/api/reviewflow/sync/route.ts` - Multi-source sync support
- `app/api/reviewflow/connections/route.ts` - Extended for new fields

### React Components
- `components/reviewflow/ImportReviewsModal.tsx` - Multi-source tabs
- `components/reviewflow/ReviewFlowConfig.tsx` - Connection management

### Database
- `migrations/20251210000000_reviewflow_multi_source.sql` - New columns

## API Endpoints

### Data Engine (Python)
```
POST /scraper/google-reviews
  Body: { place_id, max_reviews }

POST /scraper/google-reviews/search
  Body: { property_name, address, lat?, lng? }

POST /scraper/yelp-reviews
  Body: { business_id }

POST /scraper/yelp-reviews/search
  Body: { property_name, city, state? }

POST /scraper/yelp-reviews/from-url
  Body: { url }

GET /scraper/reviews/status
```

### Next.js
```
POST /api/reviewflow/sync
  Body: { propertyId, platform, method? }

POST /api/reviewflow/connections
  Body: { propertyId, platform, placeId?, yelpBusinessId?, connectionType? }

PATCH /api/reviewflow/connections
  Body: { connectionId, ... }

GET /api/reviewflow/connections?propertyId=...
```

## Environment Variables

### Data Engine
```bash
# Google (for review fetching)
GOOGLE_MAPS_API_KEY=your_key_here

# Yelp
YELP_FUSION_API_KEY=your_key_here

# OpenAI (for sentiment analysis)
OPENAI_API_KEY=your_key_here
```

### Next.js Web App
```bash
# Data Engine URL
DATA_ENGINE_URL=http://localhost:8000  # or production URL

# Google (direct API calls)
GOOGLE_PLACES_API_KEY=your_key_here
```

## Database Schema Changes

```sql
-- New columns added to review_platform_connections
connection_type TEXT DEFAULT 'api'  -- 'api', 'scraper', 'manual'
google_maps_url TEXT
yelp_business_url TEXT
yelp_business_id TEXT
scraping_config JSONB DEFAULT '{}'
total_reviews_synced INTEGER DEFAULT 0
last_review_date TIMESTAMPTZ
limitation_note TEXT
```

## Important Limitations

### Yelp API (Hard Limit)
- Yelp Fusion API returns **only 3 most recent reviews**
- This is a Yelp restriction, not a bug
- No workaround available without Business Owner API access
- Users should be informed of this limitation

### Google API
- Standard Places API returns ~5 reviews
- More reviews require Places API (New) paid tier
- Consider using scraper for more reviews (use carefully)

## Usage Flow

1. **Import Reviews** → Modal opens
2. Select platform (Google, Yelp, Manual, CSV)
3. Enter credentials (Place ID, Business URL, etc.)
4. Connection saved to database
5. Initial sync triggered
6. Reviews imported → AI analysis → Tickets created (for negative)
7. Auto-sync runs via cron job (hourly)

## Cron Jobs

Already configured in `vercel.json`:
```json
{
  "path": "/api/cron/sync-reviews",
  "schedule": "0 * * * *"  // Every hour
}
```

## Testing

### Test Google Integration
```bash
# Via data-engine directly
curl -X POST http://localhost:8000/scraper/google-reviews \
  -H "Content-Type: application/json" \
  -d '{"place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4"}'
```

### Test Yelp Integration
```bash
# Via data-engine directly
curl -X POST http://localhost:8000/scraper/yelp-reviews/from-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.yelp.com/biz/the-domain-at-wills-crossing-austin"}'
```

### Check Status
```bash
curl http://localhost:8000/scraper/reviews/status
```

---

*Created: December 10, 2025*

