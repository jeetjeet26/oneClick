# PropertyAudit GEO Enhancements

## Implementation Summary

This document outlines the PropertyAudit enhancements implemented to improve GEO (Generative Engine Optimization) capabilities, focusing on actionable recommendations and voice search support.

---

## ✅ Feature 1: Content Recommendations Engine

**Status:** Completed

### Overview
A sophisticated recommendation engine that analyzes GEO run data to generate actionable content suggestions. The engine identifies opportunities to improve AI visibility and provides prioritized action items.

### Components Created

#### 1. Core Engine
**File:** `utils/propertyaudit/recommendation-engine.ts`

**Functionality:**
- Analyzes GEO gaps from run data
- Generates 5 types of recommendations:
  1. **Missing Keywords** - Queries where brand has no presence
  2. **Content Gaps** - Topics where competitors rank higher
  3. **Citation Opportunities** - High-authority domains to target
  4. **Rank Improvements** - Queries close to top 3 that need optimization
  5. **Voice Search Opportunities** - FAQ queries for conversational search

**Key Features:**
- Priority scoring (High/Medium/Low)
- Impact score calculation (0-100)
- Competitor context analysis
- Actionable steps generation
- Related query tracking

#### 2. API Endpoint
**File:** `app/api/propertyaudit/recommendations/route.ts`

**Endpoint:** `GET /api/propertyaudit/recommendations`

**Query Parameters:**
- `propertyId` (required) - Property to analyze
- `runId` (optional) - Specific run to analyze (defaults to last 5 runs)

**Response:**
```typescript
{
  recommendations: ContentRecommendation[],
  summary: RecommendationSummary,
  propertyId: string,
  runId: string | null,
  generatedAt: string
}
```

#### 3. UI Component
**File:** `components/propertyaudit/recommendations/ContentRecommendations.tsx`

**Features:**
- Summary cards showing total recommendations by priority
- Filter by priority level (High/Medium/Low)
- Filter by recommendation type
- Copy action items to clipboard
- Export recommendations to CSV
- Impact score visualization
- Competitor benchmark display

**UI Elements:**
- Recommendation cards with priority badges
- Keyword tags
- Actionable steps with copy functionality
- Impact reasoning
- Competitor context when available

#### 4. Dashboard Integration
**File:** `app/dashboard/propertyaudit/page.tsx`

**Changes:**
- Added "Recommendations" tab to PropertyAudit dashboard
- Tab positioned between "Queries" and "Insights"
- Displays ContentRecommendations component when property is selected

### Example Recommendations

**1. Missing Keyword (High Priority)**
```
Title: "No presence for: 'Best apartments in Denver'"
Impact Score: 70
Action Items:
- Create content targeting "Best apartments in Denver"
- Optimize existing pages with this keyword
- Build backlinks from authoritative sites
- Focus content on Denver area
```

**2. Rank Improvement (High Priority)**
```
Title: "Improve rank for: 'luxury apartments Denver'"
Description: Currently averaging position #5.2. Small improvements could push you into top 3.
Impact Score: 85
Action Items:
- Refresh content with recent updates
- Add more comprehensive information
- Improve internal linking to this page
- Get 2-3 new backlinks from relevant sites
```

### Algorithm Details

**Priority Calculation:**
- Branded queries missing: High
- Category queries missing: Medium
- Rank 4-7 (close to top 3): High
- Rank 8+: Medium/Low
- FAQ/Voice opportunities: Low

**Impact Score (0-100):**
- Missing branded: 90
- Missing category: 70
- Rank improvement: 85
- Citation opportunity: 40-75 (based on frequency)
- Voice search: 55

---

## ✅ Feature 2: Voice Search Query Type

**Status:** Completed

### Overview
Added support for conversational/voice search queries optimized for voice assistants and question-based searches.

### Changes Made

#### 1. Database Schema
**File:** `supabase/migrations/20251217010000_add_voice_search_query_type.sql`

**Change:**
```sql
alter type geo_query_type_enum add value if not exists 'voice_search';
```

#### 2. Type Definitions
**File:** `utils/propertyaudit/types.ts`

**Added:**
```typescript
export type QueryType = 'branded' | 'category' | 'comparison' | 'local' | 'faq' | 'voice_search'
```

#### 3. Query Generation
**File:** `app/api/propertyaudit/queries/route.ts`

**Added Voice Search Templates:**
- "How do I apply to {propertyName}?"
- "What amenities does {propertyName} have?"
- "Where can I find apartments in {city}?"
- "How much does it cost to live in {city}?"
- "What is the best apartment community in {city}?"
- "Tell me about {propertyName}"

**Weight:** 1.1 (slightly higher than standard FAQ queries)

#### 4. UI Components

