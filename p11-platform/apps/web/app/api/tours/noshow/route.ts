/**
 * Tour No-Show Processing API Route
 * POST - Process no-shows and send follow-ups (called by CRON)
 * GET - Get no-show statistics for a property
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { processTourNoShows, getNoShowStats } from '@/utils/services/tour-noshow'

// Verify CRON secret for automated calls
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  
  // If no CRON_SECRET is set, allow all requests (development mode)
  if (!cronSecret) {
    console.warn('[TourNoShow] CRON_SECRET not configured - allowing request')
    return true
  }
  
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  
  // Also check x-cron-secret header
  const cronHeader = request.headers.get('x-cron-secret')
  return cronHeader === cronSecret
}

/**
 * POST - Process tour no-shows and send follow-up messages
 * Called by CRON job hourly
 */
export async function POST(request: NextRequest) {
  // Verify this is a legitimate CRON request
  if (!verifyCronSecret(request)) {
    console.error('[TourNoShow] Unauthorized CRON attempt')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    console.log('[TourNoShow] Starting no-show processing...')
    const startTime = Date.now()
    
    const result = await processTourNoShows()
    
    const duration = Date.now() - startTime
    console.log(`[TourNoShow] Completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[TourNoShow] Error processing no-shows:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Get no-show statistics for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Allow unauthenticated for CRON health checks
    const isCronRequest = verifyCronSecret(request)
    
    if (!user && !isCronRequest) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get property ID from query params
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      )
    }

    const stats = await getNoShowStats(propertyId)

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[TourNoShow] Error getting stats:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

