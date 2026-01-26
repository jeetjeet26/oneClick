/**
 * PropertyAudit Run Purge API
 * Delete run history for a property (runs + cascaded answers/citations/scores)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { propertyId, surfaces } = body as {
      propertyId?: string
      surfaces?: Array<'openai' | 'claude'>
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId required' }, { status: 400 })
    }

    // Authorize via RLS: user must be able to view the property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const service = createServiceClient()

    let del = service.from('geo_runs').delete().eq('property_id', propertyId)
    if (Array.isArray(surfaces) && surfaces.length > 0) {
      del = del.in('surface', surfaces)
    }

    const { error: deleteError } = await del

    if (deleteError) {
      console.error('Error purging run history:', deleteError)
      return NextResponse.json({ error: 'Failed to purge run history' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      propertyId,
      surfaces: Array.isArray(surfaces) && surfaces.length > 0 ? surfaces : 'all',
    })
  } catch (error) {
    console.error('PropertyAudit Purge Runs Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}










