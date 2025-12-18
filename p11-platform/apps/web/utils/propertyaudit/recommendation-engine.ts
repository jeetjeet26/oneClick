/**
 * PropertyAudit Recommendation Engine
 * Analyzes GEO gaps and generates actionable content suggestions
 */

import { createClient } from '@/utils/supabase/server'

export interface ContentRecommendation {
  id: string
  type: 'missing_keyword' | 'content_gap' | 'citation_opportunity' | 'rank_improvement' | 'voice_search'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  keywords: string[]
  competitorContext?: {
    competitorName: string
    competitorDomain: string
    avgRank: number
  }
  modelBreakdown?: {
    openai: {
      presence: boolean
      rank: number | null
      sov: number | null
    } | null
    claude: {
      presence: boolean
      rank: number | null
      sov: number | null
    } | null
    affectedModels: ('openai' | 'claude')[]
  }
  impact: {
    score: number // 0-100 estimated impact
    reason: string
  }
  actionItems: string[]
  relatedQueries: Array<{
    id: string
    text: string
    type: string
  }>
}

export interface RecommendationSummary {
  totalRecommendations: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  categories: {
    missingKeywords: number
    contentGaps: number
    citationOpportunities: number
    rankImprovement: number
    voiceSearch: number
  }
}

interface AnalysisContext {
  propertyId: string
  brandName: string
  runIds: string[]
  queries: Array<{
    id: string
    text: string
    type: string
    geo: string | null
  }>
  answers: Array<{
    id: string
    queryId: string
    runId: string
    presence: boolean
    llmRank: number | null
    linkRank: number | null
    sov: number | null
    orderedEntities: Array<{
      name: string
      domain: string
      position: number
      rationale: string
    }>
  }>
  runsBySurface: Map<string, 'openai' | 'claude'>
  competitors: Array<{
    name: string
    domain: string
    mentionCount: number
    avgRank: number
  }>
}

/**
 * Generates recommendations from GEO run data
 */
export async function generateRecommendations(
  propertyId: string,
  runId?: string
): Promise<{ recommendations: ContentRecommendation[]; summary: RecommendationSummary }> {
  const supabase = await createClient()

  // Fetch analysis context
  const context = await fetchAnalysisContext(supabase, propertyId, runId)

  // Generate different types of recommendations
  const recommendations: ContentRecommendation[] = [
    ...identifyMissingKeywords(context),
    ...identifyContentGaps(context),
    ...identifyCitationOpportunities(context),
    ...identifyRankImprovements(context),
    ...identifyVoiceSearchOpportunities(context),
  ]

  // If no recommendations (perfect performance), add maintenance suggestions
  if (recommendations.length === 0) {
    recommendations.push(...generateMaintenanceRecommendations(context))
  }

  // Sort by priority and impact
  recommendations.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 }
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority]
    }
    return b.impact.score - a.impact.score
  })

  // Generate summary
  const summary = generateSummary(recommendations)

  return { recommendations, summary }
}

