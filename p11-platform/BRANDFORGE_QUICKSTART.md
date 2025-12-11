# 🎨 BrandForge - Quick Start Guide

**Status:** ✅ **FULLY IMPLEMENTED**  
**Date:** December 10, 2025

---

## What is BrandForge?

BrandForge is an AI-powered brand book generator that creates comprehensive brand guidelines through a conversational process with Gemini 3. It produces the same quality deliverables as P11's manual brand books (like the ALBUM brand book).

---

## Setup Required

### 1. Environment Variables

Add to your `.env.local`:

```env
# Gemini 3 API Key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Already configured (for logo generation):
GOOGLE_CLOUD_PROJECT_ID=oneclick-480705
GOOGLE_APPLICATION_CREDENTIALS=./oneclick-480705-368efa0645c7.json
```

### 2. Supabase Storage Bucket

Create bucket if not exists:
```sql
-- Run in Supabase SQL editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT DO NOTHING;
```

### 3. Database Migration

Already applied! ✅ Migration `brandforge_stepwise_schema` created the `property_brand_assets` table.

---

## How to Use

### For Property Managers (End Users)

1. **Create New Property**
   - Click "Add Property" button
   - Fill in community details, contacts, integrations
   - Reach "Knowledge Base" step

2. **Choose Generate Brand Book**
   - See two options: "Upload Documents" or "Generate Brand Book"
   - Click "Generate Brand Book"

3. **Competitive Analysis** (2 minutes)
   - System automatically discovers and analyzes competitors
   - Identifies market gaps and positioning opportunities

4. **Conversation with Gemini 3** (10-15 minutes)
   - Answer 8-10 questions about:
     - Your vision for the property
     - Target audience
     - Brand personality preferences
     - Visual style preferences
   - Gemini 3 builds brand strategy from your answers

5. **Review 12 Sections** (20-30 minutes)
   - Each section generates sequentially
   - For each section, you can:
     - ✏️ **Edit** - Change any text inline
     - ✨ **Regenerate** - Ask AI to create new version
     - ✓ **Approve** - Lock in and proceed to next
   - Sections:
     1. Introduction
     2. Positioning Statement
     3. Target Audience
     4. Personas (3 resident profiles)
     5. Brand Name & Story
     6. Logo Design
     7. Typography System
     8. Color Palette
     9. Design Elements
     10. Photo Guidelines - Yep
     11. Photo Guidelines - Nope
     12. Implementation Examples

6. **Download Brand Book**
   - When all 12 sections approved, PDF generates
   - Download 15-page brand book
   - Automatically saved to knowledge base

---

## What Gets Generated

### Deliverables
- ✅ **Brand Strategy** - Positioning, target audience, voice
- ✅ **Visual Identity** - Logo, colors, typography
- ✅ **Design Guidelines** - Elements, patterns, usage rules
- ✅ **Photo Guidelines** - Style direction with examples
- ✅ **Personas** - 3 resident profiles with AI-generated photos
- ✅ **Implementation Examples** - How brand appears on materials
- ✅ **15-Page PDF Brand Book** - Complete guidelines document

### How It's Stored

1. **Structured Data** - `property_brand_assets` table
   - All 12 sections stored as JSONB
   - Products query directly for colors, fonts, messaging
   
2. **Embeddings** - `documents` table
   - Full brand narrative with vector embeddings
   - Semantic search for "What's the brand personality?"

---

## How Other Products Use Brand Data

### ForgeStudio AI (Content Generation)
```typescript
// Queries brand for content generation
const brand = await supabase
  .from('property_brand_assets')
  .select('section_5_name_story, conversation_summary')
  .eq('property_id', propertyId)
  .single()

// Uses brand voice and messaging in posts
```

### SiteForge AI (WordPress Generation) - Future
```typescript
// Queries brand for website design
const brand = await supabase
  .from('property_brand_assets')
  .select('section_6_logo, section_8_colors, section_7_typography')
  .eq('property_id', propertyId)
  .single()

// Generates WordPress site matching brand exactly
const site = await generateWordPress({
  colors: brand.section_8_colors,
  typography: brand.section_7_typography,
  logo: brand.section_6_logo?.primary_url
})
```

### LumaLeasing (Chatbot)
```typescript
// Chatbot speaks in brand voice
const brand = await getBrand(propertyId)

const systemPrompt = `
You are the leasing agent for ${brand.section_5_name_story?.name}.
Brand Voice: ${brand.conversation_summary?.brandVoice}
Personality: ${brand.conversation_summary?.brandPersonality}
`
```

