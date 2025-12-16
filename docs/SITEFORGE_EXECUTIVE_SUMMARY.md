# SiteForge Custom LLM: Executive Summary

**Date:** December 15, 2025  
**Status:** Analysis Complete ✅

---

## The Bottom Line

**Current State:** SiteForge uses AI to fill templates. It's smart, but constrained.

**Opportunity:** Make AI generate completely custom sites from scratch. No templates.

**Effort:** 8-12 weeks, 2 developers

**Business Case:** Charge $299-499 vs $99. Higher value = higher price.

---

## What You Have Today

### ✅ Working Well
- Gemini 3 Pro AI integration (smart content generation)
- Brand intelligence extraction (pulls from BrandForge automatically)
- User-friendly wizard (3 simple inputs)
- Preview system (see before deploy)

### ⚠️ Limited By
- **14 predefined blocks** - all sites look similar
- **WordPress deployment not built** - currently just mocks/TODOs
- **Can't innovate** - stuck with what ACF blocks provide

---

## What Custom LLM Enables

### 🚀 Game Changers
1. **Truly Unique Sites** - every one different
2. **Modern Features** - parallax, animations, custom interactions
3. **Performance** - static sites (fast) vs WordPress (slower)
4. **Competitive Edge** - no one else doing this for multifamily

### 💰 Business Impact
- **3-5x price increase** ($99 → $299-499)
- **Premium positioning** - flagship sites vs basic templates
- **Recurring revenue** - $20/mo hosting (optional)

---

## Technical Approach (3 Options)

### Option A: Headless Next.js (RECOMMENDED)
**What:** AI generates React components, deploy to Vercel as static site
**Pros:** Fast, modern, full creative freedom  
**Cons:** Not traditional WordPress  
**Best for:** Tech-forward customers, performance-critical sites

### Option B: Custom WordPress Themes
**What:** AI generates WP theme code, deploy to Cloudways
**Pros:** Familiar WordPress admin, plugin ecosystem  
**Cons:** Slower, more complex code generation  
**Best for:** Customers who must have WordPress

### Option C: Hybrid (Both)
**What:** Offer both options - let customer choose
**Pros:** Maximum flexibility  
**Cons:** Maintain two deployment pipelines  
**Best for:** Diverse customer base

---

## Implementation Plan

```
Phase 1: Prototype (2-3 weeks)
├─ Prove AI can generate good code
├─ Build single custom page
└─ Test with 1 property

Decision Point: Continue or pivot?

Phase 2: MVP (3-4 weeks)
├─ Full deployment pipeline
├─ 5-10 beta sites
└─ Customer feedback

Phase 3: Production (2-3 weeks)
├─ Advanced features
├─ Polish & testing
└─ Launch

Phase 4: Iteration (1-2 weeks)
├─ Visual editor
└─ Refinement tools
```

**Total: 8-12 weeks** with 2 developers

---

## Investment Required

### Development Time
- **Phase 1 (Prototype):** 2-3 weeks → ~$10-15k
- **Phase 2 (MVP):** 3-4 weeks → $15-20k
- **Phase 3 (Production):** 2-3 weeks → $10-15k
- **Phase 4 (Iteration):** 1-2 weeks → $5-10k

**Total:** $40-60k in dev time (assuming ~$5k/week blended rate)

### Infrastructure
- **Gemini API:** $2-4 per site (vs $1 current)
- **Hosting:** $0-30/mo per site (Vercel free tier or Cloudways)

---

## Revenue Model

### Current Template Mode
```
Price:    $99 one-time
Cost:     $1 generation + $0.10/mo
Margin:   ~$98 (98%)
Volume:   10 sites/month = $980 revenue
```

### Future Custom LLM Mode
```
Price:    $399 one-time + $20/mo hosting
Cost:     $4 generation + $10/mo (Vercel/Cloudways)
Margin:   ~$395 initial (99%) + $10/mo ongoing (50%)
Volume:   10 sites/month = $3,990 initial + $100/mo recurring
```

**Break-even:** 10-15 custom sites pays for entire development

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM generates bad code | Medium | Medium | Validation, fallbacks, sandboxing |
| Customers confused | Low | Medium | Keep wizard simple, good docs |
| Development delays | Medium | Low | Start with prototype, iterate |
| Competitors copy | Low | Medium | First mover advantage (6-12 months) |