**CreateQueryModal:**
- Added voice_search to type dropdown
- Added voice search template option
- Label: "Voice Search - Conversational queries"

**QueryTable:**
- Added voice_search to QueryRow interface
- Added indigo color scheme for voice_search badges
- Format helper: Displays "Voice Search" instead of "voice_search"

**QueryFilters:**
- Automatic support for voice_search filtering
- Displays "Voice Search" in type filter pills

### Voice Search Characteristics

**Format:**
- Question-based (How/What/Where/Tell me)
- Conversational language
- Natural phrasing

**Optimization:**
- Answer in 2-3 sentences
- Use natural language
- Provide direct, concise responses
- Add FAQ schema markup (recommended)

**Example Queries:**
```
✓ "How do I apply to Cadence Creek Apartments?"
✓ "What amenities does the property have?"
✓ "Where can I find pet-friendly apartments in Denver?"
```

---

## Integration Points

### With Existing Features

1. **PropertyAudit Dashboard**
   - Recommendations tab displays all generated suggestions
   - Voice search queries tracked alongside other query types

2. **GEO Runs**
   - Voice search queries included in all audits
   - LLM responses analyzed for conversational format
   - Scores calculated using same algorithm

3. **Competitor Insights**
   - Recommendations leverage competitor analysis
   - Citation opportunities based on competitor citations

4. **Query Management**
   - Voice search queries can be added manually
   - Auto-generated during query panel generation
   - Filterable and sortable like other query types

### Future Enhancement Opportunities

1. **Auto-Execution** (Deferred - P11-97)
   - Connect recommendations to SiteForge for automated content updates
   - Requires general-purpose content generation architecture

2. **Google AI Overviews** (Deferred - P11-96)
   - Track presence in Google's AI-powered search features
   - Compare traditional SEO vs GEO performance

3. **Social Search Integration** (Deferred - P11-98)
   - Expand tracking to TikTok, Instagram search
   - Leverage ForgeStudio social data

4. **Traffic Impact Prediction** (Deferred - P11-99)
   - Integrate with GA4 data
   - Forecast traffic shifts from AI search adoption

---

## Files Changed/Created

### New Files (7)
1. `utils/propertyaudit/recommendation-engine.ts` - Core recommendation logic
2. `app/api/propertyaudit/recommendations/route.ts` - API endpoint
3. `components/propertyaudit/recommendations/ContentRecommendations.tsx` - UI component
4. `components/propertyaudit/recommendations/index.ts` - Exports
5. `supabase/migrations/20251217010000_add_voice_search_query_type.sql` - Schema update
6. `PROPERTYAUDIT_ENHANCEMENTS.md` - This documentation

### Modified Files (7)
1. `utils/propertyaudit/types.ts` - Added QueryType export
2. `app/api/propertyaudit/queries/route.ts` - Voice search support
3. `components/propertyaudit/index.ts` - Export recommendations
4. `components/propertyaudit/query/CreateQueryModal.tsx` - Voice search option
5. `components/propertyaudit/query/QueryTable.tsx` - Voice search display
6. `components/propertyaudit/query/QueryFilters.tsx` - Voice search filtering
7. `app/dashboard/propertyaudit/page.tsx` - Recommendations tab

---

## Testing Recommendations

### Recommendations Engine
1. Run GEO audit with mix of query types
2. Navigate to Recommendations tab
3. Verify all 5 recommendation types generate
4. Test filtering by priority and type
5. Test CSV export functionality
6. Test copy action items to clipboard

### Voice Search Queries
1. Generate query panel for a property
2. Verify 6 voice search queries created
3. Run GEO audit including voice queries
4. Check LLM responses for conversational format
5. Verify voice_search badge displays as "Voice Search"
6. Test filtering by voice_search type

### Integration
1. Create manual voice search query
2. Run audit and verify scoring works
3. Check recommendations tab for voice search opportunities
4. Verify competitor insights include all query types
5. Test export reports include voice search data

---

## Performance Considerations

### Recommendations Engine
- Analyzes last 5 runs by default (configurable via runId parameter)
- Uses in-memory processing (no additional database queries after initial fetch)
- Sorts and filters on client side for responsive UI
- CSV export processes client-side

### Voice Search Queries
- No performance impact - treated like any other query type
- Same LLM API calls as standard queries
- Minimal storage overhead (enum value)

---

## Conclusion

Both enhancements are production-ready and fully integrated with the existing PropertyAudit system. The recommendations engine provides actionable insights based on GEO data, while voice search support future-proofs the platform for conversational AI queries.

**Key Benefits:**
- ✅ Actionable recommendations (not just reporting)
- ✅ Prioritized by impact
- ✅ Competitor-aware suggestions
- ✅ Voice search tracking for future-proofing
- ✅ CSV export for team collaboration
- ✅ No breaking changes to existing functionality
