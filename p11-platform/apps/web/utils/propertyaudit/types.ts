/**
 * PropertyAudit Types
 * Shared types for GEO audit functionality
 */

import { z } from 'zod'

// ============================================================================
// Answer Block Schema (Structured output from LLMs)
// ============================================================================

export const AnswerEntitySchema = z.object({
  name: z.string().min(1),
  domain: z.string(), // Can be empty for entities without known domains
  rationale: z.string().min(1),
  position: z.number().int().min(1)
})

export const AnswerCitationSchema = z.object({
  url: z.string().min(1),
  domain: z.string().min(1),
  entity_ref: z.string() // Required by OpenAI strict schema, can be empty
})

export const AnswerBlockSchema = z.object({
  ordered_entities: z.array(AnswerEntitySchema),
  citations: z.array(AnswerCitationSchema),
  answer_summary: z.string(),
  notes: z
    .object({
      flags: z
        .array(
          z.enum([
            'no_sources',
            'possible_hallucination',
            'outdated_info',
            'nap_mismatch',
            'conflicting_prices'
          ])
        )
        .default([])
    })
    .default({ flags: [] })
})

export type AnswerEntity = z.infer<typeof AnswerEntitySchema>
export type AnswerCitation = z.infer<typeof AnswerCitationSchema>
export type AnswerBlock = z.infer<typeof AnswerBlockSchema>
export type AnswerFlag = AnswerBlock['notes']['flags'][number]

// ============================================================================
// Connector Types
// ============================================================================

export type Surface = 'openai' | 'claude'

export type QueryType = 'branded' | 'category' | 'comparison' | 'local' | 'faq' | 'voice_search'

export interface ConnectorContext {
  queryId: string
  queryText: string
  brandName: string
  brandDomains: string[]
  competitors: string[]
  propertyLocation?: {
    city: string
    state: string
    fullAddress: string
    websiteUrl: string
  }
}

export interface ConnectorResult {
  answer: AnswerBlock
  raw: unknown
}

export interface Connector {
  surface: Surface
  invoke(context: ConnectorContext): Promise<ConnectorResult>
}

// ============================================================================
// Natural two-phase (consumer-like response + analyzer extraction)
// ============================================================================

export type GeoAuditMode = 'structured' | 'natural'

/** Web search result from SerpAPI or similar */
export interface WebSearchSource {
  title: string
  url: string
  domain: string
  snippet: string
}

export interface NaturalResponse {
  text: string
  model: string
  tokensUsed: number
  usedWebSearch: boolean
  /** Web search sources used to inform the response */
  searchSources: WebSearchSource[]
  rawResponse: unknown
}

export const NaturalEntitySchema = z.object({
  name: z.string().min(1),
  domain: z.string(), // Can be empty for entities without known domains
  position: z.number().int().min(1),
  prominence: z.string(), // Accept any value (primary, secondary, mentioned, tertiary, etc.)
  mention_count: z.number().int().min(0),
  first_mention_quote: z.string().min(1)
})

export const NaturalCitationSchema = z.object({
  url: z.string().min(1),
  domain: z.string().min(1),
  citation_type: z.enum(['explicit', 'inferred'])
})

export const NaturalBrandAnalysisSchema = z.object({
  mentioned: z.boolean(),
  position: z.number().int().min(1).nullable(),
  location_stated: z.string().nullable(),
  location_correct: z.boolean().nullable(), // Can be null if location unknown
  prominence: z.string().nullable() // Can be null if brand not mentioned
})

export const NaturalAnalysisSchema = z.object({
  ordered_entities: z.array(NaturalEntitySchema).default([]),
  citations: z.array(NaturalCitationSchema).default([]),
  brand_analysis: NaturalBrandAnalysisSchema,
  extraction_confidence: z.number().min(0).max(100)
})

export type NaturalAnalysis = z.infer<typeof NaturalAnalysisSchema>

export const NaturalExtractionEnvelopeSchema = z.object({
  answer_block: AnswerBlockSchema,
  analysis: NaturalAnalysisSchema
})

export type NaturalExtractionEnvelope = z.infer<typeof NaturalExtractionEnvelopeSchema>

export interface NaturalAnalyzeContext {
  naturalResponse: string
  brandName: string
  queryText: string
  expectedCity?: string
  expectedState?: string
  brandDomains: string[]
  competitors: string[]
}

export interface NaturalAnalyzeResult {
  envelope: NaturalExtractionEnvelope
  raw: unknown
}

export interface NaturalConnector {
  surface: Surface
  getNaturalResponse(query: string): Promise<NaturalResponse>
  analyzeResponse(context: NaturalAnalyzeContext): Promise<NaturalAnalyzeResult>
}

// ============================================================================
// Evaluation Types
// ============================================================================

export interface EvaluationContext {
  brandName: string
  brandDomains: string[]
  competitors: string[]
}

export interface EvaluatedAnswer {
  presence: boolean
  llmRank: number | null
  linkRank: number | null
  sov: number | null
  flags: AnswerFlag[]
}

export interface ScoreBreakdown {
  position: number
  link: number
  sov: number
  accuracy: number
}

export interface ScoredAnswer extends EvaluatedAnswer {
  score: number
  breakdown: ScoreBreakdown
}

export interface AggregateScores {
  overallScore: number
  visibilityPct: number
  avgLlmRank: number | null
  avgLinkRank: number | null
  avgSov: number | null
}

// ============================================================================
// Config
// ============================================================================

export interface GeoConfig {
  openaiApiKey: string
  anthropicApiKey: string
  openaiModel: string
  claudeModel: string
  temperature: number
  topP: number
  seed: number
  batchSize: number
}

export function getGeoConfig(): GeoConfig {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiModel: process.env.GEO_OPENAI_MODEL || 'gpt-5.2',
    claudeModel: process.env.GEO_CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    temperature: parseFloat(process.env.GEO_TEMPERATURE || '0'),
    topP: parseFloat(process.env.GEO_TOP_P || '1'),
    seed: parseInt(process.env.GEO_SEED || '42'),
    batchSize: parseInt(process.env.GEO_RUN_BATCH_SIZE || '40'),
  }
}