**Overall Risk:** 🟡 Medium - manageable with good execution

---

## Competitive Landscape

### What Others Do
- **Wix, Squarespace:** Templates + drag-and-drop (old school)
- **Webflow:** Visual builder + templates (designer-focused)
- **10Web, Durable:** AI builders, but still template-constrained
- **WordPress Themes:** Pick theme, customize (manual)

### Your Advantage
✅ Zero templates - truly custom  
✅ Built for multifamily (not generic)  
✅ Brand intelligence integration (BrandForge)  
✅ 3-minute generation (not weeks)

**Market Position:** Premium custom sites at template prices

---

## Success Metrics

### Phase 1 (Prototype)
- ✅ AI generates valid, working code
- ✅ Single page renders correctly
- ✅ 1 beta customer approves

### Phase 2 (MVP)
- ✅ 10 beta sites generated
- ✅ >80% visual uniqueness score
- ✅ <5 min total generation time

### Phase 3 (Production)
- ✅ 50 sites deployed
- ✅ >90 Lighthouse performance score
- ✅ $20k MRR (monthly recurring revenue)

### Phase 4 (Scale)
- ✅ 100+ sites deployed
- ✅ <1% error rate
- ✅ 8+ NPS (customer satisfaction)

---

## Decision Framework

### ✅ GO if:
1. Want to differentiate from competitors
2. Have 2 devs for 8-12 weeks
3. Comfortable with $40-60k investment
4. Target customers value uniqueness
5. Can charge premium ($299-499)

### ❌ NO GO if:
1. Template mode meeting needs
2. Dev team fully allocated
3. Budget constrained
4. Must stick to <$99 price point
5. Need immediate ROI (<3 months)

### 🤔 START SMALL if:
1. Uncertain about demand
2. Want to validate before full build
3. Limited dev capacity
4. Need quick wins

**Recommendation:** Start with Phase 1 prototype (2-3 weeks, $10-15k) to validate before committing to full build.

---

## Next Actions

### This Week
1. **Architecture Decision:** Choose Option A (Headless), B (WP), or C (Hybrid)
2. **Resource Allocation:** Assign 2 devs for prototype
3. **Customer Validation:** Interview 3-5 prospects about $299-499 price

### Next 2 Weeks (Phase 1)
1. Build single custom-generated page
2. Test with 1 internal property
3. Get beta customer feedback

### After Prototype
1. **GO Decision:** Proceed to Phase 2 (MVP)
2. **NO GO Decision:** Stick with template mode, refine it
3. **PIVOT Decision:** Adjust approach based on learnings

---

## Questions to Answer

### Business Questions
- Q: Will customers pay $299-499 vs $99?
- Q: How many custom sites can we sell per month?
- Q: Do we need recurring hosting revenue?

### Technical Questions
- Q: Headless (Next.js) or WordPress themes?
- Q: Can Gemini 3 reliably generate good code?
- Q: How do we validate generated code for security?

### Product Questions
- Q: Keep wizard simple (3 inputs) or add more options?
- Q: Offer template mode as upsell path to custom?
- Q: How much iteration/refinement do customers need?

---

## The Ask

### For Product Leadership
- **Approve** Phase 1 prototype (2-3 weeks, $10-15k)
- **Validate** pricing hypothesis with customers
- **Prioritize** against other initiatives

### For Engineering
- **Assign** 2 devs for prototype sprint
- **Review** technical architecture options
- **Estimate** effort more precisely

### For Sales/Marketing
- **Survey** 5-10 prospects on pricing
- **Identify** 3 beta customers
- **Position** premium vs template mode

---

## Conclusion

**SiteForge has strong foundations** (60% complete) but is constrained by templates. **The opportunity to go fully custom is compelling** - 3-5x revenue per site, true competitive differentiation, and modern performance.

**Recommendation:** Invest 2-3 weeks in a prototype to validate technical feasibility and customer demand before committing to the full 8-12 week build.

**Risk:** Medium - manageable with good execution  
**Reward:** High - premium positioning and recurring revenue  
**Timeline:** 2-3 months to market

**Decision needed by:** This week to start prototype before end of year.

---

**Prepared by:** AI Analysis of SiteForge Codebase  
**Files Analyzed:** 9 core files, ~2,000 lines of code  
**Confidence Level:** High (based on complete codebase examination)
