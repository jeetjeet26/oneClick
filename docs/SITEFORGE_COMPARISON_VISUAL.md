# SiteForge: Template vs. Custom LLM Mode Comparison

## Quick Visual Comparison

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE (Template-Based)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User Input (3 preferences)                                        │
│         ↓                                                          │
│  Brand Intelligence Extraction ✅                                  │
│         ↓                                                          │
│  Gemini 3 Plans Architecture ✅                                    │
│         ↓                                                          │
│  ⚠️ CONSTRAINT: Must use 14 ACF block types                        │
│     - acf/top-slides (hero)                                        │
│     - acf/content-grid (amenities)                                 │
│     - acf/form (contact)                                           │
│     - etc. (11 more predefined blocks)                             │
│         ↓                                                          │
│  Gemini 3 Generates Content ✅                                     │
│  (fills in headlines, text, CTAs)                                  │
│         ↓                                                          │
│  Preview Renderer ✅                                               │
│         ↓                                                          │
│  ⚠️ WordPress Deployment (TODO - not built)                        │
│                                                                     │
│  RESULT: Professional sites, but all look similar                  │
│          Limited by template constraints                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                    FUTURE STATE (Fully Custom LLM)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User Input (same 3 preferences)                                   │
│         ↓                                                          │
│  Brand Intelligence Extraction ✅ (reuse existing)                 │
│         ↓                                                          │
│  Gemini 3 Plans Custom Architecture 🆕                             │
│  (no template constraints)                                         │
│         ↓                                                          │
│  ✨ FREEDOM: Generate unique components                            │
│     - Custom React/Tailwind components                             │
│     - Unique layouts (diagonal, asymmetric, etc.)                  │
│     - Animated interactions (parallax, scroll effects)             │
│     - Brand-specific design system                                 │
│         ↓                                                          │
│  Gemini 3 Generates Full Code 🆕                                   │
│  - HTML/JSX                                                        │
│  - CSS/Tailwind                                                    │
│  - JavaScript/animations                                           │
│  - Component logic                                                 │
│         ↓                                                          │
│  Sandboxed Preview 🆕                                              │
│  (safe code execution)                                             │
│         ↓                                                          │
│  Deployment Pipeline 🆕                                            │
│  Option A: Next.js → Vercel (headless, fast)                      │
│  Option B: Custom WP theme → Cloudways (traditional)              │
│                                                                     │
│  RESULT: Truly unique sites, one-of-a-kind designs                 │
│          Full creative freedom                                     │
│          Modern performance                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Side-by-Side Example: Hero Section

### Current Template Mode
```typescript
// LLM Output (constrained)
{
  type: "hero",
  acfBlock: "acf/top-slides",
  content: {
    slides: [{
      headline: "Luxury Living in Downtown Austin",
      subheadline: "Experience modern amenities...",
      cta_text: "Schedule Tour",
      cta_link: "/contact",
      image_index: 0
    }]
  }
}

// Rendered Output:
// ┌──────────────────────────────────┐
// │                                  │
// │  [Standard ACF Carousel]         │
// │  • Same layout as all others     │
// │  • Standard fade transition      │
// │  • Fixed button style            │
// │                                  │
// └──────────────────────────────────┘
```

### Custom LLM Mode
```typescript
// LLM Output (fully custom)
{
  type: "hero",
  component: "CustomHeroParallax",
  implementation: `
    export function CustomHeroParallax({ property, images }) {
      const { scrollY } = useScroll()
      const y = useTransform(scrollY, [0, 500], [0, 200])
      
      return (
        <motion.section 
          className="relative h-screen overflow-hidden"
          style={{ y }}
        >
          <div className="absolute inset-0 grid grid-cols-2">
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 
                          flex items-center justify-start p-20">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-7xl font-bold text-white mb-4 
                             leading-tight">
                  {property.name}
                </h1>
                <TypewriterText 
                  text={property.tagline}
                  className="text-2xl text-indigo-200"
                />
                <FloatingCTA 
                  text="Experience the Difference"
                  style="neon-glow"
                  icon="arrow-right"
                />
              </motion.div>
            </div>
            
            <div className="relative">
              <ParallaxImages images={images} />
              <AmenityBadges 
                items={property.topAmenities}
                animation="float-in"
              />
            </div>
          </div>
          
          <ScrollIndicator className="absolute bottom-8" />
        </motion.section>
      )
    }
  `,
  customCSS: `
    .neon-glow { 
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
      animation: pulse 2s ease-in-out infinite;
    }
  `,
  dependencies: ["framer-motion", "typewriter-effect"]
}

// Rendered Output:
// ┌──────────────────────────────────┐
// │ ┌─────────────┬────────────────┐ │
// │ │             │                │ │
// │ │  Luxury     │   [Parallax    │ │
// │ │  Living     │    Images]     │ │
// │ │             │                │ │
// │ │  [Typewrite │   • Floating   │ │
// │ │   Effect]   │     Amenity    │ │
// │ │             │     Badges     │ │
// │ │  [Neon Glow │                │ │
// │ │   Button]   │                │ │
// │ │             │                │ │
// │ └─────────────┴────────────────┘ │
// │                                  │
// │        ↓ [Animated Scroll]       │
// └──────────────────────────────────┘
//
// UNIQUE: Two-column split with parallax,
//         typewriter effect, neon glow CTA,
//         floating amenity badges
```

## Feature Matrix

