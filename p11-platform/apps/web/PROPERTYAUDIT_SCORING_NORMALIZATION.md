# PropertyAudit Scoring & Recommendations Normalization

## Overview

PropertyAudit tracks GEO performance across multiple LLM surfaces (OpenAI, Claude). This document explains how scores and recommendations are normalized and aggregated.

---

## 🎯 **Scoring Normalization**

### **Per-Surface Scores (Individual)**

Each GEO run produces a surface-specific score:

**Formula:** `LLM_SERP_SCORE = 45% Position + 25% Link + 20% SOV + 10% Accuracy`

**Components:**
1. **Position (45%):** LLM rank position (1st = 100%, 10th = 10%)
2. **Link (25%):** Citation link rank position
3. **SOV (20%):** Share of Voice (brand citations / total)
4. **Accuracy (10%):** Penalized by warning flags

**Example:**
- **OpenAI Run:** Score 75.5, Visibility 100%, Avg Rank 1.0
- **Claude Run:** Score 82.8, Visibility 100%, Avg Rank 1.0

---

### **Combined Score (Dashboard Display)**

**Aggregation Method:** Simple average of latest runs per surface

**Code:** `score/route.ts` lines 114-115
```typescript
const avgOverallScore = scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length
const avgVisibilityPct = scores.reduce((sum, s) => sum + s.visibilityPct, 0) / scores.length
```

**Example:**
- OpenAI: 75.5
- Claude: 82.8
- **Combined: 79.2** (displayed on dashboard)

**Rationale:** Equal weighting assumes OpenAI and Claude have similar user adoption.

---

## 📊 **Recommendations Normalization**

### **Data Collection Strategy**

**Current Implementation:**
- Fetches last **2 runs** (ideally 1 OpenAI + 1 Claude)
- Changed from 5 runs to ensure recent, paired comparison
- Groups answers by query across both surfaces

**Code:** `recommendation-engine.ts` line 149
```typescript
runsQuery = runsQuery.limit(2)  // Get latest paired runs
```

---

### **Per-Query Analysis (Model-Aware)**

For each query, recommendations now track:

```typescript
modelBreakdown: {
  openai: {
    presence: boolean,
    rank: number | null,
    sov: number | null
  },
  claude: {
    presence: boolean,
    rank: number | null,
    sov: number | null
  },
  affectedModels: ['openai', 'claude']  // Which models have the issue
}
```

**Example Scenario:**

**Query:** "Best apartments in San Diego"
- **OpenAI:** Present, Rank #1, SOV 20%
- **Claude:** Absent, Rank null, SOV null
- **Recommendation:** "No presence - Affects Claude only"

---

### **Presence Detection (Optimistic)**

**Rule:** If **ANY** model shows presence → query has presence

**Code:** `identifyMissingKeywords` line 218
```typescript
const hasPresence = answers.some(a => a.presence)
```

**Rationale:**
- If OpenAI shows you → you're visible to OpenAI users
- If Claude doesn't → opportunity to improve Claude performance
- Recommendation shows model-specific action needed

**Impact:** Fewer "missing keyword" recommendations (optimistic view)

---

### **Rank Improvements (Model-Specific)**

**Rule:** If rank > 3 on **ANY** model → generate recommendation

**Enhancement:** Recommendation shows which model needs improvement

**Example:**
- **Title:** "Ranking #5 for 'luxury apartments'"
- **Description:** "Currently averaging #5. Issue primarily on OPENAI."
- **Model Breakdown:**
  - OpenAI: Rank #5 ⚠️
  - Claude: Rank #1 ✓

**Actionable:** User knows to focus content optimization for OpenAI specifically.

---

### **Competitor Analysis (Cross-Model)**

**Rule:** Aggregates competitor mentions across **BOTH** models

**Code:** `fetchAnalysisContext` lines 163-188
```typescript
answers?.forEach((answer: any) => {
  answer.ordered_entities.forEach((entity: any) => {
    competitorMap.get(key)!.mentions.push(entity.position)
  })
})
```

**Rationale:**
- Competitors appearing on either model are threats
- Aggregate view shows overall competitive landscape
- Individual recommendations show per-model gaps

---

## 🎨 **UI Display Enhancements**

### **Recommendation Cards Now Show:**