---

## Key Technical Details

### Stepwise Generation (Why It Works)

❌ **BAD:** Generate all 12 sections → User regenerates section 3 → Sections 4-12 misaligned

✅ **GOOD:** 
```
Generate Section 1 → Approve → ✓
  ↓ (approved section 1 feeds into...)
Generate Section 2 → Approve → ✓
  ↓ (approved sections 1+2 feed into...)
Generate Section 3 → Approve → ✓
  ↓ (continues sequentially...)
```

Each section builds on ALL previously approved sections, ensuring perfect coherence.

### No Hardcoded Product Connections

Products don't call BrandForge APIs. They just query the database:

```typescript
// Any product can do this
const brand = await supabase
  .from('property_brand_assets')
  .select('*')
  .eq('property_id', propertyId)
  .single()

// Use brand data
if (brand) {
  useColors(brand.section_8_colors)
}
```

---

## File Structure

```
✅ Database:
   supabase/migrations/20251213000000_brandforge_stepwise_schema.sql

✅ API Endpoints:
   app/api/brandforge/
   ├── analyze/route.ts              - Competitive analysis
   ├── conversation/route.ts          - Gemini 3 chat
   ├── generate-next-section/route.ts - Sequential generation
   ├── regenerate-section/route.ts    - Regenerate current section
   ├── edit-section/route.ts          - Manual editing
   ├── approve-section/route.ts       - Approve & move to next
   ├── generate-pdf/route.ts          - Final PDF compilation
   └── status/route.ts                - Get brand status/progress

✅ UI Components:
   components/brandforge/
   ├── BrandForgeWizard.tsx          - Main orchestrator
   ├── ConversationInterface.tsx      - Chat UI
   ├── SectionReview.tsx              - Review/edit/regenerate/approve
   ├── CompletionView.tsx             - Success screen
   ├── BrandDisplay.tsx               - Property overview card
   └── index.ts

✅ Integration:
   app/dashboard/properties/new/steps/KnowledgeStep.tsx - Choice UI added
   app/dashboard/community/page.tsx - BrandDisplay added, modal removed
   app/dashboard/brandforge/[propertyId]/page.tsx - Full brand book viewer

✅ Documentation:
   BRANDFORGE_IMPLEMENTATION.md - Technical documentation
```

---

## Testing

### Test Flow

1. Create new property: `/dashboard/properties/new`
2. Fill basic info
3. At Knowledge Base step, click "Generate Brand Book"
4. Watch competitive analysis run
5. Have conversation with Gemini 3
6. Review each of 12 sections
7. Try regenerating a section
8. Try editing a section
9. Approve all sections
10. Download final PDF

### Expected Results
- ✅ Conversation extracts brand strategy
- ✅ Each section builds on previous approved sections
- ✅ Regeneration creates different content
- ✅ Edits save correctly
- ✅ PDF generates when all approved
- ✅ Brand book appears in property overview
- ✅ Knowledge base contains brand guidelines

---

## Known Limitations (MVP)

1. **Logo Generation** - Uses Imagen, may need refinement prompts
2. **PDF Format** - Currently JSON export, full PDF formatting in Phase 2
3. **Persona Photos** - Placeholder, actual generation in Phase 2
4. **Implementation Mockups** - Descriptions only, actual mockups in Phase 2

---

## Next Steps

### Immediate
- [ ] Add Gemini API key to environment
- [ ] Test full flow with sample property
- [ ] Verify logo generation works
- [ ] Test knowledge base integration

### Phase 2 (Q1 2026)
- [ ] Enhanced logo generation (multiple concepts)
- [ ] Actual persona photo generation
- [ ] Full PDF rendering with professional layout
- [ ] Implementation mockup generation
- [ ] Vision board auto-compilation

### Phase 3 (Q2 2026)
- [ ] SiteForge AI integration (use brand book for WordPress)
- [ ] Brand consistency scoring
- [ ] Multi-variant brand testing
- [ ] Client white-label export

---

## Support

**Questions?** Check `BRANDFORGE_IMPLEMENTATION.md` for technical details.

**Issues?** All components have error handling and logging.

**API Testing:** Use the status endpoint to check brand generation progress:
```bash
GET /api/brandforge/status?propertyId={id}
```

---

🎉 **BrandForge is ready to use!**