| Feature | Current Template | Custom LLM | Impact |
|---------|------------------|------------|--------|
| **Layout Options** | 14 fixed blocks | Unlimited custom | 🔥 High |
| **Visual Uniqueness** | Low (all similar) | High (one-of-a-kind) | 🔥 High |
| **Animations** | Basic (fade/slide) | Advanced (parallax, scroll, custom) | 🔥 High |
| **Brand Integration** | ✅ Colors, fonts | ✅ Full design system | ⚡ Medium |
| **Generation Time** | 2-3 minutes | 3-5 minutes | ⚡ Medium |
| **Preview Quality** | ✅ Good | ✅ Excellent | ⚡ Medium |
| **WordPress Deploy** | ⚠️ TODO | 🆕 Headless or Classic | 🔥 High |
| **Performance** | Good (WP) | Excellent (static) | 🔥 High |
| **Maintenance** | Easy | Medium | ⚠️ Low |
| **Cost per Site** | $1 + $0.10/mo | $4 + $0-30/mo | ⚠️ Low |

## Effort Breakdown

```
Phase 1: Enhanced LLM Generation (2-3 weeks)
├─ Expand prompts for code generation ........... 3 days
├─ Build component library catalog .............. 5 days
├─ Update LLM orchestration logic ............... 3 days
└─ Create sandboxed renderer .................... 4 days

Phase 2: Deployment Pipeline (3-4 weeks)
├─ Option A: Vercel/Next.js integration ......... 7 days
├─ Option B: WordPress theme packager ........... 10 days
├─ Cloudways API client ......................... 5 days
├─ Asset upload pipeline ........................ 3 days
└─ Testing & refinement ......................... 5 days

Phase 3: Advanced Features (2-3 weeks)
├─ Animation library ............................ 5 days
├─ Design system generator ...................... 4 days
├─ SEO optimization ............................. 3 days
└─ Performance optimization ..................... 3 days

Phase 4: Iteration UI (1-2 weeks)
├─ Visual editor ................................ 5 days
└─ Component swapping ........................... 5 days

TOTAL: 8-12 weeks (2 developers)
```

## Business Model

```
Template Mode (Current)
├─ Price: $99 one-time
├─ Cost: $1 + $0.10/mo
├─ Margin: ~$98 (98%)
└─ Target: Budget-conscious properties

Custom LLM Mode (Future)
├─ Price: $299-$499 one-time + $20/mo hosting
├─ Cost: $4 + $0-20/mo
├─ Margin: ~$295-$475 initial (90-95%) + $10/mo ongoing (50%)
└─ Target: Premium properties, flagship sites

Upsell Path: Generate in template mode → Upgrade to custom for $200
```

## Risk Assessment

```
TECHNICAL RISKS:
├─ LLM generates broken code ............. 🟡 Medium
│  └─ Mitigation: Validation + fallbacks
├─ Performance issues .................... 🟢 Low
│  └─ Mitigation: Static generation
└─ Security (XSS) ........................ 🟢 Low
   └─ Mitigation: Sandboxing + CSP

BUSINESS RISKS:
├─ Complexity overwhelms users ........... 🟢 Low
│  └─ Mitigation: Keep wizard simple
├─ Higher costs reduce margin ............ 🟡 Medium
│  └─ Mitigation: Premium pricing
└─ Deployment reliability ................ 🟡 Medium
   └─ Mitigation: Thorough testing

MARKET RISKS:
├─ Competitors copy approach ............. 🟢 Low
│  └─ First mover advantage (6-12 months)
└─ Users prefer familiar WordPress ....... 🟡 Medium
   └─ Mitigation: Offer both options
```

## Decision Matrix

```
Should you build Custom LLM Mode?

✅ YES IF:
├─ You want to differentiate from competitors
├─ Target customers value uniqueness
├─ You have 8-12 weeks of dev capacity
├─ Premium pricing is acceptable ($299-$499)
└─ You're comfortable with modern tech (Next.js)

❌ NO IF:
├─ Template mode meets customer needs
├─ Budget is tight (<$99 price point)
├─ Team lacks React/Next.js expertise
├─ WordPress ecosystem is non-negotiable
└─ Need to launch in <4 weeks

🤔 MAYBE (Start with Prototype):
├─ Build Phase 1 only (2-3 weeks)
├─ Test with 5 beta customers
├─ Validate willingness to pay premium
└─ Then decide on full build
```

## Recommended Path Forward

```
WEEK 1-2: Discovery & Prototype
├─ Day 1-2: Architecture decision (Headless vs WP)
├─ Day 3-5: Build single custom page as POC
├─ Day 6-8: Test with internal property
└─ Day 9-10: Validate with 3 pilot customers

DECISION POINT 1: Go/No-Go on full build

WEEK 3-6: Phase 1 (LLM + Preview)
├─ Enhanced LLM prompts
├─ Component library
├─ Sandboxed renderer
└─ Beta testing

DECISION POINT 2: Choose deployment option

WEEK 7-10: Phase 2 (Deployment)
├─ Build chosen deployment pipeline
├─ End-to-end testing
└─ Launch to limited beta

WEEK 11-12: Phase 3 (Polish)
├─ Advanced features
├─ Iteration UI
└─ General availability

SUCCESS METRICS:
├─ 10 beta sites generated
├─ >80% visual uniqueness score
├─ <5 min generation time
├─ >90 Lighthouse score
└─ 3+ customer testimonials
```
