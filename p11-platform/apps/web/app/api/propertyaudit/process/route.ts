/**
 * PropertyAudit Process API
 * Executes GEO audit runs by calling LLM connectors
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { OpenAIConnector } from '@/utils/propertyaudit/openai-connector'
import { ClaudeConnector } from '@/utils/propertyaudit/claude-connector'
import { scoreAnswer, aggregateScores, type ConnectorContext, type ScoredAnswer } from '@/utils/propertyaudit'

// POST: Process a queued run
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { runId } = body

    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get the run
    const { data: run, error: runError } = await supabase
      .from('geo_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    if (run.status !== 'queued') {
      return NextResponse.json({ error: 'Run is not in queued state' }, { status: 400 })
    }

    // Update status to running
    await supabase
      .from('geo_runs')
      .update({ status: 'running' })
      .eq('id', runId)

    // Get queries for the property
    const { data: queries, error: queriesError } = await supabase
      .from('geo_queries')
      .select('*')
      .eq('property_id', run.property_id)
      .eq('is_active', true)

    if (queriesError || !queries || queries.length === 0) {
      await supabase
        .from('geo_runs')
        .update({ 
          status: 'failed', 
          error_message: 'No active queries found',
          finished_at: new Date().toISOString()
        })
        .eq('id', runId)
      return NextResponse.json({ error: 'No active queries found' }, { status: 400 })
    }

    // Get property for brand context
    const { data: property } = await supabase
      .from('properties')
      .select('name, website, domain')
      .eq('id', run.property_id)
      .single()

    // Get property config for domains
    const { data: config } = await supabase
      .from('geo_property_config')
      .select('domains, competitor_domains')
      .eq('property_id', run.property_id)
      .single()

    // Build brand context
    const brandName = property?.name || 'Property'
    const brandDomains = config?.domains || (property?.website ? [property.website] : [])
    const competitors = config?.competitor_domains || []

    // Get connector
    const connector = run.surface === 'openai' 
      ? new OpenAIConnector() 
      : new ClaudeConnector()

    const results: ScoredAnswer[] = []
    const errors: string[] = []

    // Process each query
    for (const query of queries) {
      try {
        const context: ConnectorContext = {
          queryId: query.id,
          queryText: query.text,
          brandName,
          brandDomains,
          competitors
        }

        const { answer, raw } = await connector.invoke(context)

        // Score the answer
        const scoredAnswer = scoreAnswer(answer, {
          brandName,
          brandDomains,
          competitors
        })

        results.push(scoredAnswer)

        // Insert answer
        const { data: insertedAnswer, error: answerError } = await supabase
          .from('geo_answers')
          .insert({
            run_id: runId,
            query_id: query.id,
            presence: scoredAnswer.presence,
            llm_rank: scoredAnswer.llmRank,
            link_rank: scoredAnswer.linkRank,
            sov: scoredAnswer.sov,
            flags: scoredAnswer.flags,
            answer_summary: answer.answer_summary,
            ordered_entities: answer.ordered_entities,
            raw_json: raw
          })
          .select()
          .single()

        if (answerError) {
          console.error('Error inserting answer:', answerError)
          continue
        }

        // Insert citations
        if (answer.citations.length > 0) {
          const citationsToInsert = answer.citations.map(citation => ({
            answer_id: insertedAnswer.id,
            url: citation.url,
            domain: citation.domain,
            is_brand_domain: brandDomains.some(bd => 
              citation.domain.includes(bd.replace(/^www\./, ''))
            ),
            entity_ref: citation.entity_ref || null
          }))

          await supabase
            .from('geo_citations')
            .insert(citationsToInsert)
        }
      } catch (error) {
        console.error(`Error processing query ${query.id}:`, error)
        errors.push(`Query ${query.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Calculate aggregate scores
    const aggregate = aggregateScores(results)

    // Build score breakdown from results
    const breakdownTotals = results.reduce((acc, r) => ({
      position: acc.position + (r.breakdown?.position || 0),
      link: acc.link + (r.breakdown?.link || 0),
      sov: acc.sov + (r.breakdown?.sov || 0),
      accuracy: acc.accuracy + (r.breakdown?.accuracy || 0)
    }), { position: 0, link: 0, sov: 0, accuracy: 0 })

    const breakdown = results.length > 0 ? {
      position: breakdownTotals.position / results.length,
      link: breakdownTotals.link / results.length,
      sov: breakdownTotals.sov / results.length,
      accuracy: breakdownTotals.accuracy / results.length
    } : { position: 0, link: 0, sov: 0, accuracy: 0 }

    // Insert score
    await supabase
      .from('geo_scores')
      .insert({
        run_id: runId,
        overall_score: aggregate.overallScore,
        visibility_pct: aggregate.visibilityPct,
        avg_llm_rank: aggregate.avgLlmRank,
        avg_link_rank: aggregate.avgLinkRank,
        avg_sov: aggregate.avgSov,
        breakdown,
        query_scores: results.map(r => ({
          score: r.score,
          presence: r.presence,
          breakdown: r.breakdown
        }))
      })

    // Update run status
    const finalStatus = errors.length > 0 && results.length === 0 ? 'failed' : 'completed'
    await supabase
      .from('geo_runs')
      .update({
        status: finalStatus,
        finished_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join('; ') : null
      })
      .eq('id', runId)

    return NextResponse.json({
      success: true,
      runId,
      processed: results.length,
      errors: errors.length,
      score: aggregate.overallScore,
      visibility: aggregate.visibilityPct
    })
  } catch (error) {
    console.error('PropertyAudit Process Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