1. **Model Performance Box** (NEW)
   - OpenAI: ✓ Present / ✗ Absent + Rank
   - Claude: ✓ Present / ✗ Absent + Rank
   - Affects: OPENAI, CLAUDE

2. **Enhanced Descriptions**
   - "Issue affects OPENAI only"
   - "Issue affects both OpenAI and Claude"
   - "Issue primarily on CLAUDE"

3. **Actionable Intelligence**
   - Users know exactly which model needs work
   - Can prioritize based on their audience's LLM preferences

---

## 🔄 **Scoring Flow Diagram**

```
Individual Runs:
┌─────────────┐         ┌─────────────┐
│ OpenAI Run  │         │ Claude Run  │
│ 22 queries  │         │ 22 queries  │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ Evaluate              │ Evaluate
       │ per query             │ per query
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│ Score: 75.5 │         │ Score: 82.8 │
│ Vis: 100%   │         │ Vis: 100%   │
└──────┬──────┘         └──────┬──────┘
       │                       │
       └───────────┬───────────┘
                   │ Average
                   ▼
            ┌─────────────┐
            │ Combined:   │
            │ Score: 79.2 │  ← Dashboard display
            │ Vis: 100%   │
            └──────┬──────┘
                   │
                   │ Analyze per query
                   ▼
            ┌─────────────────────┐
            │ Recommendations:    │
            │ - Model breakdowns  │  ← Per-model insights
            │ - Affected models   │
            │ - Targeted actions  │
            └─────────────────────┘
```

---

## 📈 **Impact Score Normalization**

**Impact scores (0-100) are standardized across all recommendation types:**

| Type | High Priority | Medium Priority | Low Priority |
|------|--------------|-----------------|--------------|
| Missing Branded | 90 | - | - |
| Missing Category | - | 70 | - |
| Missing Other | - | - | 50 |
| Rank Improvement (4-7) | 85 | - | - |
| Content Gap (rank 4-5) | - | 60-40 | - |
| Citation Opportunity | - | 40-75 | - |
| Voice Search | - | - | 55 |
| Maintenance | - | - | 40-50 |

**Priority Weighting:**
- High: 3x weight
- Medium: 2x weight  
- Low: 1x weight

---

## ✅ **Summary: What's Normalized?**

| Metric | Normalization Method | Rationale |
|--------|---------------------|-----------|
| **Overall Score** | ✓ Averaged across models | Equal weight to OpenAI & Claude |
| **Visibility %** | ✓ Averaged across models | Shows combined visibility |
| **Avg LLM Rank** | ✓ Averaged across models | Overall ranking performance |
| **Recommendations** | ✓ Model-aware analysis | Shows which model needs work |
| **Impact Scores** | ✓ Standardized 0-100 | Comparable across rec types |
| **Priority Levels** | ✓ Consistent formula | Branded > Category > Other |

---

## 🎯 **Key Benefits of Model-Aware Analysis**

1. **Targeted Optimization**
   - Know which LLM needs improvement
   - Focus efforts where needed most

2. **Competitive Intelligence**
   - See if competitors dominate specific models
   - Adjust strategy per platform

3. **Better ROI**
   - Don't optimize where you're already #1
   - Address actual gaps, not phantom issues

4. **Trend Analysis**
   - Track model-specific performance over time
   - Identify if one model is degrading

---

## 🚀 **Future Enhancements**

### **Weighted Averages by Usage**
If you have data on which LLM your audience uses:
```typescript
const weightedScore = 
  (openaiScore * 0.6) +   // 60% of users use OpenAI
  (claudeScore * 0.4)     // 40% of users use Claude
```

### **Model-Specific Thresholds**
Different targets per model:
```typescript
{
  openai: { targetVisibility: 80%, targetRank: 2 },
  claude: { targetVisibility: 70%, targetRank: 3 }
}
```

### **A/B Testing Queries**
Test query effectiveness per model:
```typescript
// Which queries perform better on OpenAI vs Claude?
// Optimize query wording per model
```

---

## Conclusion

✅ **Scores:** Fully normalized via simple averaging  
✅ **Recommendations:** Model-aware with per-model breakdowns  
✅ **UI:** Shows exactly which model needs work  
✅ **Impact:** Standardized for comparability  

This provides **actionable, model-specific intelligence** while maintaining simple aggregate views for quick assessment.
