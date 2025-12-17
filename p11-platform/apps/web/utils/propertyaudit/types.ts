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
  domain: z.string().min(1),
  rationale: z.string().min(1),
  position: z.number().int().min(1)
})

export const AnswerCitationSchema = z.object({
  url: z.string().url(),
  domain: z.string().min(1),
  entity_ref: z.string().optional()
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

export interface ConnectorContext {
  queryId: string
  queryText: string
  brandName: string
  brandDomains: string[]
  competitors: string[]
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
