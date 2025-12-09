/**
 * MarketVision 360 - Scraping API
 * Triggers competitor discovery and refresh via the Python data-engine service
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Data engine service URL (Python FastAPI)
const DATA_ENGINE_URL = process.env.DATA_ENGINE_URL || 'http://localhost:8000'

// POST: Trigger scraping action
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, propertyId, radiusMiles, maxCompetitors, autoAdd } = body

    if (!action || !propertyId) {
      return NextResponse.json({ error: 'action and propertyId required' }, { status: 400 })
    }

    // Validate property belongs to user's org
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, name, org_id')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    let endpoint: string
    let requestBody: Record<string, unknown>

    switch (action) {
      case 'discover':
        endpoint = '/scraper/discover'
        requestBody = {
          property_id: propertyId,
          radius_miles: radiusMiles || 3.0,
          max_competitors: maxCompetitors || 20,
          auto_add: autoAdd !== false
        }
        break

      case 'refresh':
        endpoint = '/scraper/refresh'
        requestBody = {
          property_id: propertyId
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action. Use: discover, refresh' }, { status: 400 })
    }

    // Call data-engine service
    const response = await fetch(`${DATA_ENGINE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Data engine error:', errorText)
      return NextResponse.json({ 
        error: 'Scraping service error',
        details: errorText
      }, { status: 502 })
    }

    const result = await response.json()

    // Update scrape config with last run time
    if (action === 'discover' || action === 'refresh') {
      await supabase.from('scrape_config').upsert({
        property_id: propertyId,
        last_run_at: new Date().toISOString(),
        is_enabled: true
      }, {
        onConflict: 'property_id'
      })
    }

    return NextResponse.json({
      success: true,
      action,
      propertyId,
      result
    })
  } catch (error) {
    console.error('MarketVision Scrape Error:', error)
    
    // Check if data-engine is not running
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({
        error: 'Scraping service unavailable',
        details: 'The data-engine service is not running. Start it with: cd services/data-engine && python -m uvicorn main:app'
      }, { status: 503 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get scraper status and configuration
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')

    // Try to get status from data-engine
    let serviceStatus = null
    try {
      const response = await fetch(`${DATA_ENGINE_URL}/scraper/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        serviceStatus = await response.json()
      }
    } catch {
      // Service not available
    }

    // Get scrape config for property if provided
    let scrapeConfig = null
    if (propertyId) {
      const { data } = await supabase
        .from('scrape_config')
        .select('*')
        .eq('property_id', propertyId)
        .single()
      scrapeConfig = data
    }

    return NextResponse.json({
      serviceAvailable: !!serviceStatus,
      serviceStatus,
      scrapeConfig,
      dataEngineUrl: DATA_ENGINE_URL
    })
  } catch (error) {
    console.error('MarketVision Scrape Status Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

