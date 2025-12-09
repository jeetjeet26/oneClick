/**
 * Workflow Processor API
 * Called by CRON job to process pending workflow actions
 * 
 * This endpoint should be called every 10 minutes by:
 * - Vercel Cron Jobs
 * - Heroku Scheduler
 * - External service like Upstash QStash
 * 
 * Security: Uses CRON_SECRET to prevent unauthorized access
 */

import { NextRequest, NextResponse } from 'next/server'
import { processWorkflows } from '@/utils/services/workflow-processor'

// Verify CRON secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // In development, allow without secret
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  
  // If no secret configured, deny access in production
  if (!cronSecret) {
    console.warn('[Workflow API] CRON_SECRET not configured')
    return false
  }
  
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log('[Workflow API] Starting workflow processing...')
  const startTime = Date.now()

  try {
    const result = await processWorkflows()
    const duration = Date.now() - startTime

    console.log(`[Workflow API] Completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Workflow API] Error:', error)
    
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

// Also support POST for webhook-style CRON services
export async function POST(request: NextRequest) {
  return GET(request)
}

