/**
 * Claude Connector for PropertyAudit
 * Uses Anthropic API for GEO audits
 */

import Anthropic from '@anthropic-ai/sdk'
import { 
  AnswerBlockSchema, 
  type AnswerBlock, 
  type Connector, 
  type ConnectorContext, 
  type ConnectorResult,
  getGeoConfig 
} from './types'

function buildPrompt(context: ConnectorContext): string {
  const domains = context.brandDomains.join(', ')
  const competitors = context.competitors.join(', ')
  return [
    `Task: Perform a GEO audit for the following query and return ONLY valid JSON matching the exact schema.`,
    `Query: ${context.queryText}`,
    `Brand: ${context.brandName}`,
    `Brand domains: ${domains || '—'}`,
    `Competitors: ${competitors || '—'}`,
    ``,
    `Requirements:`,
    `- Produce an ordered list of providers/brands relevant to the query (name, domain, rationale, position starting at 1).`,
    `- Include citations with absolute URLs and their domains.`,
    `- Summarize the answer in 1-2 sentences.`,
    `- If no grounded sources are available, set notes.flags to include "no_sources".`,
    ``,
    `Output format - Return ONLY raw JSON (no markdown code blocks, no explanations, no text before or after):`,
    `{`,
    `  "ordered_entities": [`,
    `    {"name": "...", "domain": "...", "rationale": "...", "position": 1}`,
    `  ],`,
    `  "citations": [`,
    `    {"url": "...", "domain": "...", "entity_ref": "1"}`,
    `  ],`,
    `  "answer_summary": "...",`,
    `  "notes": {"flags": []}`,
    `}`
  ].join('\n')
}

function tryParseJson(content: string): unknown {
  // First, try direct JSON parse
  try {
    return JSON.parse(content)
  } catch {
    // Continue to fallbacks
  }

  // Strip markdown code blocks
  let cleaned = content.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '')
  cleaned = cleaned.replace(/\n?```\s*$/i, '')
  cleaned = cleaned.trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue to fallbacks
  }

  // Extract JSON object from text
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(jsonCandidate)
    } catch {
      // Continue to fallbacks
    }
  }

  // Fallback: regex match from end
  const match = content.match(/\{[\s\S]*\}$/)
  if (match) {
    try {
      return JSON.parse(match[0])
    } catch {
      // All parsing attempts failed
    }
  }

  return null
}

function coerceToAnswerBlock(candidate: unknown): AnswerBlock | null {
  const direct = AnswerBlockSchema.safeParse(candidate)
  if (direct.success) {
    return direct.data
  }

  if (!candidate || typeof candidate !== 'object') {
    return null
  }

  const obj = candidate as Record<string, unknown>

  // Try to extract ordered_entities from various formats
  const entitiesSource = Array.isArray(obj.ordered_entities)
    ? obj.ordered_entities
    : Array.isArray(obj.results)
    ? obj.results
    : Array.isArray(obj.providers)
    ? obj.providers
    : null

  const orderedEntities: AnswerBlock['ordered_entities'] = []
  
  if (entitiesSource) {
    for (let i = 0; i < entitiesSource.length; i++) {
      const item = entitiesSource[i]
      if (!item || typeof item !== 'object') continue
      
      const ent = item as Record<string, unknown>
      const name = typeof ent.name === 'string' ? ent.name : null
      const domain = typeof ent.domain === 'string' ? ent.domain : null
      
      if (!name || !domain) continue
      
      orderedEntities.push({
        name,
        domain,
        rationale: typeof ent.rationale === 'string' ? ent.rationale : 'No rationale provided.',
        position: typeof ent.position === 'number' ? ent.position : i + 1
      })
    }
  }

  // Extract citations
  const citations: AnswerBlock['citations'] = []
  
  if (Array.isArray(obj.citations)) {
    for (const c of obj.citations) {
      if (!c || typeof c !== 'object') continue
      const cit = c as Record<string, unknown>
      const url = typeof cit.url === 'string' ? cit.url : null
      const domain = typeof cit.domain === 'string' ? cit.domain : null
      if (!url || !domain) continue
      citations.push({
        url,
        domain,
        entity_ref: typeof cit.entity_ref === 'string' ? cit.entity_ref : undefined
      })
    }
  }

  // Extract summary
  const summary = typeof obj.answer_summary === 'string'
    ? obj.answer_summary
    : typeof obj.summary === 'string'
    ? obj.summary
    : 'No summary provided.'

  // Extract flags
  const notesObj = obj.notes as Record<string, unknown> | undefined
  const flagsRaw = Array.isArray(notesObj?.flags) ? notesObj.flags : []
  const allowedFlags = new Set([
    'no_sources',
    'possible_hallucination',
    'outdated_info',
    'nap_mismatch',
    'conflicting_prices'
  ])
  const flags = flagsRaw.filter((f): f is string => 
    typeof f === 'string' && allowedFlags.has(f)
  ) as AnswerBlock['notes']['flags']

  const normalized = {
    ordered_entities: orderedEntities,
    citations,
    answer_summary: summary,
    notes: { flags }
  }

  const validated = AnswerBlockSchema.safeParse(normalized)
  return validated.success ? validated.data : null
}

export class ClaudeConnector implements Connector {
  surface = 'claude' as const

  async invoke(context: ConnectorContext): Promise<ConnectorResult> {
    const config = getGeoConfig()
    const client = new Anthropic({ apiKey: config.anthropicApiKey })
    const prompt = buildPrompt(context)

    console.log('[claude] Query:', context.queryText)
    console.log('[claude] Brand:', context.brandName)

    let raw: unknown = null
    let parsed: AnswerBlock | null = null

    try {
      const response = await client.messages.create({
        model: config.claudeModel,
        max_tokens: 1200,
        temperature: config.temperature,
        system: 'You are a precise GEO audit assistant. You must output ONLY valid JSON without any markdown formatting, code blocks, or explanatory text. Return raw JSON that can be directly parsed.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      raw = response

      const textBlocks = (response.content ?? []).filter(
        (b): b is Anthropic.TextBlock => b.type === 'text'
      )
      const contentText = textBlocks.map(b => b.text).join('\n')

      const jsonValue = tryParseJson(contentText)
      if (jsonValue) {
        parsed = coerceToAnswerBlock(jsonValue)
        if (parsed) {
          console.log('[claude] ✓ Parsed', parsed.ordered_entities.length, 'entities,', parsed.citations.length, 'citations')
        }
      }
    } catch (error) {
      console.error('[claude] API error:', error)
      raw = { error: error instanceof Error ? error.message : String(error) }
    }

    if (!parsed) {
      console.warn('[claude] Returning fallback answer')
      return {
        answer: {
          ordered_entities: [],
          citations: [],
          answer_summary: 'No structured sources returned',
          notes: { flags: ['no_sources'] }
        },
        raw
      }
    }

    return { answer: parsed, raw }
  }
}
