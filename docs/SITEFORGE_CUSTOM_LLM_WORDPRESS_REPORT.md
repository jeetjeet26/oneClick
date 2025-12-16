# SiteForge: Custom LLM-Driven WordPress Site Creation Report

**Date:** December 15, 2025  
**Prepared for:** P11 Platform / OneClick Project  
**Subject:** Transitioning from Template-Based to Fully Custom LLM WordPress Generation

---

## Executive Summary

**Current State:** SiteForge is a **hybrid template-AI system**. While it uses Gemini 3 Pro for intelligent content generation and site architecture planning, it is **constrained by 14 predefined ACF blocks** from the "Collection" WordPress theme. The LLM orchestrates content within these rigid templates.

**Opportunity:** Transform SiteForge into a **fully custom, LLM-driven WordPress generator** that creates unique, bespoke websites without template constraints. Each site would be truly one-of-a-kind, designed from scratch by AI.

**Current Maturity:** ~60% complete
- ✅ LLM orchestration layer (Gemini 3 Pro)
- ✅ Brand intelligence extraction (BrandForge, KB, generated)
- ✅ Content generation pipeline
- ✅ Preview/rendering system
- ⚠️ WordPress deployment (TODO - Cloudways API not implemented)
- ⚠️ Template-constrained (14 ACF block types)

---

## Current Architecture Analysis

### What Works Well

1. **Intelligent Brand Extraction**
   - Three-tier fallback: BrandForge → Knowledge Base → Generated
   - Extracts colors, typography, voice, personas, positioning
   - Confidence scoring (0.6-0.95)

2. **LLM Orchestration** (`llm-orchestration.ts`)
   - Uses Gemini 3 Pro with "thinking" mode for deep reasoning
   - Single-shot full site generation (efficient, avoids rate limits)
   - Sees entire site context for content coherence
   - Proper error handling with JSON extraction

3. **Preview System**
   - React-based ACF block renderer
   - Real-time preview before deployment
   - User can review and iterate

4. **User Experience**
   - Simple 3-input wizard (style, emphasis, CTA priority)
   - Progress tracking with polling
   - Version control (v1, v2, v3...)

### What's Constrained

1. **ACF Block Templates** - The Core Limitation
   ```typescript
   // Only 14 block types available:
   'acf/menu', 'acf/top-slides', 'acf/text-section',
   'acf/feature-section', 'acf/image', 'acf/links',
   'acf/content-grid', 'acf/form', 'acf/map',
   'acf/html-section', 'acf/gallery', 'acf/accordion-section',
   'acf/plans-availability', 'acf/poi'
   ```
   
   **Impact:**
   - All sites look similar (same visual patterns)
   - Can't create custom layouts (e.g., diagonal sections, animated scrolls)
   - Can't innovate with modern design trends
   - Competitor sites may look identical if they use Collection theme

2. **WordPress Deployment Not Built**
   - Cloudways API integration is TODO
   - No actual WordPress instance creation
   - No theme deployment automation
   - No WP-CLI or REST API implementation
   - Currently just placeholder/mock deployment

3. **No Custom Code Generation**
   - Can't generate custom CSS
   - Can't generate custom JavaScript interactions
   - Can't create unique animations or effects
   - Limited to what ACF blocks provide out-of-box

---

## Vision: Fully Custom LLM WordPress Generation

### What "Fully Custom" Means

Instead of filling in ACF block templates, the LLM would:

1. **Generate complete HTML/CSS/JS** for each page section
2. **Create unique layouts** optimized for the specific property
3. **Design custom components** (not just configure existing blocks)
4. **Write tailored animations** and interactions
5. **Produce one-of-a-kind designs** that stand out from competitors

### Example Difference

**Current (Template-Based):**
```
LLM decides: "Use acf/top-slides block with 3 slides"
LLM fills: headline, subheadline, CTA text, image index
Output: Standard hero carousel (looks like all others)
```

**Future (Fully Custom):**
```
LLM generates:
- Custom full-screen parallax hero with property video
- Animated text that types out the tagline
- Floating amenity badges with hover effects
- Scroll-triggered image transitions
- Unique layout: diagonal split with map on right
Output: Bespoke design never seen before
```

---

## Implementation Roadmap

### Phase 1: Enhanced LLM Code Generation (2-3 weeks)