async function fetchAnalysisContext(
  supabase: any,
  propertyId: string,
  runId?: string
): Promise<AnalysisContext> {
  // Fetch property details
  const { data: property } = await supabase
    .from('properties')
    .select('name')
    .eq('id', propertyId)
    .single()

  // Fetch queries
  const { data: queries } = await supabase
    .from('geo_queries')
    .select('id, text, type, geo')
    .eq('property_id', propertyId)
    .eq('is_active', true)

  // Fetch recent runs (or specific run)
  let runsQuery = supabase
    .from('geo_runs')
    .select('id, surface')
    .eq('property_id', propertyId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })

  if (runId) {
    runsQuery = runsQuery.eq('id', runId).limit(1)
  } else {
    // Get last 2 runs (ideally 1 OpenAI + 1 Claude)
    runsQuery = runsQuery.limit(2)
  }

  const { data: runs } = await runsQuery

  const runIds = runs?.map((r: any) => r.id) || []
  const runsBySurface = new Map<string, 'openai' | 'claude'>()
  runs?.forEach((r: any) => {
    runsBySurface.set(r.id, r.surface)
  })

  // Fetch answers for these runs
  // Note: If no runs, avoid .in() with empty array which returns no results
  let rawAnswers: any[] = []
  if (runIds.length > 0) {
    const { data } = await supabase
      .from('geo_answers')
      .select('id, query_id, run_id, presence, llm_rank, link_rank, sov, ordered_entities')
      .in('run_id', runIds)
    rawAnswers = data || []
  }

  // Transform snake_case from Supabase to camelCase expected by the engine
  const answers = rawAnswers.map((a: any) => ({
    id: a.id,
    queryId: a.query_id,
    runId: a.run_id,
    presence: a.presence,
    llmRank: a.llm_rank,
    linkRank: a.link_rank,
    sov: a.sov,
    orderedEntities: a.ordered_entities || [],
  }))

  // Build competitor insights from answers
  const competitorMap = new Map<string, { name: string; domain: string; mentions: number[] }>()
  
  answers.forEach((answer) => {
    if (answer.orderedEntities && Array.isArray(answer.orderedEntities)) {
      answer.orderedEntities.forEach((entity: any) => {
        const key = entity.domain
        if (!competitorMap.has(key)) {
          competitorMap.set(key, {
            name: entity.name,
            domain: entity.domain,
            mentions: [],
          })
        }
        competitorMap.get(key)!.mentions.push(entity.position)
      })
    }
  })

  const competitors = Array.from(competitorMap.entries())
    .map(([domain, data]) => ({
      name: data.name,
      domain,
      mentionCount: data.mentions.length,
      avgRank: data.mentions.reduce((a, b) => a + b, 0) / data.mentions.length,
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount)

  return {
    propertyId,
    brandName: property?.name || 'Your Property',
    runIds,
    queries: queries || [],
    answers,
    runsBySurface,
    competitors,
  }
}

/**
 * Identify queries where brand has no presence
 */
function identifyMissingKeywords(context: AnalysisContext): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = []

  // Group answers by query
  const answersByQuery = new Map<string, typeof context.answers>()
  context.answers.forEach(answer => {
    if (!answersByQuery.has(answer.queryId)) {
      answersByQuery.set(answer.queryId, [])
    }
    answersByQuery.get(answer.queryId)!.push(answer)
  })

  // Find queries with no presence
  context.queries.forEach(query => {
    const answers = answersByQuery.get(query.id) || []
    const hasPresence = answers.some(a => a.presence)

    if (!hasPresence && answers.length > 0) {
      // Check who IS appearing for this query
      const appearingCompetitors = new Set<string>()
      answers.forEach(answer => {
        if (answer.orderedEntities && Array.isArray(answer.orderedEntities)) {
          answer.orderedEntities.slice(0, 3).forEach(entity => {
            appearingCompetitors.add(`${entity.name} (${entity.domain})`)
          })
        }
      })

      const competitorList = Array.from(appearingCompetitors).slice(0, 3)

      // Build per-model breakdown
      const modelBreakdown = buildModelBreakdown(answers, context.runsBySurface)
      const affectedModels: ('openai' | 'claude')[] = []
      if (modelBreakdown.openai && !modelBreakdown.openai.presence) affectedModels.push('openai')
      if (modelBreakdown.claude && !modelBreakdown.claude.presence) affectedModels.push('claude')

      // Enhance description with model-specific info
      let description = `Your property is not mentioned in LLM responses for this ${query.type} query.`
      if (affectedModels.length === 1) {
        description += ` Issue affects ${affectedModels[0].toUpperCase()} only.`
      } else if (affectedModels.length === 2) {
        description += ` Issue affects both OpenAI and Claude.`
      }
      if (competitorList.length > 0) {
        description += ` Competitors appearing: ${competitorList.join(', ')}`
      }

      recommendations.push({
        id: `missing-${query.id}`,
        type: 'missing_keyword',
        priority: query.type === 'branded' ? 'high' : query.type === 'category' ? 'medium' : 'low',
        title: `No presence for: "${query.text}"`,
        description,
        keywords: [query.text],
        modelBreakdown: {
          ...modelBreakdown,
          affectedModels,
        },
        impact: {
          score: query.type === 'branded' ? 90 : query.type === 'category' ? 70 : 50,
          reason: query.type === 'branded' 
            ? 'Critical: Brand queries should always show your property'
            : 'Opportunity to capture search traffic',
        },
        actionItems: [
          `Create content targeting "${query.text}"`,
          `Optimize existing pages with this keyword`,
          `Build backlinks from authoritative sites`,
          query.geo ? `Focus content on ${query.geo} area` : 'Add geographic context',
        ],
        relatedQueries: [{ id: query.id, text: query.text, type: query.type }],
      })
    }
  })

  return recommendations
}

