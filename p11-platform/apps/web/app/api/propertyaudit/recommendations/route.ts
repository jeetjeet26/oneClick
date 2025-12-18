/**
 * PropertyAudit Recommendations API
 * Generate actionable content suggestions from GEO data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateRecommendations } from '@/utils/propertyaudit/recommendation-engine'

// GET: Generate recommendations for a property
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')
    const runId = searchParams.get('runId') || undefined

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId required' }, { status: 400 })
    }

    // Verify user has access to this property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, org_id')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Verify user belongs to the same org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.org_id !== property.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate recommendations
    const { recommendations, summary } = await generateRecommendations(propertyId, runId)

    return NextResponse.json({
      recommendations,
      summary,
      propertyId,
      runId: runId || null,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('PropertyAudit Recommendations Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
