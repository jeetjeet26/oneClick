# SiteForge™ - LLM-Powered WordPress Site Generation

**Status:** Planning Phase  
**Target:** Q2 2026  
**Last Updated:** December 11, 2025

---

## 🎯 Vision

**"One-click WordPress websites that look professionally designed, built entirely from your brand knowledge base."**

SiteForge automatically generates complete, production-ready WordPress sites by intelligently analyzing:
1. **BrandForge data** (if available) - structured brand book sections
2. **Knowledge Base assets** (if no BrandForge) - uploaded PDFs, brand guidelines, images
3. **Property data** - location, amenities, floorplans from MarketVision
4. **Competitive intelligence** - what's working for competitors

Unlike your web team's Collection template approach (which requires manual ACF field configuration), SiteForge is **fully autonomous** - it reasons about layout, content hierarchy, and visual design using LLMs.

---

## 📊 Analysis: Collection vs. SiteForge

### Collection (Manual Template System)
```
Architecture:
✅ WordPress theme with ACF blocks
✅ Pre-built components (menu, gallery, text-section, etc.)
✅ Consistent P11 branding
❌ Requires manual page building
❌ Manual ACF field population
❌ No content generation
❌ Same structure for every site
```

**Collection's Strengths:**
- Proven, working WordPress infrastructure
- 15+ reusable ACF blocks
- Optimized PHP templates
- Responsive design patterns
- Integration with external tools (plans-availability, POI, maps)

**Collection's Limitations:**
- Humans spend hours configuring each site
- Content is copy-pasted from brochures
- No differentiation between properties
- No intelligent layout decisions

### SiteForge (AI-Powered Generation)
```
Architecture:
✅ Uses Collection blocks as primitives
✅ LLM plans entire site structure
✅ Generates all content from brand assets
✅ Adapts layout to property personality
✅ One-click deployment
✅ Learns from performance data
```

**The Difference:**
```
Collection: "Here are the blocks. Build a site."
SiteForge: "Here's the brand. Generate the site."
```

---

## 🏗️ Technical Architecture

### Tech Stack (December 2025)

**WordPress API:**
- REST API v2 (for site creation, theme activation)
- WP-CLI via SSH (for plugin installation, DB setup)
- Modern approach: WordPress as headless CMS

**LLM Orchestration:**
- **Primary:** Gemini 3 Pro (`gemini-3-pro-preview`)
  - 1M token context window / 64k output
  - Advanced reasoning with thinking levels
  - Knowledge cutoff: January 2025
  - $2/$12 per 1M tokens (<200k), $4/$18 (>200k)
- **Image Generation:** Gemini 3 Pro Image (`gemini-3-pro-image-preview`)
  - 4K image generation with text rendering
  - Google Search grounding for real-time data
  - Conversational editing
- **Fallback:** Claude 3.7 Sonnet (if needed for specific edge cases)

**Hosting:**
- Cloudways (managed WordPress with API)
- OR WP Engine (headless WordPress hosting)
- OR custom: DigitalOcean + ServerPilot + automation

**WordPress Plugins (Auto-installed):**
- ACF Pro (field management via PHP)
- Yoast SEO (auto-configured)
- WP Rocket (performance)
- Wordfence (security)
- Entrata integration plugin (if needed)

---

## 🔄 Dual-Source Brand Intelligence

### Priority 1: Check BrandForge

```typescript
async function getBrandIntelligence(propertyId: string) {
  // 1. Try structured BrandForge data
  const { data: brandforge } = await supabase
    .from('property_brand_assets')
    .select('*')
    .eq('property_id', propertyId)
    .single()
  
  if (brandforge && brandforge.generation_status === 'complete') {
    return {
      source: 'brandforge',
      structured: true,
      data: {
        brandName: brandforge.section_5_name_story?.name,
        tagline: brandforge.section_1_introduction?.tagline,
        positioning: brandforge.section_2_positioning?.statement,
        targetAudience: brandforge.section_3_target_audience?.primary,
        personas: brandforge.section_4_personas?.personas,
        colors: brandforge.section_8_colors,
        typography: brandforge.section_7_typography,
        logo: brandforge.section_6_logo?.logoUrl,
        photoStyle: brandforge.section_10_photo_yep,
        brandVoice: brandforge.conversation_summary?.brandPersonality
      }
    }
  }
  
  // 2. Fall back to Knowledge Base extraction
  return await extractFromKnowledgeBase(propertyId)
}
```

### Priority 2: Extract from Knowledge Base

