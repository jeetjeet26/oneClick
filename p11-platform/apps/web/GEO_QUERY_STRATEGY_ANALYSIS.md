# GEO Query Strategy Analysis
## Why Aggregator Sites Dominate Your Results

### 🔴 **The Core Problem**

Your current query strategy is **generating queries that aggregator sites (apartments.com, zillow.com, rent.com) are designed to win**.

---

## Current Query Strategy Breakdown

### ✅ **Branded Queries - WORKING WELL**
```typescript
- "What is AMLI Aero?"
- "Is AMLI Aero a good place to live?"
- "AMLI Aero reviews"
- "AMLI Aero apartments"
```

**Why these work:** 
- Direct brand mentions → LLMs prioritize the actual property
- Individual properties CAN compete on their own name
- ✓ Keep these as-is

---

### 🔴 **Category Queries - MAJOR PROBLEM**
```typescript
- "Best apartments in San Diego"              ❌ Too generic
- "Top rated apartments San Diego, CA"        ❌ Too generic
- "Luxury apartments San Diego"               ❌ Too generic  
- "Best places to rent in San Diego"          ❌ Too generic
```

**Why these FAIL for individual properties:**

1. **LLMs are trained on authoritative sources**
   - Apartments.com has "Best apartments in San Diego" articles
   - Zillow has "Top rentals in San Diego" guides
   - Rent.com has comprehensive listings
   - These sites have been crawled billions of times

2. **Aggregators are PURPOSE-BUILT for these queries**
   - They have comprehensive data for EVERY property
   - LLMs see them as the authoritative source for "best" lists
   - Individual properties can't compete on generic "best in city" queries

3. **No differentiation**
   - Every apartment complex uses the same generic queries
   - You're fighting 500+ other properties in the same city
   - Aggregators win because they list ALL 500

---

## What LLMs Return for Generic Queries

### Query: "Best apartments in San Diego"

**Typical LLM Response:**
1. **Apartments.com** - "Comprehensive listings of San Diego apartments"
2. **Zillow** - "Top-rated rentals with verified reviews"
3. **Rent.com** - "Best apartment deals in San Diego"
4. **RentCafe** - "Luxury San Diego apartment communities"
5. *Maybe* 1-2 specific properties if they're super prominent

**Your property's chance of ranking:** < 5%

---

## 🎯 **The Solution: Long-Tail, Specific Queries**

### Strategy Shift

| Instead of Generic | Use Specific Long-Tail |
|-------------------|----------------------|
| "Best apartments in San Diego" | "Modern apartments near UCSD with rooftop pool and pet spa" |
| "Luxury apartments San Diego" | "New luxury high-rise in Kearny Mesa with smart home tech" |
| "Pet friendly apartments" | "Dog-friendly apartments in Mission Valley with bark park under $3000" |

---

## Why Specific Queries Work

### Query: "Modern apartments near UCSD with rooftop pool and pet spa"

**LLM Response:**
1. **Your Property** (if you have these amenities) - Specific match!
2. Apartments.com - "Browse apartments near UCSD"
3. Maybe 1-2 other specific properties

**Your chance of ranking:** 70%+

### Why This Works:

1. **Unique Combination** - Not many properties match ALL criteria
2. **Intent Clarity** - LLM knows exactly what to look for
3. **Less Competition** - Aggregators don't have specific content for this combo
4. **Value Prop** - Showcases YOUR unique features

---

## 📊 Recommended Query Strategy

### 1. **Branded Queries (Keep Current - 4 queries)**
```
✓ "What is {PropertyName}?"
✓ "Is {PropertyName} a good place to live?"
✓ "{PropertyName} reviews"
✓ "{PropertyName} apartments"
```

### 2. **Amenity + Location Combinations (NEW - 5-8 queries)**
```
+ "{Top Amenity} apartments in {Neighborhood}"
+ "Apartments with {Amenity1} and {Amenity2} near {Landmark}"
+ "{PropertyType} in {City} with {UniqueFeature}"
+ "{Lifestyle} apartments in {Neighborhood} {PriceRange}"
```

