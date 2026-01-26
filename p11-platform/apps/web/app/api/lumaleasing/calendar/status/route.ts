/**
 * Google Calendar Status API
 * Returns calendar connection status for a property
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID required' },
        { status: 400 }
      )
    }

    // Verify user has access to this property
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get calendar status
    const serviceSupabase = createServiceClient()
    const { data: calendar, error } = await serviceSupabase
      .from('agent_calendars')
      .select('google_email, token_status, last_health_check_at, token_expires_at, timezone')
      .eq('property_id', propertyId)
      .eq('sync_enabled', true)
      .single()

    if (error || !calendar) {
      return NextResponse.json({
        connected: false,
        message: 'Google Calendar not connected',
      })
    }

    return NextResponse.json({
      connected: true,
      email: calendar.google_email,
      status: calendar.token_status,
      lastCheck: calendar.last_health_check_at,
      expiresAt: calendar.token_expires_at,
      timezone: calendar.timezone,
    })

  } catch (error) {
    console.error('[CalendarStatus] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get calendar status' },
      { status: 500 }
    )
  }
}