```typescript
async function extractFromKnowledgeBase(propertyId: string) {
  // 1. Find all documents for this property
  const { data: docs } = await supabase
    .from('documents')
    .select('id, file_name, file_url, metadata')
    .eq('property_id', propertyId)
    .in('metadata->type', ['brand_guide', 'brochure', 'logo', 'photos'])
  
  if (!docs || docs.length === 0) {
    return { source: 'none', data: null }
  }
  
  // 2. Use Gemini Vision to analyze PDFs/images
  const brandAssets = await analyzeBrandAssets(docs)
  
  // 3. Use semantic search to find brand info in text docs
  const brandContext = await semanticSearchBrand(propertyId)
  
  // 4. Use Gemini 3 to synthesize into structured brand data
  const synthesized = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze these brand documents and extract:
    - Brand name and tagline
    - Target audience description
    - Brand personality traits
    - Color palette (hex codes)
    - Typography recommendations
    - Key brand messages
    
    Documents: ${JSON.stringify(brandContext)}
    Visual analysis: ${JSON.stringify(brandAssets)}`,
    config: {
      thinking_config: { thinking_level: 'high' }, // Deep reasoning for brand extraction
      temperature: 1.0 // Gemini 3 default - don't change
    }
  })
  
  return {
    source: 'knowledge_base',
    structured: false,
    data: synthesized.text,
    confidence: calculateConfidence(docs.length, brandContext.length)
  }
}
```

### Priority 3: Generate from Property Data Only

```typescript
// If no brand assets exist, generate a basic brand
async function generateMinimalBrand(propertyId: string) {
  const property = await getPropertyDetails(propertyId)
  const competitors = await getCompetitorIntelligence(propertyId)
  
  // Use Gemini 3 to create basic brand positioning
  const brand = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Create basic brand positioning for:
    Property: ${property.name}
    Location: ${property.address}
    Amenities: ${property.amenities.join(', ')}
    Competitors: ${competitors.map(c => c.name).join(', ')}
    
    Generate:
    - Compelling tagline
    - Target audience
    - 3 brand personality traits
    - Suggested color palette
    - Content themes`,
    config: {
      thinking_config: { thinking_level: 'high' },
      temperature: 1.0
    }
  })
  
  return {
    source: 'generated',
    structured: false,
    data: brand.text,
    confidence: 0.6 // Medium confidence
  }
}
```

---

## 🎨 Site Generation Pipeline

### Phase 1: Intelligence Gathering (1-2 min)

```typescript
interface SiteContext {
  // Brand Intelligence
  brand: BrandIntelligence
  
  // Property Data
  property: {
    id: string
    name: string
    address: PropertyAddress
    amenities: Amenity[]
    floorplans: Floorplan[]
    photos: Photo[]
    policies: Policies
  }
  
  // Competitive Intelligence
  competitors: {
    sites: CompetitorSite[]
    commonPatterns: DesignPattern[]
    contentGaps: string[]
  }
  
  // Knowledge Base
  documents: Document[]
  
  // User preferences (from onboarding)
  preferences?: {
    style?: 'modern' | 'luxury' | 'cozy' | 'vibrant'
    emphasis?: 'amenities' | 'location' | 'lifestyle' | 'value'
    ctaPriority?: 'tours' | 'applications' | 'contact'
  }
}
```

**Step 1.1: Gather Brand Intelligence**
```typescript
const brand = await getBrandIntelligence(propertyId)
// Returns BrandForge OR knowledge base extraction OR generated
```

**Step 1.2: Gather Property Data**
```typescript
const property = await supabase
  .from('properties')
  .select(`
    *,
    amenities (*),
    floorplans (*),
    photos (*),
    policies (*)
  `)
  .eq('id', propertyId)
  .single()
```

**Step 1.3: Analyze Competitors**
```typescript
const competitors = await supabase
  .from('competitor_snapshots')
  .select('*')
  .eq('property_id', propertyId)
  .order('scraped_at', { ascending: false })
  .limit(5)

// Use Gemini 3 Vision to analyze competitor site screenshots
const competitorAnalysis = await analyzeCompetitorDesigns(competitors)
```

### Phase 2: Site Architecture Planning (LLM Reasoning)

```typescript
async function planSiteArchitecture(context: SiteContext) {
  const prompt = `You are an expert WordPress site architect for multifamily real estate.
  
  CONTEXT:
  - Property: ${context.property.name}
  - Brand personality: ${context.brand.data?.brandVoice || 'professional'}
  - Target audience: ${context.brand.data?.targetAudience || 'young professionals'}
  - Key amenities: ${context.property.amenities.slice(0, 5).join(', ')}
  - Competitors emphasize: ${context.competitors.commonPatterns.join(', ')}
  
  TASK: Plan the site structure and page layouts.
  
  OUTPUT FORMAT (JSON):
  {
    "navigation": {
      "primary": ["Home", "Floor Plans", "Amenities", ...],
      "cta": { "text": "Schedule Tour", "prominence": "high" }
    },
    "pages": [
      {
        "slug": "home",
        "purpose": "Convert prospects to tour bookings",
        "sections": [
          {
            "type": "hero",
            "acf_block": "top-slides",
            "content": {
              "headline": "...",
              "subheadline": "...",
              "cta": "...",
              "images": ["hero-1.jpg", "hero-2.jpg"]
            },
            "reasoning": "Strong visual first impression..."
          },
          {
            "type": "value_proposition",
            "acf_block": "text-section",
            "content": {...},
            "reasoning": "Immediately communicate unique value..."
          },
          ...
        ]
      },
      ...
    ],
    "designSystem": {
      "colorUsage": "Primary for CTAs, secondary for accents...",
      "typographyHierarchy": "H1: 48px, H2: 36px...",
      "imageStyle": "Lifestyle shots emphasizing community...",
      "tone": "Warm, welcoming, professional"
    }
  }`
  
  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinking_config: { thinking_level: 'high' }, // Deep reasoning for architecture
      temperature: 1.0, // Gemini 3 default
      response_mime_type: 'application/json' // Ensure JSON output
    }
  })
  
  return JSON.parse(response.text)
}
```

**Why LLM Planning Matters:**

Traditional approach (Collection):
- Every site gets: Home, Amenities, Gallery, Floor Plans, Contact
- Same structure regardless of brand personality

LLM approach (SiteForge):
- Luxury property: Emphasize exclusivity, lifestyle, amenities-first
- Budget property: Emphasize value, convenience, location-first
- Urban property: Emphasize walkability, nightlife, transit
- Family property: Emphasize schools, safety, space

**The LLM adapts the architecture to the brand strategy.**

### Phase 3: Content Generation (Parallel Processing)

```typescript
async function generateAllContent(
  architecture: SiteArchitecture,
  context: SiteContext
) {
  // Generate content for all pages in parallel
  const contentPromises = architecture.pages.map(page => 
    generatePageContent(page, context)
  )
  
  const pages = await Promise.all(contentPromises)
  
  return pages
}

async function generatePageContent(
  page: PagePlan,
  context: SiteContext
) {
  const sectionPromises = page.sections.map(section => {
    return generateSectionContent(section, context, page.slug)
  })
  
  const sections = await Promise.all(sectionPromises)
  
  return {
    slug: page.slug,
    title: page.title,
    sections: sections
  }
}

async function generateSectionContent(
  section: SectionPlan,
  context: SiteContext,
  pageSlug: string
) {
  // Build context-aware prompt
  const prompt = buildContentPrompt(section, context, pageSlug)
  
  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinking_config: { 
        thinking_level: 'low' // Faster for content generation tasks
      },
      temperature: 1.0,
      response_mime_type: 'application/json'
    }
  })
  
  // Parse into ACF field structure
  const acfFields = mapToACFFields(section.acf_block, response.text)
  
  return {
    blockType: section.acf_block,
    fields: acfFields,
    order: section.order
  }
}
```

**Example: Generating "Amenities" Section**

```typescript
// Input from architecture planning
{
  type: "amenity_showcase",
  acf_block: "content-grid",
  reasoning: "Visual grid works well for luxury positioning"
}

// Content generation prompt
`Generate amenity descriptions for ${property.name}.

BRAND VOICE: ${brand.personality}
TARGET AUDIENCE: ${brand.targetAudience}
AMENITIES: ${property.amenities}

For each amenity, write:
- Headline (5-7 words, emotional hook)
- Description (20-30 words, benefit-focused)
- Icon suggestion

Style: ${brand.photoStyle}

OUTPUT (JSON):
{
  "grid_items": [
    {
      "headline": "...",
      "description": "...",
      "icon": "fa-swimming-pool"
    },
    ...
  ]
}`

// Output → ACF fields
{
  block_type: 'acf/content-grid',
  fields: {
    grid_layout: '3-column',
    items: [
      {
        headline: 'Dive Into Luxury',
        description: 'Our resort-style pool...',
        icon: 'fa-swimming-pool',
        image: null // Auto-select from property.photos
      },
      ...
    ]
  }
}
```

### Phase 4: Asset Management

**Strategy: Hybrid Approach**

1. **Reuse uploaded assets** (knowledge base photos, logos)
2. **Generate missing assets** (if needed via Imagen 3)
3. **Optimize all assets** (compression, responsive sizes)

```typescript
async function prepareAssets(context: SiteContext) {
  const assets = {
    logo: null,
    photos: [],
    icons: []
  }
  
  // 1. Logo
  if (context.brand.data?.logo) {
    // BrandForge logo or uploaded logo
    assets.logo = await downloadAndOptimize(context.brand.data.logo)
  } else {
    // Generate with Gemini 3 Pro Image
    assets.logo = await generateLogo(context.property.name, context.brand)
  }
  
  // 2. Photos
  const uploadedPhotos = context.property.photos
  if (uploadedPhotos.length >= 20) {
    // Enough photos - use what we have
    assets.photos = await optimizeImages(uploadedPhotos)
  } else {
    // Supplement with generated lifestyle photos
    const needed = 20 - uploadedPhotos.length
    const generated = await generateLifestylePhotos(
      context.property,
      context.brand,
      needed
    )
    assets.photos = [...uploadedPhotos, ...generated]
  }
  
  // 3. Icons (use Font Awesome)
  assets.icons = 'font-awesome-6'
  
  return assets
}
```

### Phase 5: WordPress Deployment

**Modern approach: WordPress REST API + WP-CLI**

```typescript
async function deployToWordPress(
  site: GeneratedSite,
  assets: SiteAssets,
  context: SiteContext
) {
  // 1. Create WordPress instance
  const wpInstance = await cloudways.createSite({
    name: slugify(context.property.name),
    domain: `${slugify(context.property.name)}.p11sites.com`,
    php_version: '8.2',
    wp_version: 'latest'
  })
  
  // 2. Install theme and plugins via WP-CLI
  await wpInstance.wpcli('theme install collection --activate')
  await wpInstance.wpcli('plugin install advanced-custom-fields-pro --activate')
  await wpInstance.wpcli('plugin install wp-rocket --activate')
  
  // 3. Upload assets
  const mediaIds = await uploadAssetsToWP(wpInstance, assets)
  
  // 4. Create pages with ACF blocks
  for (const page of site.pages) {
    await createWordPressPage(wpInstance, page, mediaIds)
  }
  
  // 5. Configure ACF options
  await setACFOptions(wpInstance, {
    logo: mediaIds.logo,
    community_name: context.property.name,
    primary_color: context.brand.data.colors.primary[0].hex,
    secondary_color: context.brand.data.colors.secondary[0].hex,
    google_api_key: process.env.GOOGLE_MAPS_API_KEY
  })
  
  // 6. Set up navigation
  await createNavigation(wpInstance, site.navigation)
  
  // 7. SEO configuration
  await configureYoastSEO(wpInstance, context.property, site)
  
  return {
    url: wpInstance.url,
    adminUrl: `${wpInstance.url}/wp-admin`,
    credentials: wpInstance.credentials
  }
}
```

**ACF Block Creation (WordPress REST API)**

```typescript
async function createWordPressPage(
  wp: WordPressInstance,
  page: GeneratedPage,
  mediaIds: MediaLibrary
) {
  // Gutenberg blocks with ACF data
  const blocks = page.sections.map(section => {
    return convertToGutenbergBlock(section, mediaIds)
  })
  
  const response = await wp.rest.post('/wp/v2/pages', {
    title: page.title,
    slug: page.slug,
    status: 'publish',
    content: renderGutenbergBlocks(blocks),
    meta: {
      _acf: mapACFFields(page.sections, mediaIds)
    }
  })
  
  return response
}

function convertToGutenbergBlock(
  section: GeneratedSection,
  mediaIds: MediaLibrary
): GutenbergBlock {
  // Map our section to Collection ACF block format
  
  switch (section.blockType) {
    case 'acf/top-slides':
      return {
        blockName: 'acf/top-slides',
        attrs: {
          data: {
            slides: section.fields.slides.map(slide => ({
              image: mediaIds.photos[slide.imageIndex],
              headline: slide.headline,
              subheadline: slide.subheadline,
              cta_text: slide.cta,
              cta_link: slide.link
            }))
          }
        }
      }
    
    case 'acf/text-section':
      return {
        blockName: 'acf/text-section',
        attrs: {
          data: {
            headline: section.fields.headline,
            content: section.fields.content,
            layout: section.fields.layout || 'center',
            background: section.fields.background || 'white'
          }
        }
      }
    
    case 'acf/content-grid':
      return {
        blockName: 'acf/content-grid',
        attrs: {
          data: {
            grid_columns: section.fields.columns || 3,
            items: section.fields.items.map(item => ({
              headline: item.headline,
              description: item.description,
              icon: item.icon,
              image: item.image ? mediaIds.photos[item.imageIndex] : null
            }))
          }
        }
      }
    
    case 'acf/gallery':
      return {
        blockName: 'acf/gallery',
        attrs: {
          data: {
            gallery_layout: section.fields.layout || 'grid',
            images: section.fields.imageIndices.map(idx => mediaIds.photos[idx])
          }
        }
      }
    
    case 'acf/form':
      return {
        blockName: 'acf/form',
        attrs: {
          data: {
            form_type: 'contact',
            form_heading: section.fields.heading,
            form_subheading: section.fields.subheading,
            redirect_url: section.fields.redirectUrl
          }
        }
      }
    
    // ... handle all Collection ACF blocks
    
    default:
      throw new Error(`Unsupported block type: ${section.blockType}`)
  }
}
```

---

## 🎯 User Experience Flow

### Flow 1: From BrandForge (Ideal Path)

```
User creates property
  ↓
Runs BrandForge (generates complete brand)
  ↓
Property Overview → "Generate Website" button appears
  ↓
Clicks "Generate Website"
  ↓
SiteForge Modal:
  ┌────────────────────────────────────┐
  │ 🎨 Generate Website                │
  │                                    │
  │ ✅ Brand detected (BrandForge)     │
  │ ✅ 47 photos available             │
  │ ✅ Competitive analysis ready      │
  │                                    │
  │ Optional preferences:              │
  │ [ Style: Modern ▼ ]                │
  │ [ Emphasis: Amenities ▼ ]          │
  │                                    │
  │ [ Cancel ]  [ Generate Site →]     │
  └────────────────────────────────────┘
  ↓
Clicks "Generate Site"
  ↓
Progress Modal:
  [████████░░] 80%
  ✅ Planning site architecture
  ✅ Generating content
  ✅ Preparing assets
  ⏳ Deploying to WordPress...
  ↓
Success Screen:
  ┌────────────────────────────────────┐
  │ ✅ Website Ready!                  │
  │                                    │
  │ 🌐 thealbum.p11sites.com           │
  │                                    │
  │ Pages created:                     │
  │ • Home (with hero carousel)        │
  │ • Amenities (grid layout)          │
  │ • Floor Plans (integrated)         │
  │ • Gallery (47 photos)              │
  │ • Neighborhood (map + POI)         │
  │ • Contact                          │
  │                                    │
  │ [ View Site ] [ WP Admin ] [Edit]  │
  └────────────────────────────────────┘
```

### Flow 2: From Knowledge Base (Flexible Path)

```
User creates property
  ↓
Uploads documents:
  • Brand guideline PDF
  • Logo PNG
  • Property photos (30 images)
  • Brochure PDF
  ↓
Property Overview → "Generate Website" button appears
  ↓
Clicks "Generate Website"
  ↓
SiteForge Modal:
  ┌────────────────────────────────────┐
  │ 🎨 Generate Website                │
  │                                    │
  │ ✅ Brand assets detected (KB)      │
  │    • Brand Guidelines.pdf          │
  │    • Logo.png                      │
  │    • 30 photos                     │
  │                                    │
  │ ⚠️  Some brand info missing        │
  │    SiteForge will infer from docs  │
  │                                    │
  │ [ Cancel ]  [ Generate Site →]     │
  └────────────────────────────────────┘
  ↓
(Same generation + deployment flow)
```

### Flow 3: Minimal Data (Bootstrapping)

```
User creates property
  ↓
Only enters basic info:
  • Name: "The Reserve at Sandpoint"
  • Address
  • Amenities list
  ↓
Property Overview → "Generate Website" button appears
  ↓
Clicks "Generate Website"
  ↓
SiteForge Modal:
  ┌────────────────────────────────────┐
  │ 🎨 Generate Website                │
  │                                    │
  │ ⚠️  No brand assets found          │
  │                                    │
  │ SiteForge will:                    │
  │ • Create basic brand positioning   │
  │ • Generate placeholder content     │
  │ • Use competitor insights          │
  │ • Select stock imagery             │
  │                                    │
  │ ℹ️  You can refine later           │
  │                                    │
  │ [ Cancel ]  [ Generate Site →]     │
  └────────────────────────────────────┘
  ↓
(Generates with medium confidence)
```

---

## 🗄️ Database Schema

```sql
-- Sites generated by SiteForge
create table property_websites (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties not null,
  
  -- WordPress instance details
  wp_url text not null,
  wp_admin_url text not null,
  wp_instance_id text, -- Cloudways/WP Engine ID
  
  -- Generation metadata
  generation_status text check (generation_status in (
    'planning',
    'generating_content',
    'preparing_assets',
    'deploying',
    'complete',
    'failed'
  )),
  
  -- Source tracking
  brand_source text check (brand_source in (
    'brandforge',
    'knowledge_base',
    'generated',
    'hybrid'
  )),
  brand_confidence numeric, -- 0.0 to 1.0
  
  -- Generated architecture
  site_architecture jsonb, -- Full LLM-planned structure
  pages_generated jsonb, -- Array of page metadata
  
  -- Assets used
  assets_manifest jsonb, -- What assets were used/generated
  
  -- Performance tracking
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  generation_duration_seconds int,
  
  -- Analytics
  page_views int default 0,
  tour_requests int default 0,
  conversion_rate numeric,
  
  -- Versioning
  version int default 1,
  previous_version_id uuid references property_websites(id),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Track individual asset generation/usage
create table website_assets (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references property_websites not null,
  
  asset_type text check (asset_type in (
    'logo',
    'hero_image',
    'amenity_photo',
    'lifestyle_photo',
    'icon',
    'video'
  )),
  
  -- Source
  source text check (source in (
    'uploaded', -- From KB or direct upload
    'brandforge', -- Generated by BrandForge
    'generated', -- Generated by SiteForge
    'stock' -- Stock photo
  )),
  
  -- Storage
  file_url text not null,
  wp_media_id int, -- WordPress media library ID
  
  -- Metadata
  alt_text text,
  usage_context jsonb, -- Where is it used on the site
  
  created_at timestamptz default now()
);

-- Track regenerations and iterations
create table website_generations (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references property_websites not null,
  
  trigger_type text check (trigger_type in (
    'initial',
    'brand_updated',
    'user_requested',
    'a_b_test',
    'performance_optimization'
  )),
  
  changes_made jsonb, -- What changed from previous version
  performance_delta jsonb, -- How performance changed
  
  generated_by uuid references auth.users,
  generated_at timestamptz default now()
);
```

---

## 🔌 API Endpoints

### Core APIs

**1. POST `/api/siteforge/generate`**
```typescript
// Initiate site generation
{
  propertyId: string
  preferences?: {
    style?: string
    emphasis?: string
    ctaPriority?: string
  }
}

Response:
{
  jobId: string
  status: 'queued'
  estimatedTime: 180 // seconds
}
```

**2. GET `/api/siteforge/status/:jobId`**
```typescript
// Check generation progress
Response:
{
  jobId: string
  status: 'planning' | 'generating_content' | 'deploying' | 'complete'
  progress: 75 // 0-100
  currentStep: 'Deploying to WordPress...'
  errors?: string[]
}
```

**3. GET `/api/siteforge/preview/:websiteId`**
```typescript
// Get preview of generated site
Response:
{
  websiteId: string
  url: string
  pages: [
    {
      slug: 'home',
      title: 'Home',
      sections: [...],
      previewUrl: 'https://...'
    },
    ...
  ],
  brandSource: 'brandforge',
  confidence: 0.95
}
```

**4. POST `/api/siteforge/regenerate`**
```typescript
// Regenerate site or specific pages
{
  websiteId: string
  pages?: string[] // If empty, regenerate entire site
  reason?: string
}
```

**5. POST `/api/siteforge/refine`**
```typescript
// Refine specific aspects
{
  websiteId: string
  refinements: {
    tone?: 'more professional' | 'more casual' | 'more luxury'
    emphasis?: 'more amenities' | 'more location' | 'more value'
    cta?: 'stronger' | 'softer'
  }
}
```

---

## 🧠 LLM Prompt Engineering

### Master System Prompt

```typescript
const SITEFORGE_SYSTEM_PROMPT = `You are SiteForge, an expert WordPress site architect for multifamily real estate.

EXPERTISE:
- 10+ years designing apartment community websites
- Deep understanding of prospect psychology
- Expert in conversion optimization
- Fluent in WordPress/ACF architecture
- Knowledge of current design trends (January 2025)

YOUR ROLE:
- Analyze brand assets and property data
- Plan optimal site architecture
- Generate compelling, on-brand content
- Make intelligent layout decisions
- Optimize for lead conversion

AVAILABLE ACF BLOCKS:
${JSON.stringify(ACF_BLOCKS)}

DESIGN PRINCIPLES:
1. Mobile-first (60% of traffic)
2. Fast load times (<2s)
3. Clear CTAs above the fold
4. Social proof placement
5. Accessibility (WCAG 2.1 AA)
6. SEO optimization

OUTPUT FORMAT:
Always return valid JSON matching the schema provided.
Be specific and actionable.
Explain reasoning for key decisions.

IMPORTANT: Be direct and concise. Don't over-explain unless asked.`
```

**Note on Gemini 3 Prompting:**
- Keep prompts **concise and direct** - Gemini 3 prefers clarity over verbose prompt engineering
- Use `thinking_level: 'high'` for complex reasoning (architecture planning)
- Use `thinking_level: 'low'` for simple tasks (content generation)
- Always keep `temperature: 1.0` (Gemini 3 default - don't tune lower!)
- Gemini 3 is less verbose by default - if you need chattier output, explicitly request it

### Architecture Planning Prompt

```typescript
const architecturePlanningPrompt = `
TASK: Plan complete website architecture

INPUTS:
${JSON.stringify({
  property: context.property,
  brand: context.brand,
  competitors: context.competitors.commonPatterns,
  targetAudience: context.brand.data?.targetAudience
})}

ANALYSIS REQUIRED:
1. What pages are essential vs. optional?
2. What content hierarchy serves this audience best?
3. How should this brand personality manifest in layout?
4. What CTAs will drive the most tour bookings?
5. How can we differentiate from ${competitors.length} nearby competitors?

OUTPUT SCHEMA:
{
  "navigation": {
    "structure": "primary" | "mega" | "hamburger",
    "items": [
      { "label": string, "slug": string, "priority": "high" | "medium" }
    ],
    "cta": { "text": string, "style": "primary" | "secondary" }
  },
  "pages": [
    {
      "slug": string,
      "title": string,
      "purpose": string, // What this page aims to achieve
      "sections": [
        {
          "acf_block": string, // Must be from available blocks
          "reasoning": string, // Why this block here
          "contentStrategy": string, // What story does this tell
          "order": number
        }
      ]
    }
  ],
  "designDecisions": {
    "colorStrategy": string,
    "imageStrategy": string,
    "contentDensity": "minimal" | "balanced" | "rich",
    "conversionOptimization": string[]
  }
}

CONSTRAINTS:
- Use only available ACF blocks: ${ACF_BLOCKS.map(b => b.name).join(', ')}
- Mobile-first design
- Max 7 pages (most users visit 2-3 pages)
- Every page needs clear next action
`
```

### Content Generation Prompt (Per Section)

```typescript
const contentGenerationPrompt = `
TASK: Generate content for website section

SECTION: ${section.acf_block}
PAGE: ${page.slug}
PURPOSE: ${section.reasoning}

BRAND CONTEXT:
${JSON.stringify({
  name: brand.brandName,
  voice: brand.brandVoice,
  targetAudience: brand.targetAudience,
  positioning: brand.positioning,
  colors: brand.colors,
  photoStyle: brand.photoStyle
})}

PROPERTY DATA:
${JSON.stringify({
  amenities: property.amenities,
  floorplans: property.floorplans.length,
  location: property.address.city,
  uniqueFeatures: property.unique_features
})}

REQUIREMENTS:
1. Match brand voice: ${brand.brandVoice}
2. Speak to: ${brand.targetAudience}
3. Differentiate from competitors who emphasize: ${competitors.commonMessages}
4. Drive action: ${section.cta}

ACF BLOCK STRUCTURE: ${ACF_BLOCK_SCHEMAS[section.acf_block]}

OUTPUT (JSON matching ACF structure):
{
  // Generate all required fields for this ACF block
  // Use actual property data
  // Write in brand voice
  // Include specific, compelling details
}

EXAMPLES OF GREAT COPY:
${EXAMPLE_COPY[brand.personality]}
`
```

---

## 🎛️ Configuration & Customization

### ACF Block Registry

```typescript
// Map Collection blocks to SiteForge capabilities
const ACF_BLOCKS = [
  {
    name: 'acf/top-slides',
    purpose: 'Hero carousel with CTA',
    bestFor: ['home', 'floor-plans'],
    fields: ['slides', 'overlay_style', 'autoplay'],
    contentNeeds: ['hero_image', 'headline', 'subheadline', 'cta']
  },
  {
    name: 'acf/text-section',
    purpose: 'Text content with optional columns',
    bestFor: ['about', 'policies', 'neighborhood'],
    fields: ['headline', 'content', 'layout', 'background'],
    contentNeeds: ['headline', 'body_text']
  },
  {
    name: 'acf/content-grid',
    purpose: 'Grid of items with icons/images',
    bestFor: ['amenities', 'features'],
    fields: ['grid_columns', 'items'],
    contentNeeds: ['grid_items']
  },
  {
    name: 'acf/gallery',
    purpose: 'Photo gallery (grid or carousel)',
    bestFor: ['gallery', 'amenities'],
    fields: ['gallery_layout', 'images'],
    contentNeeds: ['images']
  },
  {
    name: 'acf/form',
    purpose: 'Contact/interest form',
    bestFor: ['contact', 'schedule-tour'],
    fields: ['form_type', 'heading', 'redirect'],
    contentNeeds: ['form_heading', 'privacy_text']
  },
  {
    name: 'acf/map',
    purpose: 'Google Maps with directions',
    bestFor: ['location', 'contact'],
    fields: ['map_center', 'zoom', 'markers'],
    contentNeeds: ['address', 'directions_text']
  },
  {
    name: 'acf/plans-availability',
    purpose: 'Interactive floorplans with pricing',
    bestFor: ['floor-plans'],
    fields: ['data_source'],
    contentNeeds: [] // Auto-populated from Yardi
  },
  {
    name: 'acf/poi',
    purpose: 'Points of interest map',
    bestFor: ['neighborhood'],
    fields: ['categories', 'radius'],
    contentNeeds: ['poi_intro']
  },
  {
    name: 'acf/accordion-section',
    purpose: 'FAQ or expandable content',
    bestFor: ['faq', 'policies'],
    fields: ['accordion_items'],
    contentNeeds: ['qa_pairs']
  },
  {
    name: 'acf/menu',
    purpose: 'Section navigation menu',
    bestFor: ['all'],
    fields: ['menu_items', 'sticky'],
    contentNeeds: ['menu_labels']
  },
  {
    name: 'acf/image',
    purpose: 'Single large image',
    bestFor: ['visual breaks'],
    fields: ['image', 'caption', 'size'],
    contentNeeds: ['image', 'alt_text']
  },
  {
    name: 'acf/links',
    purpose: 'Call-to-action buttons',
    bestFor: ['all'],
    fields: ['links'],
    contentNeeds: ['cta_text', 'cta_url']
  },
  {
    name: 'acf/html-section',
    purpose: 'Custom HTML embed',
    bestFor: ['special features'],
    fields: ['html_content'],
    contentNeeds: ['html']
  },
  {
    name: 'acf/feature-section',
    purpose: 'Two-column feature highlight',
    bestFor: ['home', 'amenities'],
    fields: ['image', 'headline', 'content', 'layout'],
    contentNeeds: ['feature_image', 'feature_text']
  }
]
```

### Content Strategy Templates

```typescript
// Different strategies for different property types
const CONTENT_STRATEGIES = {
  luxury: {
    tone: 'sophisticated, aspirational, exclusive',
    emphasis: ['design', 'service', 'prestige', 'lifestyle'],
    wordChoice: ['curated', 'bespoke', 'refined', 'elevated'],
    avoid: ['affordable', 'value', 'budget-friendly'],
    pageStructure: [
      'home', 'residences', 'amenities', 'services', 
      'neighborhood', 'availability', 'contact'
    ]
  },
  
  urban: {
    tone: 'energetic, modern, connected',
    emphasis: ['location', 'walkability', 'lifestyle', 'community'],
    wordChoice: ['vibrant', 'connected', 'dynamic', 'accessible'],
    avoid: ['quiet', 'secluded', 'peaceful'],
    pageStructure: [
      'home', 'location', 'floor-plans', 'amenities',
      'neighborhood', 'gallery', 'contact'
    ]
  },
  
  family: {
    tone: 'welcoming, secure, community-focused',
    emphasis: ['schools', 'safety', 'space', 'family amenities'],
    wordChoice: ['spacious', 'safe', 'community', 'family-friendly'],
    avoid: ['nightlife', 'urban', 'compact'],
    pageStructure: [
      'home', 'floor-plans', 'community', 'schools',
      'amenities', 'gallery', 'apply'
    ]
  },
  
  student: {
    tone: 'casual, fun, affordable',
    emphasis: ['price', 'proximity to campus', 'social', 'furnished'],
    wordChoice: ['affordable', 'convenient', 'social', 'flexible'],
    avoid: ['luxury', 'exclusive', 'sophisticated'],
    pageStructure: [
      'home', 'floor-plans', 'amenities', 'location',
      'pricing', 'roommates', 'apply'
    ]
  }
}
```

---

## 📊 Quality Assurance & Testing

### Automated QA Checks

```typescript
async function qaGeneratedSite(website: GeneratedWebsite) {
  const checks = []
  
  // 1. Content Quality
  checks.push(await checkContentQuality(website))
  
  // 2. SEO Compliance
  checks.push(await checkSEO(website))
  
  // 3. Accessibility
  checks.push(await checkAccessibility(website))
  
  // 4. Performance
  checks.push(await checkPerformance(website))
  
  // 5. Brand Consistency
  checks.push(await checkBrandConsistency(website))
  
  // 6. Mobile Responsiveness
  checks.push(await checkMobile(website))
  
  const score = calculateQualityScore(checks)
  
  if (score < 0.8) {
    // Auto-refine low-quality generations
    return await refineAndRegenerate(website, checks)
  }
  
  return { passed: true, score, checks }
}

async function checkContentQuality(website: GeneratedWebsite) {
  const issues = []
  
  for (const page of website.pages) {
    for (const section of page.sections) {
      // Check for placeholder text
      if (containsPlaceholders(section.content)) {
        issues.push(`Placeholder text in ${page.slug}/${section.type}`)
      }
      
      // Check for repetitive content
      if (isRepetitive(section.content)) {
        issues.push(`Repetitive content in ${page.slug}/${section.type}`)
      }
      
      // Check for missing CTAs
      if (needsCTA(section.type) && !hasCTA(section)) {
        issues.push(`Missing CTA in ${page.slug}/${section.type}`)
      }
      
      // Check tone consistency
      const tone = analyzeTone(section.content)
      if (!matchesBrandTone(tone, website.brand.voice)) {
        issues.push(`Tone mismatch in ${page.slug}/${section.type}`)
      }
    }
  }
  
  return {
    check: 'content_quality',
    passed: issues.length === 0,
    issues,
    score: 1 - (issues.length * 0.1)
  }
}
```

### Human Review Workflow

```
Generated Site
  ↓
Automated QA (< 30 seconds)
  ↓
Score ≥ 80%? ───No──→ Auto-refine & regenerate
  │
 Yes
  ↓
Mark as "Ready for Review"
  ↓
Email P11 team member:
  "New site ready: The Reserve"
  [Review Now]
  ↓
Human reviews in P11 Console:
  • Preview all pages
  • Check brand accuracy
  • Test forms
  • Verify integrations
  ↓
Approve or Request Changes
  ↓
If approved: Deploy to production domain
If changes: LLM refines based on feedback
```

---

## 🚀 Deployment Strategy

### Phase 1: Internal Beta (Q2 2026)

**Goal:** Prove the concept with 5-10 properties

```
Week 1-2: Core infrastructure
- WordPress automation setup
- LLM pipeline development
- Collection block integration

Week 3-4: Brand intelligence
- BrandForge data extraction
- Knowledge base parsing
- Competitor analysis integration

Week 5-6: Content generation
- Prompt engineering
- Multi-page generation
- Asset management

Week 7-8: WordPress deployment
- REST API integration
- ACF field mapping
- Theme configuration

Week 9-10: QA & refinement
- Automated testing
- Human review workflow
- Performance optimization

Week 11-12: Beta testing
- Generate 10 sites
- Gather internal feedback
- Iterate on prompts
```

### Phase 2: Client Pilot (Q3 2026)

**Goal:** Generate 50 sites for existing clients

- White-glove onboarding
- Dedicated support for refinements
- Performance tracking (tours booked via site)
- A/B testing against manually-built sites

### Phase 3: Full Launch (Q4 2026)

**Goal:** Scale to 200+ sites

- Self-service generation
- Automated performance monitoring
- Continuous prompt improvement
- Integration with full P11 platform

---

## 💰 Cost Analysis

### Per-Site Cost Breakdown

**Gemini 3 API Calls:**
- Architecture planning (high thinking): ~10K tokens → $0.02
- Content generation (20 sections, low thinking): ~50K tokens → $0.10
- Image/PDF analysis: ~5K tokens → $0.01
- Refinements (avg 2): ~20K tokens → $0.04
- **Total LLM cost: ~$0.17 per site**

**Gemini 3 Pro Image Generation (if needed):**
- Lifestyle photos (avg 5 needed, 4K): 5 × $0.15 → $0.75
- Logo generation (2K): $0.10
- **Total image cost: ~$0.85 per site**
- Note: Can reduce to 2K resolution to save costs (~$0.30 total)

**WordPress Hosting:**
- Cloudways managed WP: $10/month per site
- OR shared hosting: $3/month per site (if we group)

**TOTAL PER SITE:**
- One-time (4K images): $1.02 (LLM + images)
- One-time (2K images): $0.47 (LLM + images) - recommended
- Monthly: $3-10 (hosting)

**Compare to Manual:**
- Web designer: 8-12 hours @ $75/hr = $600-900
- Content writer: 4-6 hours @ $50/hr = $200-300
- **Manual cost: $800-1,200 per site**

**ROI: 1,700x - 2,500x cost reduction** 🚀

---

## 📈 Success Metrics

### Technical Metrics
- ✅ Generation success rate: >95%
- ✅ Average generation time: <3 minutes
- ✅ QA pass rate: >80% without human intervention
- ✅ Site performance: Lighthouse score >90
- ✅ Error rate: <2%

### Business Metrics
- 📊 Sites generated per month
- 📊 Time saved vs. manual creation
- 📊 Client satisfaction scores
- 📊 Tour booking conversion rate
- 📊 Site traffic and engagement

### Quality Metrics
- 🎨 Brand consistency score (human review)
- 🎨 Content uniqueness (no duplicate pages)
- 🎨 SEO score (Yoast rating)
- 🎨 Accessibility compliance (WCAG)

---

## 🔮 Future Enhancements

### Phase 2 Features (2027)

**1. A/B Testing Automation**
```typescript
// Auto-generate variants and test
const variants = await generateVariants(website, {
  test: 'hero_headline',
  variants: 3
})

await deployABTest(website, variants)
// System auto-promotes winner after 1000 visits
```

**2. Performance-Based Regeneration**
```typescript
// If conversion rate drops, auto-regenerate
if (website.conversion_rate < 0.02) {
  await regenerateLowPerformingSections(website)
}
```

**3. Multilingual Support**
```typescript
// Generate Spanish version
await generateTranslation(website, 'es')
// Uses brand voice in target language
```

**4. Video Content Generation**
```typescript
// Generate property tour video from photos
const video = await generatePropertyTour({
  photos: website.assets.photos,
  voiceover: generateScript(website.brand),
  music: 'upbeat'
})
```

**5. Personalization**
```typescript
// Show different content based on user segment
if (visitor.source === 'google-luxury') {
  showLuxuryAmenities()
} else if (visitor.source === 'google-affordable') {
  showValueProposition()
}
```

---

## 🎯 Key Differentiators

### SiteForge vs. Competition

**vs. Wix/Squarespace AI:**
- ✅ Industry-specific (multifamily)
- ✅ Integrated with CRM/data
- ✅ Uses property's actual brand
- ❌ They're generic website builders

**vs. Manual Development:**
- ✅ 100x faster (3 min vs. 8 hours)
- ✅ 2000x cheaper ($0.45 vs. $900)
- ✅ Consistent quality
- ✅ Easy to regenerate
- ❌ Human designers add creativity

**vs. Template Systems (like Collection):**
- ✅ Zero manual configuration
- ✅ Intelligent content generation
- ✅ Adaptive layouts per brand
- ✅ Continuous optimization
- ❌ Templates are more predictable

**The SiteForge Advantage:**
> "Brand-aware, property-specific, competitor-informed websites in 3 minutes."

---

## ✅ Implementation Checklist

### MVP Requirements

**Infrastructure:**
- [ ] WordPress hosting API integration (Cloudways/WP Engine)
- [ ] WP-CLI automation scripts
- [ ] Collection theme deployment pipeline
- [ ] Asset storage and CDN setup

**Brand Intelligence:**
- [ ] BrandForge data extraction
- [ ] Knowledge base document parsing
- [ ] Gemini Vision PDF analysis
- [ ] Competitor analysis integration

**LLM Pipeline:**
- [ ] Architecture planning prompts
- [ ] Content generation prompts per block type
- [ ] Multi-page generation orchestration
- [ ] Error handling and retry logic

**WordPress Integration:**
- [ ] REST API client
- [ ] ACF field mapping
- [ ] Gutenberg block creation
- [ ] Media library management
- [ ] Navigation configuration
- [ ] SEO setup automation

**Quality Assurance:**
- [ ] Automated content checks
- [ ] SEO validation
- [ ] Accessibility testing
- [ ] Performance monitoring
- [ ] Human review workflow

**UI/UX:**
- [ ] Generation wizard in dashboard
- [ ] Progress tracking
- [ ] Preview interface
- [ ] Refinement controls
- [ ] Site management dashboard

**Database:**
- [ ] property_websites table
- [ ] website_assets table
- [ ] website_generations table
- [ ] RLS policies

**Documentation:**
- [ ] User guide
- [ ] Technical documentation
- [ ] Prompt library
- [ ] Troubleshooting guide

---

## 🎓 Lessons from Collection

### What to Keep

✅ **ACF Block Architecture**
- Proven, flexible component system
- Easy to maintain
- Good performance
- Already optimized for multifamily

✅ **Responsive Design Patterns**
- Mobile-first CSS
- Touch-friendly interactions
- Fast page loads

✅ **Integration Points**
- Plans & Availability (Yardi)
- POI Maps
- Contact forms
- Google Maps

### What to Improve

❌ **Manual Configuration**
- SOLUTION: LLM auto-fills ACF fields

❌ **Generic Content**
- SOLUTION: LLM generates brand-specific copy

❌ **Same Structure Every Time**
- SOLUTION: LLM adapts architecture to brand

❌ **No Intelligence**
- SOLUTION: Competitor analysis informs decisions

---

## 🚢 Ready to Ship?

### MVP Definition

**SiteForge 1.0 can:**
1. ✅ Detect brand source (BrandForge OR knowledge base OR generate)
2. ✅ Plan site architecture (pages, sections, blocks)
3. ✅ Generate all content (headlines, body, CTAs)
4. ✅ Select/generate assets (photos, logos)
5. ✅ Deploy to WordPress (using Collection theme)
6. ✅ Configure ACF fields automatically
7. ✅ Pass automated QA checks
8. ✅ Deliver production-ready site in <3 minutes

**SiteForge 1.0 cannot (yet):**
- ❌ Generate custom designs (uses Collection templates)
- ❌ A/B test automatically
- ❌ Regenerate based on performance
- ❌ Multilingual support

**That's okay.** v1.0 delivers 80% of the value.

---

## 💡 Final Thoughts

### Why This Will Work

**1. You Have The Data**
- BrandForge gives structured brand data
- Knowledge base has uploaded assets
- MarketVision has competitor intelligence
- Property data is already in Supabase

**2. You Have The Infrastructure**
- Collection theme is proven
- ACF blocks are well-defined
- WordPress deployment is understood
- Hosting can be automated

**3. LLMs Are Ready**
- Gemini 3 has advanced reasoning (thinking levels)
- 1M token context window (entire codebases/documents)
- Native PDF/image analysis with configurable resolution
- 4K image generation with grounding
- Knowledge cutoff: January 2025 (very recent)

**4. The Market Wants This**
- Manual sites cost $800-1,200
- Take 1-2 weeks to build
- Require constant updates
- Sites need regeneration regularly

**SiteForge solves real pain. It's fast. It's cheap. It's intelligent.**

---

## 🎯 Next Steps

### This Week
1. Review this plan
2. Decide on hosting strategy (Cloudways vs. custom)
3. Set up dev WordPress instance
4. Test REST API + WP-CLI automation

### Next Sprint (2 weeks)
1. Build brand intelligence pipeline
2. Create prompt library
3. Develop LLM orchestration layer
4. Map Collection blocks to generation logic

### Month 1
1. Generate first test site (internal property)
2. Refine prompts based on output
3. Build QA automation
4. Create preview interface

### Month 2
1. Generate 5 sites for beta testing
2. Gather feedback
3. Iterate on architecture planning
4. Polish UI/UX

### Month 3
1. Launch to 10 pilot clients
2. Monitor performance
3. Build refinement features
4. Scale infrastructure

**Ship v1.0 in Q2 2026** ✅

---

**Built for P11 Creative**  
*The Autonomous Agency*

**SiteForge™** - Because websites should build themselves.

