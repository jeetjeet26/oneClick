/**
 * LeadPulse Score API
 * Calculate and retrieve lead scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'

export interface LeadScore {
  id: string
  leadId: string
  totalScore: number
  engagementScore: number
  timingScore: number
  sourceScore: number
  completenessScore: number
  behaviorScore: number
  scoreBucket: 'hot' | 'warm' | 'cold' | 'unqualified'
  factors: ScoreFactor[]
  scoredAt: string
  modelVersion: string
}

export interface ScoreFactor {
  factor: string
  impact: string
  type: 'positive' | 'negative' | 'neutral'
}

// GET: Retrieve score for a lead
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    // Get latest score for this lead
    const { data: score, error } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('lead_id', leadId)
      .order('scored_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching score:', error)
      return NextResponse.json({ error: 'Failed to fetch score' }, { status: 500 })
    }

    if (!score) {
      // No existing score, calculate one
      const serviceClient = createServiceClient()
      
      const { data: newScoreId, error: scoreError } = await serviceClient
        .rpc('score_lead', { p_lead_id: leadId })

      if (scoreError) {
        console.error('Error calculating score:', scoreError)
        return NextResponse.json({ error: 'Failed to calculate score' }, { status: 500 })
      }

      // Fetch the newly created score
      const { data: newScore, error: fetchError } = await serviceClient
        .from('lead_scores')
        .select('*')
        .eq('id', newScoreId)
        .single()

      if (fetchError || !newScore) {
        return NextResponse.json({ error: 'Failed to retrieve calculated score' }, { status: 500 })
      }

      return NextResponse.json({
        score: formatScore(newScore),
        isNew: true,
      })
    }

    return NextResponse.json({
      score: formatScore(score),
      isNew: false,
    })
  } catch (error) {
    console.error('LeadPulse Score GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Recalculate score for a lead (or batch)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { leadId, leadIds, propertyId } = body

    const serviceClient = createServiceClient()

    // Single lead scoring
    if (leadId) {
      const { data: scoreId, error } = await serviceClient
        .rpc('score_lead', { p_lead_id: leadId })

      if (error) {
        console.error('Error scoring lead:', error)
        return NextResponse.json({ error: 'Failed to score lead' }, { status: 500 })
      }

      // Fetch the score
      const { data: score } = await serviceClient
        .from('lead_scores')
        .select('*')
        .eq('id', scoreId)
        .single()

      return NextResponse.json({
        success: true,
        score: score ? formatScore(score) : null,
      })
    }

    // Batch scoring
    if (leadIds && Array.isArray(leadIds)) {
      const results = await Promise.allSettled(
        leadIds.map(async (id: string) => {
          const { data: scoreId, error } = await serviceClient
            .rpc('score_lead', { p_lead_id: id })
          return { leadId: id, scoreId, error }
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      return NextResponse.json({
        success: true,
        processed: leadIds.length,
        successful,
        failed,
      })
    }

    // Score all leads for a property
    if (propertyId) {
      // Get all leads for property
      const { data: leads, error: leadsError } = await serviceClient
        .from('leads')
        .select('id')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(500) // Safety limit

      if (leadsError) {
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
      }

      const results = await Promise.allSettled(
        leads.map(async (lead) => {
          const { data: scoreId, error } = await serviceClient
            .rpc('score_lead', { p_lead_id: lead.id })
          return { leadId: lead.id, scoreId, error }
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length

      return NextResponse.json({
        success: true,
        processed: leads.length,
        successful,
        failed: leads.length - successful,
      })
    }

    return NextResponse.json({ error: 'leadId, leadIds, or propertyId required' }, { status: 400 })
  } catch (error) {
    console.error('LeadPulse Score POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Format score for API response
function formatScore(score: Record<string, unknown>): LeadScore {
  return {
    id: score.id as string,
    leadId: score.lead_id as string,
    totalScore: score.total_score as number,
    engagementScore: score.engagement_score as number,
    timingScore: score.timing_score as number,
    sourceScore: score.source_score as number,
    completenessScore: score.completeness_score as number,
    behaviorScore: score.behavior_score as number,
    scoreBucket: score.score_bucket as 'hot' | 'warm' | 'cold' | 'unqualified',
    factors: (score.factors as ScoreFactor[]) || [],
    scoredAt: score.scored_at as string,
    modelVersion: score.model_version as string,
  }
}

















