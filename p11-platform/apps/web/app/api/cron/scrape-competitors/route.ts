/**
 * CRON Job: Daily Competitor Price Refresh
 * Called by Vercel CRON or external scheduler
 * 
 * Schedule: Daily at 6 AM UTC (midnight CST)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/admin'

// Data engine service URL (Python FastAPI)
const DATA_ENGINE_URL = process.env.DATA_ENGINE_URL || 'http://localhost:8000'

// Verify CRON secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  try {
    // Verify CRON secret
    const authHeader = req.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get all properties with scraping enabled
    const { data: configs, error: configError } = await supabase
      .from('scrape_config')
      .select('property_id, scrape_frequency, last_run_at, error_count')
      .eq('is_enabled', true)

    if (configError) {
      console.error('Error fetching scrape configs:', configError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No properties configured for scraping',
        processed: 0
      })
    }

    console.log(`[CRON] Starting competitor refresh for ${configs.length} properties`)

    // Filter properties that need scraping based on frequency
    const now = new Date()
    const propertiesToScrape = configs.filter(config => {
      if (!config.last_run_at) return true // Never scraped

      const lastRun = new Date(config.last_run_at)
      const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)

      switch (config.scrape_frequency) {
        case 'hourly':
          return hoursSinceLastRun >= 1
        case 'daily':
          return hoursSinceLastRun >= 24
        case 'weekly':
          return hoursSinceLastRun >= 168
        default:
          return hoursSinceLastRun >= 24
      }
    })

    if (propertiesToScrape.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No properties due for scraping',
        total: configs.length,
        processed: 0
      })
    }

    // Call data-engine refresh-all endpoint
    try {
      const response = await fetch(`${DATA_ENGINE_URL}/scraper/refresh-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CRON] Data engine error:', errorText)
        
        // Log the error but don't fail completely
        return NextResponse.json({
          success: false,
          message: 'Data engine service error',
          error: errorText,
          total: configs.length,
          scheduled: propertiesToScrape.length
        }, { status: 502 })
      }

      const result = await response.json()

      console.log(`[CRON] Refresh complete:`, result)

      return NextResponse.json({
        success: true,
        message: `Refreshed ${propertiesToScrape.length} properties`,
        total: configs.length,
        processed: propertiesToScrape.length,
        result
      })

    } catch (fetchError) {
      console.error('[CRON] Failed to reach data engine:', fetchError)
      
      return NextResponse.json({
        success: false,
        message: 'Data engine service unavailable',
        error: 'Could not connect to scraping service',
        total: configs.length,
        scheduled: propertiesToScrape.length
      }, { status: 503 })
    }

  } catch (error) {
    console.error('[CRON] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req)
}