/**
 * Build per-model performance breakdown for a query
 */
function buildModelBreakdown(
  answers: AnalysisContext['answers'],
  runsBySurface: Map<string, 'openai' | 'claude'>
) {
  const openaiAnswer = answers.find(a => runsBySurface.get(a.runId) === 'openai')
  const claudeAnswer = answers.find(a => runsBySurface.get(a.runId) === 'claude')

  return {
    openai: openaiAnswer ? {
      presence: openaiAnswer.presence,
      rank: openaiAnswer.llmRank,
      sov: openaiAnswer.sov,
    } : null,
    claude: claudeAnswer ? {
      presence: claudeAnswer.presence,
      rank: claudeAnswer.llmRank,
      sov: claudeAnswer.sov,
    } : null,
  }
}

/**
 * Identify topics competitors cover that you don't
 */
function identifyContentGaps(context: AnalysisContext): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = []

  // Find queries where competitors rank higher
  const answersByQuery = new Map<string, typeof context.answers>()
  context.answers.forEach(answer => {
    if (!answersByQuery.has(answer.queryId)) {
      answersByQuery.set(answer.queryId, [])
    }
    answersByQuery.get(answer.queryId)!.push(answer)
  })

  context.queries.forEach(query => {
    const answers = answersByQuery.get(query.id) || []
    
    // Find where we rank vs competitors
    answers.forEach(answer => {
      if (answer.presence && answer.llmRank && answer.llmRank > 3) {
        // We're present but not in top 3
        const topCompetitors = answer.orderedEntities
          .slice(0, 3)
          .filter(e => e.position < answer.llmRank!)

        if (topCompetitors.length > 0) {
          const topComp = topCompetitors[0]
          const surface = context.runsBySurface.get(answer.runId)
          
          // Build model breakdown
          const modelBreakdown = buildModelBreakdown(answers, context.runsBySurface)
          const affectedModels: ('openai' | 'claude')[] = []
          if (modelBreakdown.openai && modelBreakdown.openai.rank && modelBreakdown.openai.rank > 3) {
            affectedModels.push('openai')
          }
          if (modelBreakdown.claude && modelBreakdown.claude.rank && modelBreakdown.claude.rank > 3) {
            affectedModels.push('claude')
          }

          let description = `You're mentioned but ${topComp.name} ranks higher (position #${topComp.position}). Reason: "${topComp.rationale}"`
          if (surface) {
            description += ` [${surface.toUpperCase()} issue]`
          }
          
          recommendations.push({
            id: `gap-${answer.id}`,
            type: 'content_gap',
            priority: answer.llmRank <= 5 ? 'medium' : 'low',
            title: `Ranking #${answer.llmRank} for: "${query.text}"`,
            description,
            keywords: [query.text],
            competitorContext: {
              competitorName: topComp.name,
              competitorDomain: topComp.domain,
              avgRank: topComp.position,
            },
            modelBreakdown: {
              ...modelBreakdown,
              affectedModels,
            },
            impact: {
              score: 60 - (answer.llmRank * 5), // Higher rank = lower impact
              reason: 'Improve ranking to increase visibility',
            },
            actionItems: [
              `Analyze ${topComp.domain} content strategy`,
              `Enhance content quality and depth`,
              `Add more specific details mentioned in competitor rationale`,
              `Improve on-page SEO for this keyword`,
            ],
            relatedQueries: [{ id: query.id, text: query.text, type: query.type }],
          })
        }
      }
    })
  })

  return recommendations
}

/**
 * Identify high-authority domains to target for backlinks
 */