**Goal:** Enable Gemini 3 to generate custom HTML/CSS/JS sections

**Technical Approach:**
1. **Expand LLM prompts** to request full HTML/CSS/JS instead of ACF configs
2. **Component library system**:
   - Give LLM a library of modern React/Tailwind components
   - LLM assembles and customizes them
   - Uses shadcn/ui, Framer Motion for animations
3. **Safe code execution**:
   - Sandbox environment for preview
   - XSS protection and validation
   - No server-side code execution

**Files to Modify:**
- `llm-orchestration.ts`: Update prompts to request component code
- `ACFBlockRenderer.tsx`: Replace with dynamic component renderer
- New file: `ComponentLibrary.ts` - catalog of base components LLM can use

**Example Prompt Update:**
```typescript
// OLD
"Use ACF blocks: acf/top-slides, acf/content-grid, acf/form"

// NEW
"Generate custom React components using Tailwind CSS and Framer Motion.
Available components: Hero, Grid, Form, Gallery, Timeline, Testimonials...
Create a unique layout optimized for this property's brand personality.
Output: Array of { component: string, props: object, customCSS?: string }"
```

### Phase 2: WordPress Integration Layer (3-4 weeks)

**Goal:** Deploy custom-generated sites to WordPress

**Two Architectural Options:**

#### Option A: Headless WordPress + Static Generator
- **How it works:**
  - LLM generates Next.js/React components
  - Deploy to Vercel/Netlify as static site
  - WordPress backend only for content management (headless CMS)
  - Use WP REST API for property data updates
  
- **Pros:**
  - Ultra-fast performance (static sites)
  - Full creative freedom (no WordPress rendering constraints)
  - Modern developer experience
  - Easy to preview/iterate before deploy
  
- **Cons:**
  - Requires hosting beyond WordPress
  - Property managers may not be familiar with headless CMS
  - More complex deployment pipeline

#### Option B: Custom WordPress Theme Per Site
- **How it works:**
  - LLM generates complete WordPress theme code (PHP + HTML/CSS/JS)
  - Package as theme.zip
  - Deploy to WordPress instance via Cloudways API
  - Each site gets its own unique theme
  
- **Pros:**
  - Stay within WordPress ecosystem
  - Property managers can edit in familiar WordPress admin
  - Can use WordPress plugins
  
- **Cons:**
  - More complex (generating PHP backend code)
  - Slower site performance (WordPress overhead)
  - Harder to preview before deploy

**Recommendation:** Start with **Option A (Headless)** for maximum flexibility and modern performance. Offer Option B as "WordPress Classic Mode" for users who prefer traditional WP.

**Technical Requirements:**
- Cloudways API client (currently TODO)
- Theme packaging system
- Asset upload pipeline (images, fonts, etc.)
- Database migration for content
- DNS/domain configuration

### Phase 3: Advanced Customization (2-3 weeks)

**Goal:** Push beyond basic custom layouts into truly unique experiences

**Features:**
1. **AI-Generated Design Systems**
   - LLM creates complete design tokens (colors, spacing, typography, shadows)
   - Generates CSS variables or Tailwind config
   - Ensures brand consistency across all pages

2. **Interactive Elements**
   - Virtual tours (3D walkthroughs using Three.js)
   - Interactive floor plan explorers
   - Amenity booking widgets
   - Chatbot integrated into design

3. **Performance Optimization**
   - LLM generates optimized images (WebP, responsive)
   - Lazy loading strategies
   - Critical CSS extraction
   - Edge caching headers

4. **SEO Intelligence**
   - LLM writes meta descriptions, OpenGraph tags
   - Generates structured data (JSON-LD)
   - Creates XML sitemap
   - Writes robots.txt

### Phase 4: Iteration & Refinement UI (1-2 weeks)

**Goal:** Allow users to refine AI-generated designs

**Features:**
1. **Visual Editor**
   - Click any section to regenerate it
   - Prompt-based editing: "Make this section more bold"
   - A/B test different versions

2. **Style Transfer**
   - "Make it look more like competitor X"
   - Upload inspiration images
   - Apply brand guidelines after generation

3. **Component Swapping**
   - Replace generated components with alternatives
   - Drag-and-drop section reordering

---