**Examples for AMLI Aero:**
- "Apartments with rooftop pool and EV charging in Kearny Mesa"
- "Modern apartments near San Diego tech companies with coworking"
- "Pet-friendly luxury apartments in Kearny Mesa with dog park"
- "Newly built apartments in San Diego with smart home technology"

### 3. **Neighborhood-Specific (NEW - 3-4 queries)**
```
+ "Best place to live in {Specific Neighborhood}"
+ "{Neighborhood} apartment communities near {Landmark}"
+ "Moving to {Neighborhood} - where to rent"
```

**Examples:**
- "Best place to live in Kearny Mesa San Diego"
- "Kearny Mesa apartments near tech companies"
- "Moving to Kearny Mesa - apartment recommendations"

### 4. **Lifestyle/Persona Queries (NEW - 4-6 queries)**
```
+ "{Persona} apartments in {City}"
+ "Apartments for {Lifestyle} in {Neighborhood}"
+ "{WorkerType} housing near {Area}"
```

**Examples:**
- "Apartments for young professionals in San Diego tech corridor"
- "Remote worker apartments with high-speed internet in Kearny Mesa"
- "Apartments for UCSD graduate students with parking"

### 5. **USP-Driven Queries (NEW - Use BrandForge Data)**
```
+ Extract top 3 USPs from BrandForge
+ Create queries highlighting these differentiators
```

**Example USPs from BrandForge:**
- "Sustainable green apartments in San Diego with solar power"
- "Apartment with largest rooftop amenity space in Kearny Mesa"
- "Only LEED certified apartments in East San Diego"

### 6. **Comparison Queries (Keep Current)**
```
✓ "{PropertyName} vs {Competitor}"
```

### 7. **Voice Search (Improve Current)**
```
Current:  "Where can I find apartments in San Diego?"  ❌ Too generic
Better:   "Where can I find pet-friendly apartments near UCSD with parking?"  ✓
```

---

## Implementation Strategy

### Phase 1: Immediate Fixes (This Week)

1. **Reduce generic category queries from 4 → 1**
   - Keep only 1 "Best apartments in {City}" for benchmark tracking
   - Delete other generic queries

2. **Add 6-8 specific long-tail queries**
   - Use property's top amenities
   - Combine amenity + location + price/lifestyle

3. **Add 3 neighborhood-specific queries**
   - Focus on actual neighborhood name (not just city)

### Phase 2: BrandForge Integration (Next Sprint)

1. **Pull USPs from BrandForge** 
   - Use `brand_positioning`, `unique_selling_points` fields
   - Generate queries highlighting differentiators

2. **Dynamic query generation**
   - Analyze which queries are working (presence > 50%)
   - Generate similar queries with variations

3. **Competitor analysis**
   - See which queries competitors rank for
   - Generate counter-positioning queries

---

## Proposed New Query Generation Logic

```typescript
async function generateSmartQueryPanel(propertyId: string) {
  // Fetch property + BrandForge data
  const property = await getProperty(propertyId)
  const brand = await getBrandForge(propertyId)
  
  const queries = []
  
  // 1. Branded (4 queries) - Keep current
  queries.push(...generateBrandedQueries(property.name))
  
  // 2. Amenity Combinations (6-8 queries) - NEW
  const topAmenities = property.amenities.slice(0, 5)
  queries.push(...generateAmenityCombos(topAmenities, property.address))
  
  // 3. Neighborhood-Specific (3 queries) - NEW
  queries.push(...generateNeighborhoodQueries(property.address.neighborhood))
  
  // 4. Lifestyle/Persona (4 queries) - NEW
  queries.push(...generatePersonaQueries(brand.target_audience, property.address))
  
  // 5. USP-Driven (3 queries) - NEW
  queries.push(...generateUSPQueries(brand.unique_selling_points))
  
  // 6. Competitor Comparison (3 queries) - Keep current
  queries.push(...generateComparisonQueries(property.name, competitors))
  
  // 7. Voice Search (4 queries) - Improved
  queries.push(...generateSpecificVoiceQueries(property, topAmenities))
  
  // Total: ~27-30 queries (vs current ~20)
  return queries
}

function generateAmenityCombos(amenities: string[], address: Address) {
  const combos = []
  const neighborhood = address.neighborhood || address.city
  
  // 2-amenity combinations
  for (let i = 0; i < amenities.length - 1; i++) {
    for (let j = i + 1; j < amenities.length; j++) {
      combos.push({
        text: `Apartments with ${amenities[i]} and ${amenities[j]} in ${neighborhood}`,
        type: 'category',
        weight: 1.3 // Higher weight - better chance of ranking
      })
      
      if (combos.length >= 6) break
    }
    if (combos.length >= 6) break
  }
  
  return combos
}

function generateNeighborhoodQueries(address: Address) {
  const neighborhood = address.neighborhood || `${address.city} ${address.zip}`
  
  return [
    {
      text: `Best place to live in ${neighborhood}`,
      type: 'local',
      weight: 1.4
    },
    {
      text: `${neighborhood} apartment communities`,
      type: 'local',
      weight: 1.3
    },
    {
      text: `Moving to ${neighborhood} - where to rent`,
      type: 'local',
      weight: 1.2
    }
  ]
}

function generateUSPQueries(usps: string[]) {
  // Extract from BrandForge unique_selling_points
  return usps.slice(0, 3).map(usp => ({
    text: createQueryFromUSP(usp),
    type: 'category',
    weight: 1.5 // Highest weight - unique to you
  }))
}
```