function identifyCitationOpportunities(context: AnalysisContext): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = []

  // Track frequently cited domains that aren't brand domains
  const citationMap = new Map<string, { count: number; queries: Set<string> }>()

  context.answers.forEach(answer => {
    // Check if orderedEntities exists and is an array
    if (answer.orderedEntities && Array.isArray(answer.orderedEntities)) {
      answer.orderedEntities.forEach(entity => {
        const domain = entity.domain
        if (!citationMap.has(domain)) {
          citationMap.set(domain, { count: 0, queries: new Set() })
        }
        const data = citationMap.get(domain)!
        data.count++
        
        const query = context.queries.find(q => q.id === answer.queryId)
        if (query) {
          data.queries.add(query.text)
        }
      })
    }
  })

  // Find top cited domains (excluding top competitors)
  const topDomains = Array.from(citationMap.entries())
    .filter(([domain]) => !context.competitors.slice(0, 3).some(c => c.domain === domain))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)

  topDomains.forEach(([domain, data]) => {
    if (data.count >= 3) {
      recommendations.push({
        id: `citation-${domain}`,
        type: 'citation_opportunity',
        priority: 'medium',
        title: `Target ${domain} for citations`,
        description: `This domain appears ${data.count} times across multiple queries. Getting listed here could improve your GEO visibility.`,
        keywords: Array.from(data.queries).slice(0, 3),
        impact: {
          score: Math.min(75, 40 + data.count * 5),
          reason: 'High-authority domain frequently cited by LLMs',
        },
        actionItems: [
          `Research ${domain} submission process`,
          `Prepare property listing with optimized content`,
          `Ensure NAP (Name, Address, Phone) consistency`,
          `Add high-quality photos and descriptions`,
        ],
        relatedQueries: Array.from(data.queries).slice(0, 3).map(text => ({
          id: '',
          text,
          type: 'citation',
        })),
      })
    }
  })

  return recommendations
}

/**
 * Identify opportunities to improve existing rankings
 */
function identifyRankImprovements(context: AnalysisContext): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = []

  // Group by query and find trends
  const queryPerformance = new Map<string, { ranks: number[]; avgRank: number; answers: typeof context.answers }>()

  context.answers.forEach(answer => {
    if (answer.presence && answer.llmRank) {
      if (!queryPerformance.has(answer.queryId)) {
        queryPerformance.set(answer.queryId, { ranks: [], avgRank: 0, answers: [] })
      }
      const perf = queryPerformance.get(answer.queryId)!
      perf.ranks.push(answer.llmRank)
      perf.answers.push(answer)
    }
  })

  // Calculate averages
  queryPerformance.forEach((data, queryId) => {
    data.avgRank = data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length
  })

  // Find queries where we're close to top 3
  queryPerformance.forEach((data, queryId) => {
    if (data.avgRank > 3 && data.avgRank <= 7) {
      const query = context.queries.find(q => q.id === queryId)
      if (query) {
        // Build model breakdown
        const modelBreakdown = buildModelBreakdown(data.answers, context.runsBySurface)
        const affectedModels: ('openai' | 'claude')[] = []
        if (modelBreakdown.openai && modelBreakdown.openai.rank && modelBreakdown.openai.rank > 3) {
          affectedModels.push('openai')
        }
        if (modelBreakdown.claude && modelBreakdown.claude.rank && modelBreakdown.claude.rank > 3) {
          affectedModels.push('claude')
        }

        let description = `Currently averaging position #${data.avgRank.toFixed(1)}. Small improvements could push you into top 3.`
        if (affectedModels.length === 1) {
          description += ` Issue primarily on ${affectedModels[0].toUpperCase()}.`
        }

        recommendations.push({
          id: `improve-${queryId}`,
          type: 'rank_improvement',
          priority: 'high',
          title: `Improve rank for: "${query.text}"`,
          description,
          keywords: [query.text],
          modelBreakdown: {
            ...modelBreakdown,
            affectedModels,
          },
          impact: {
            score: 85,
            reason: 'Quick win: Already visible, just need slight optimization',
          },
          actionItems: [
            `Refresh content with recent updates`,
            `Add more comprehensive information`,
            `Improve internal linking to this page`,
            `Get 2-3 new backlinks from relevant sites`,
          ],
          relatedQueries: [{ id: query.id, text: query.text, type: query.type }],
        })
      }
    }
  })

  return recommendations
}

/**
 * Identify voice/conversational search opportunities
 */
function identifyVoiceSearchOpportunities(context: AnalysisContext): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = []

  // FAQ queries are prime for voice search optimization
  const faqQueries = context.queries.filter(q => q.type === 'faq')

  faqQueries.forEach(query => {
    const answers = context.answers.filter(a => a.queryId === query.id)
    const hasPresence = answers.some(a => a.presence)

    if (!hasPresence) {
      recommendations.push({
        id: `voice-${query.id}`,
        type: 'voice_search',
        priority: 'low',
        title: `Voice search opportunity: "${query.text}"`,
        description: `This question-format query is ideal for voice search. Creating FAQ content could capture voice assistant queries.`,
        keywords: [query.text],
        impact: {
          score: 55,
          reason: 'Growing segment: Voice search adoption increasing',
        },
        actionItems: [
          `Create FAQ page with this question`,
          `Use natural, conversational language`,
          `Provide concise, direct answer (2-3 sentences)`,
          `Add schema markup for FAQ structured data`,
        ],
        relatedQueries: [{ id: query.id, text: query.text, type: query.type }],
      })
    }
  })

  return recommendations
}