## Technical Architecture: Fully Custom Mode

### New Data Flow

```
1. Brand Intelligence Extraction (existing)
   ↓
2. LLM Architecture Planning (modified)
   - Instead of selecting ACF blocks, plans custom component structure
   - Outputs: { pages: [{ sections: [ComponentSpec] }] }
   ↓
3. LLM Component Generation (NEW)
   - For each section, generates:
     * React component code (TypeScript + Tailwind)
     * Custom CSS (if needed)
     * Animation config (Framer Motion)
     * Props/data schema
   ↓
4. Preview Renderer (modified)
   - Dynamically imports generated components
   - Runs in sandboxed iframe for security
   - User can review and iterate
   ↓
5. Deployment (NEW)
   Option A: Deploy to Vercel as Next.js app
   Option B: Package as WordPress theme + deploy to Cloudways
```

### Component Library Structure

```typescript
// Base components LLM can use and customize
const ComponentLibrary = {
  layout: ['Container', 'Section', 'Grid', 'Flex', 'Absolute'],
  content: ['Heading', 'Paragraph', 'RichText', 'List'],
  media: ['Image', 'Video', 'Gallery', 'Carousel', 'Lightbox'],
  forms: ['ContactForm', 'TourScheduler', 'Newsletter'],
  interactive: ['Map', 'FloorPlanViewer', 'AmenityFilter', 'VirtualTour'],
  navigation: ['Navbar', 'Footer', 'Breadcrumbs', 'Sidebar'],
  conversion: ['CTAButton', 'BookingWidget', 'PricingTable'],
  animation: ['FadeIn', 'SlideUp', 'Parallax', 'ScrollReveal'],
  data: ['PropertyData', 'AvailabilityWidget', 'ReviewsGrid']
}

// LLM output example
{
  component: 'HeroSection',
  implementation: `
    export function HeroSection({ property, images }) {
      return (
        <section className="relative h-screen">
          <ParallaxBackground images={images} />
          <AnimatedText 
            text={property.tagline}
            animation="typewriter"
            className="absolute inset-0 flex items-center justify-center"
          />
          <CTAButton 
            text="Schedule Your Tour"
            style="floating"
            position="bottom-center"
          />
        </section>
      )
    }
  `,
  props: {
    property: 'PropertyContext',
    images: 'ImageArray'
  },
  dependencies: ['framer-motion', 'three'],
  customCSS: `
    .parallax-bg { blend-mode: overlay; opacity: 0.8; }
  `
}
```

### Security Considerations

1. **Code Sandboxing**
   - Generated components run in iframe with CSP
   - No `eval()` or dynamic script injection
   - All external resources validated

2. **Input Validation**
   - LLM outputs parsed and validated
   - TypeScript type checking
   - Linting (ESLint) on generated code

3. **XSS Prevention**
   - All user data sanitized
   - React automatically escapes by default
   - Content Security Policy headers

---

## Competitive Differentiation

### Current Market (Template-Based Builders)

- **Wix, Squarespace, Webflow:** Template selection + drag-and-drop
- **WordPress Themes:** Pick a theme, customize colors/text
- **AI Website Builders (10Web, Durable):** Still template-constrained

### SiteForge Custom LLM Advantage

1. **Zero Templates:** Every site is unique, designed from scratch
2. **Brand Intelligence:** Uses your actual brand assets (BrandForge integration)
3. **Property-Specific:** Optimized for multifamily real estate (not generic)
4. **Continuous Learning:** Each generation improves from feedback
5. **Speed:** 3-5 minutes for fully custom site (vs. weeks with agencies)

---

## Risks & Mitigations

### Risk 1: LLM Generates Broken Code
**Likelihood:** Medium  
**Mitigation:**
- Validate all generated code before preview
- Fallback to component library defaults if generation fails
- Unit tests for common patterns
- User can regenerate individual sections

### Risk 2: Performance Issues
**Likelihood:** Low  
**Mitigation:**
- Static site generation (Option A) is inherently fast
- Lighthouse CI to enforce performance budgets
- Automated image optimization

### Risk 3: Brand Consistency
**Likelihood:** Medium  
**Mitigation:**
- LLM uses design tokens system
- All components reference central theme config
- Preview allows checking before deploy

