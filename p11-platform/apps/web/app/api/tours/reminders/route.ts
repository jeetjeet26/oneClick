/**
 * Tour Reminders API Route
 * POST - Process pending tour reminders (called by CRON)
 * GET - Get pending reminder counts (for dashboard)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { processTourReminders, getPendingRemindersCount } from '@/utils/services/tour-reminders'

// Verify CRON secret for automated calls
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  
  // If no CRON_SECRET is set, allow all requests (development mode)
  if (!cronSecret) {
    console.warn('[TourReminders] CRON_SECRET not configured - allowing request')
    return true
  }
  
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  
  // Also check x-cron-secret header (common pattern)
  const cronHeader = request.headers.get('x-cron-secret')
  return cronHeader === cronSecret
}

/**
 * POST - Process all pending tour reminders
 * Called by CRON job every 15-30 minutes
 */
export async function POST(request: NextRequest) {
  // Verify this is a legitimate CRON request
  if (!verifyCronSecret(request)) {
    console.error('[TourReminders] Unauthorized CRON attempt')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    console.log('[TourReminders] Starting reminder processing...')
    const startTime = Date.now()
    
    const result = await processTourReminders()
    
    const duration = Date.now() - startTime
    console.log(`[TourReminders] Completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[TourReminders] Error processing reminders:', error)
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
 * GET - Get count of pending reminders
 * Used by dashboard to show upcoming reminder notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Optionally verify auth for dashboard access
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

    const counts = await getPendingRemindersCount()

    return NextResponse.json({
      success: true,
      pending: counts,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[TourReminders] Error getting pending counts:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

