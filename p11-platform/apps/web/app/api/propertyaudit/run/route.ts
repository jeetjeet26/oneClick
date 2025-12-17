/**
 * PropertyAudit Run API
 * Trigger and manage GEO audit runs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'

export interface GeoRun {
  id: string
  propertyId: string
  surface: 'openai' | 'claude'
  modelName: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  queryCount: number
  startedAt: string
  finishedAt: string | null
  errorMessage: string | null
}

// POST: Trigger a new GEO audit run
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { propertyId, surfaces = ['openai', 'claude'] } = body

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId required' }, { status: 400 })
    }

    const serviceClient = createServiceClient()

    // Get query count for this property
    const { count: queryCount } = await serviceClient
      .from('geo_queries')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .eq('is_active', true)

    if (!queryCount || queryCount === 0) {
      return NextResponse.json({ 
        error: 'No active queries found. Generate a query panel first.',
        code: 'NO_QUERIES'
      }, { status: 400 })
    }

    // Create runs for each surface
    const runs: GeoRun[] = []
    const modelNames = {
      openai: process.env.GEO_OPENAI_MODEL || 'gpt-5.2',
      claude: process.env.GEO_CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    }

    for (const surface of surfaces) {
      if (surface !== 'openai' && surface !== 'claude') continue

      const { data: run, error: runError } = await serviceClient
        .from('geo_runs')
        .insert({
          property_id: propertyId,
          surface,
          model_name: modelNames[surface],
          status: 'queued',
          query_count: queryCount,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (runError) {
        console.error(`Error creating ${surface} run:`, runError)
        continue
      }

      runs.push(formatRun(run))
    }

    if (runs.length === 0) {
      return NextResponse.json({ error: 'Failed to create runs' }, { status: 500 })
    }

    // Trigger processing for each run (fire and forget)
    const baseUrl = req.nextUrl.origin
    for (const run of runs) {
      fetch(`${baseUrl}/api/propertyaudit/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: run.id }),
      }).catch(err => console.error(`Failed to trigger processing for run ${run.id}:`, err))
    }

    return NextResponse.json({
      success: true,
      runs,
      message: `Created ${runs.length} run(s) for ${queryCount} queries. Processing started.`,
    })
  } catch (error) {
    console.error('PropertyAudit Run POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update run status (used by processor)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { runId, status, errorMessage } = body

    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    
    if (status) {
      updateData.status = status
      if (status === 'completed' || status === 'failed') {
        updateData.finished_at = new Date().toISOString()
      }
    }

    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage
    }

    const serviceClient = createServiceClient()
    const { data: run, error } = await serviceClient
      .from('geo_runs')
      .update(updateData)
      .eq('id', runId)
      .select()
      .single()

    if (error) {
      console.error('Error updating run:', error)
      return NextResponse.json({ error: 'Failed to update run' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      run: formatRun(run),
    })
  } catch (error) {
    console.error('PropertyAudit Run PATCH Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Format run for API response
function formatRun(run: Record<string, unknown>): GeoRun {
  return {
    id: run.id as string,
    propertyId: run.property_id as string,
    surface: run.surface as 'openai' | 'claude',
    modelName: run.model_name as string,
    status: run.status as GeoRun['status'],
    queryCount: run.query_count as number,
    startedAt: run.started_at as string,
    finishedAt: run.finished_at as string | null,
    errorMessage: run.error_message as string | null,
  }
}