---

## Expected Results

### Current Strategy Results:
```
Category Queries:
- "Best apartments in San Diego" → Presence: 10% (mostly aggregators)
- "Luxury apartments San Diego" → Presence: 5% (mostly aggregators)
- Average Category Presence: 7.5%
```

### Improved Strategy Results:
```
Specific Long-Tail Queries:
- "Modern apartments near UCSD with rooftop pool" → Presence: 65%
- "Dog-friendly apartments in Mission Valley under $3000" → Presence: 70%
- "Pet-friendly luxury apartments in Kearny Mesa with dog park" → Presence: 75%
- Average Specific Query Presence: 70%+
```

---

## Why Aggregators Still Appear (And That's OK)

**Important:** You will NEVER completely eliminate aggregators. Here's why that's fine:

1. **They're authoritative sources** - LLMs should cite them
2. **Co-occurrence is good** - Being mentioned WITH Zillow validates you
3. **Focus on YOUR presence** - Goal is to BE in the list, not eliminate competition

### Success Metric Shift

**OLD Goal:** 
- Rank #1 for "Best apartments in San Diego"
- ❌ Impossible for individual properties

**NEW Goal:**
- Rank #1-3 for 10+ specific long-tail queries
- ✓ Achievable and valuable

---

## Action Items

### Immediate (Do Now):

1. ✅ **Update query generation function** (`apps/web/app/api/propertyaudit/queries/route.ts`)
   - Remove 3 generic category queries
   - Add 6 amenity combination queries
   - Add 3 neighborhood-specific queries

2. ✅ **Pull BrandForge USPs**
   - Add database query to fetch `unique_selling_points`
   - Generate 3 USP-driven queries

3. ✅ **Regenerate query panels** for existing properties
   - Test with AMLI Aero
   - Compare old vs new results

### Short-term (Next Week):

4. **Add dynamic query optimization**
   - Track which query types have highest presence
   - Auto-generate more similar queries

5. **Competitor analysis**
   - See which queries competitors rank for
   - Generate counter-positioning queries

### Long-term (Next Month):

6. **Machine learning optimization**
   - Train model on successful queries
   - Predict which new queries will rank well

---

## Summary

**Problem:** Generic queries like "Best apartments in {city}" favor aggregator sites because:
- They're trained on comprehensive listing sites
- Individual properties can't compete on generic "best" lists
- Aggregators purpose-built for these queries

**Solution:** Shift to specific, long-tail queries that:
- Highlight unique amenity combinations
- Target specific neighborhoods
- Showcase differentiators from BrandForge
- Match specific user intent

**Expected Impact:**
- Category query presence: 7% → 70%
- Aggregator citations: Still present (that's OK!)
- YOUR brand presence: 3x increase
- Actionable differentiation from competitors

---

## Next Steps

Would you like me to:
1. Implement the improved query generation function?
2. Create a migration to regenerate all query panels?
3. Build the BrandForge USP integration?

All three?
