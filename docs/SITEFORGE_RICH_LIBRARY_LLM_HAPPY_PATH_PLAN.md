## SiteForge: Rich Block Library + LLM-Driven Editing (WordPress Deploy) — Happy Path Plan

### Goal
Enable a non-technical user to create a custom-feeling real estate WordPress website from property/KB data inside the P11 dashboard (SiteForge), then deploy it as a WordPress-ready site.

### One-sentence product promise
“Pick a starting style or chat what you want; the AI builds your site from your property data, and you can click any section and ask the AI to change it—then deploy to WordPress.”

---

## Core decisions (what makes this feasible)

### Single source of truth: a Site Blueprint
Everything (generation, preview, editing, deployment) is driven from a structured **Blueprint** stored per website:
- Pages → Sections → **SectionSpec** objects
- Each section references **only allowlisted building blocks** from your library (no arbitrary code in MVP)
- All text/media/data bindings come from the property/KB layer

### “Rich library” means breadth + parameterization + composition
The library grows over time, but every block/section is:
- **Prebuilt** (tested once)
- **Parameterized** (safe knobs: layout variants, density, tone, CTA style, media treatment)
- **Composable** (reorder/add/remove sections freely)

### LLM is an orchestrator over the library
User requests are translated into **Blueprint patches** (add/swap/reorder/tune), not freeform PHP/JS generation.

### WordPress is the production website
Deployment produces a real WordPress site (theme + required plugins + content/pages) and activates it.

---

## User-facing “happy path” (single flow)

### 1) Start: template-first or chat-first (same engine)
User chooses one of two entry points:
- **Template start**: pick a style template (Luxury / Family / Student / Senior / Urban / Suburban)
- **Conversation start**: “Build a site for this property” and answer a few guided questions

Both produce the same artifact: a **first-draft Blueprint** populated from property/KB data.

### 2) Generate draft from property/KB data
System pulls:
- Property facts: name, address, city/neighborhood, amenities, floorplans, pricing/availability (if present), policies, contact, hours
- Media: hero images, galleries, logos, map pins
- Brand/tone rules (if present)

LLM produces:
- Page list (Home, Floorplans, Amenities, Neighborhood, Contact, etc.)
- Section composition per page using the library
- Copy tuned to user’s chosen vibe

### 3) Preview with clickable sections
Preview shows boundaries and labels (e.g., “Hero”, “Amenities Grid”, “Floorplans”, “Neighborhood Map”, “Tour CTA”).

### 4) Edit by selecting a section + asking the AI
User clicks a section, then types:
- “Make this more luxury and modern”
- “Add pet policy here”
- “Move floorplans above amenities”
- “Add a tour scheduling section”

The LLM returns a **structured patch**:
- Update section copy
- Swap section variant (e.g., HeroVariantA → HeroVariantD)
- Adjust design tokens or per-section style knobs
- Add/remove/reorder sections

### 5) Add sections & features from a vetted menu
- **Add section**: user picks from suggested sections; LLM configures it from KB
- **Add functionality**: user picks features (tour booking, availability, reviews, map)
  - Each feature maps to a **prebuilt interactive section/block** you ship and test

### 6) Deploy to WordPress
One-button deploy provisions/targets a WordPress instance, installs required theme/plugins, uploads media, creates pages/menus, and publishes.

---

## Technical approach (fits your current codebase)

### Existing building blocks to lean on
- `p11-platform/apps/web/utils/siteforge/llm-orchestration.ts`: orchestration layer (extend to output and patch a Blueprint)
- `p11-platform/apps/web/components/siteforge/ACFBlockRenderer.tsx` + `WebsitePreview.tsx`: preview rendering (extend to support selection + stable section IDs)
- `p11-platform/apps/web/app/api/siteforge/*`: generation/preview/deploy routes (extend for patch + versioning)
- `p11-platform/apps/web/utils/siteforge/wordpress-client.ts`: deployment integration point (extend to package/apply theme + content)