/**
 * Generate maintenance recommendations when performance is excellent
 * Provides proactive suggestions to maintain dominance
 */
function generateMaintenanceRecommendations(context: AnalysisContext): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = []

  // Calculate overall performance
  const answersByQuery = new Map<string, typeof context.answers>()
  context.answers.forEach(answer => {
    if (!answersByQuery.has(answer.queryId)) {
      answersByQuery.set(answer.queryId, [])
    }
    answersByQuery.get(answer.queryId)!.push(answer)
  })

  const presenceCount = context.queries.filter(q => {
    const answers = answersByQuery.get(q.id) || []
    return answers.some(a => a.presence)
  }).length

  const visibilityPct = context.queries.length > 0 
    ? (presenceCount / context.queries.length) * 100 
    : 0

  // If visibility is excellent (>80%), provide maintenance recommendations
  if (visibilityPct >= 80) {
    recommendations.push({
      id: 'maintain-excellence',
      type: 'rank_improvement',
      priority: 'low',
      title: `Excellent GEO Performance (${visibilityPct.toFixed(0)}% visibility)`,
      description: `You're ranking #1 on ${presenceCount} out of ${context.queries.length} queries. Focus on maintaining this dominance and expanding to new query opportunities.`,
      keywords: [],
      impact: {
        score: 40,
        reason: 'Maintain current excellent performance',
      },
      actionItems: [
        'Monitor competitor activity weekly - defend your rankings',
        'Refresh content quarterly to stay current',
        'Expand query coverage to new amenity combinations',
        'Build more backlinks to maintain authority',
        'Update property information when features change',
      ],
      relatedQueries: context.queries.slice(0, 3).map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
      })),
    })

    // Suggest expanding query coverage
    recommendations.push({
      id: 'expand-coverage',
      type: 'missing_keyword',
      priority: 'low',
      title: 'Expand Query Coverage',
      description: 'Consider adding more specific queries targeting niche amenities, lifestyle personas, or micro-locations to capture additional search traffic.',
      keywords: ['expansion opportunity'],
      impact: {
        score: 45,
        reason: 'Capture additional search segments',
      },
      actionItems: [
        'Add queries for unique property features not yet tracked',
        'Target specific demographic personas (young professionals, families, etc.)',
        'Create queries for nearby landmarks or employers',
        'Add seasonal amenity queries (heated pool, fire pits, etc.)',
      ],
      relatedQueries: [],
    })
  }

  // Always recommend citation building
  if (context.competitors.length > 0) {
    const topCompetitor = context.competitors[0]
    
    recommendations.push({
      id: 'build-citations',
      type: 'citation_opportunity',
      priority: 'low',
      title: 'Continue Building Authority',
      description: `While you're ranking well, building more citations on high-authority domains will strengthen your position against competitors like ${topCompetitor.name}.`,
      keywords: [],
      competitorContext: {
        competitorName: topCompetitor.name,
        competitorDomain: topCompetitor.domain,
        avgRank: topCompetitor.avgRank,
      },
      impact: {
        score: 50,
        reason: 'Strengthen position defensively',
      },
      actionItems: [
        'Submit to apartment directory sites (ApartmentList, ForRent.com)',
        'Get featured in local San Diego real estate publications',
        'Build partnerships with local businesses for cross-promotion',
        'Encourage resident reviews on multiple platforms',
      ],
      relatedQueries: [],
    })
  }

  return recommendations
}

function generateSummary(recommendations: ContentRecommendation[]): RecommendationSummary {
  return {
    totalRecommendations: recommendations.length,
    highPriority: recommendations.filter(r => r.priority === 'high').length,
    mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
    lowPriority: recommendations.filter(r => r.priority === 'low').length,
    categories: {
      missingKeywords: recommendations.filter(r => r.type === 'missing_keyword').length,
      contentGaps: recommendations.filter(r => r.type === 'content_gap').length,
      citationOpportunities: recommendations.filter(r => r.type === 'citation_opportunity').length,
      rankImprovement: recommendations.filter(r => r.type === 'rank_improvement').length,
      voiceSearch: recommendations.filter(r => r.type === 'voice_search').length,
    },
  }
}