### Risk 4: User Overwhelmed by Options
**Likelihood:** Low  
**Mitigation:**
- Keep wizard simple (3 inputs)
- Most customization happens automatically via brand intelligence
- Advanced options hidden in "Expert Mode"

---

## Cost Analysis

### Current (Template-Based)
- Gemini 3 Pro API: ~$0.50-$1.00 per site generation
- Storage: ~$0.10/month per site (Supabase)
- **Total per site:** ~$1.00 one-time + $0.10/month

### Fully Custom Mode
- Gemini 3 Pro API: ~$2.00-$4.00 per site (more tokens for code generation)
- Vercel hosting (Option A): ~$0 (free tier) or $20/month (pro)
- WordPress hosting (Option B): ~$10-$30/month per site (Cloudways)
- **Total per site:** ~$4.00 one-time + $0-$30/month (depending on option)

**Price to Customer:**
- Current template mode: $99 one-time
- Custom mode: $299-$499 one-time + optional $20/month hosting

---

## Success Metrics

1. **Uniqueness Score:** % of generated sites that are visually distinct
2. **Time to Deploy:** Maintain <5 minutes total
3. **User Satisfaction:** Net Promoter Score (NPS) > 50
4. **Performance:** Lighthouse score > 90 for all sites
5. **Conversion Rate:** Tour requests/month per site (benchmark vs. template mode)

---

## Recommended Next Steps

### Immediate (This Week)
1. ✅ **This Report:** Validate vision with stakeholders
2. **Architecture Decision:** Choose Option A (Headless) vs. Option B (WP Theme)
3. **Prototype:** Build single custom-generated page as proof of concept

### Short Term (Next 2 Weeks)
1. Implement enhanced LLM prompts for component generation
2. Build component library catalog
3. Create sandboxed preview renderer

### Medium Term (Month 1-2)
1. Build deployment pipeline (Vercel or Cloudways)
2. Implement iteration/refinement UI
3. Beta test with 5-10 properties

### Long Term (Month 3+)
1. Add advanced features (virtual tours, animations)
2. Machine learning feedback loop (learn from successful sites)
3. White-label offering for property management companies

---

## Conclusion

**SiteForge is currently a sophisticated hybrid system** that uses cutting-edge LLMs (Gemini 3 Pro) within the constraints of WordPress ACF templates. It's ~60% built, with strong brand intelligence and content generation, but limited by predefined block types and incomplete WordPress deployment.

**The opportunity to go fully custom is significant:**
- **Differentiation:** True one-of-a-kind sites vs. template look-alikes
- **Performance:** Modern static sites vs. WordPress overhead (if using headless)
- **Innovation:** Ability to incorporate latest design trends and interactions
- **Pricing Power:** Charge $299-$499 vs. $99 for template mode

**The technical path is clear:**
1. Expand LLM to generate component code (not just fill templates)
2. Build deployment pipeline (recommend headless Next.js on Vercel)
3. Add iteration/refinement tools
4. Launch as premium tier

**Estimated effort:** 8-12 weeks for full MVP of custom mode with a 2-person team.

**Risk:** Medium - requires careful validation of LLM-generated code, but modern sandboxing and React make this manageable.

**Recommendation:** Proceed with Phase 1 prototype (2-3 weeks) to validate feasibility before committing to full build.

---

## Appendix: Files Analyzed

- `p11-platform/apps/web/types/siteforge.ts` - Type definitions
- `p11-platform/apps/web/utils/siteforge/llm-orchestration.ts` - Gemini 3 integration
- `p11-platform/apps/web/utils/siteforge/wordpress-client.ts` - WP deployment (TODO)
- `p11-platform/apps/web/utils/siteforge/brand-intelligence.ts` - Brand extraction
- `p11-platform/apps/web/components/siteforge/GenerationWizard.tsx` - UI
- `p11-platform/apps/web/components/siteforge/ACFBlockRenderer.tsx` - Preview renderer
- `p11-platform/apps/web/app/api/siteforge/generate/route.ts` - Generation API
- `p11-platform/apps/web/app/api/siteforge/deploy/[websiteId]/route.ts` - Deploy API
- `p11-platform/apps/web/app/dashboard/siteforge/page.tsx` - Main UI

**Total codebase analyzed:** ~2,000 lines of SiteForge-specific code