### A pragmatic “library” implementation for MVP
Start with your current ACF-based section system (fastest path), but evolve it into a richer library:
- **SectionLibrary**: named section types with variants
  - Example: `Hero` (6 variants), `Amenities` (4), `Gallery` (5), `Floorplans` (3), `Neighborhood` (4), `CTA` (5), `FAQ` (3), `Contact` (3)
- Each section maps to one or more ACF blocks (or a single ACF block with variant params)
- Each section exposes **safe knobs** (layout, alignment, media style, number of cards, emphasis)

Later (phase 3+), you can add Gutenberg block theme export if you want; MVP can stay ACF-driven as long as deployment is real WordPress.

### Blueprint schema (minimal but sufficient)
- `WebsiteBlueprint`
  - `designTokens` (colors, fonts, spacing, radius, shadows)
  - `pages[]` → `sections[]`
- `SectionSpec`
  - `id` (stable, used for click-to-edit)
  - `type` (from allowlisted `SectionLibrary`)
  - `variant`
  - `bindings` (which property/KB fields populate it)
  - `contentOverrides` (LLM-authored copy where needed)
  - `styleOverrides` (safe knobs)

### Intent → Patch translator (the key feature)
When user edits a section, run an LLM call that produces:
- `PatchOperation[]` (add/remove/move/update)
- Guaranteed to validate against the schema and allowlists

If patch fails validation:
- auto-retry with “fix to schema” prompt
- or fallback to safe default variants

### Preview selection UX
- Render each section with a visible outline and label in “edit mode”
- Click sets `selectedSectionId`
- Edits are applied as patches and re-rendered instantly

### Deployment (WordPress-ready)
Minimum viable deploy:
- Ensure required plugins (ACF Pro, etc.) are installed/active
- Upload media
- Create pages
- Apply page content/layout derived from blueprint (ACF block JSON / post content + meta)
- Configure menus + site settings

---

## Safety & quality gates (must-have)

### Hard constraints
- Only allowlisted `SectionLibrary` types/variants
- Only allowlisted dependencies/features (no arbitrary scripts)
- No raw HTML injection unless sanitized and explicitly permitted

### Validation pipeline (pre-preview and pre-deploy)
- Schema validation of Blueprint + PatchOperations
- Content sanity: required fields present, no hallucinated “facts” (must be KB-backed or explicitly marked as user-provided)
- Security checks: strip/deny scripts, unapproved embeds
- Basic UX checks: section count limits, image count limits

---

## Phased roadmap (single happy path)

### Phase 0 (1 week): Blueprint foundation
- Implement Blueprint schema + validator
- Store Blueprint per website + version history
- Add “section IDs” to preview rendering

### Phase 1 (2–3 weeks): Rich library v1 + click-to-edit
- Build SectionLibrary v1 (10–15 section types, 3–6 variants each)
- Implement “select section → LLM patch” editing loop
- Template-start uses presets (Blueprint starters)
- Conversation-start produces initial Blueprint (guided Qs)

### Phase 2 (3–4 weeks): WordPress deploy MVP
- Harden `wordpress-client.ts` pipeline to produce real WP sites
- Media upload + page creation + applying section layouts
- Add rollback and “redeploy” safely

### Phase 3 (2–4 weeks): Feature blocks + scale
- Add vetted interactive features (tour scheduler, availability, reviews)
- Add QA gates + better monitoring/logging
- Expand library breadth (variants and new section types)

---

## What “custom-feeling” will look like (without unsafe code-gen)
Users perceive customization because the AI can:
- Choose different section variants and compositions
- Generate tuned copy from KB facts
- Change global styling tokens (whole-site vibe changes)
- Reorder/add/remove sections fluidly

The system stays reliable because:
- It never deploys arbitrary generated code
- It validates every change against a known schema and library

---

## Success criteria (MVP)
- A non-technical user can generate a full draft site from a property record
- User can click any section and request a change; change applies without breaking preview
- Site deploys to WordPress and matches the preview closely
- 5–10 beta sites deployed with <5% manual intervention
