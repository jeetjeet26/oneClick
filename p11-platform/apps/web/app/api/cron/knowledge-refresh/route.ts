import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import OpenAI from 'openai'

/**
 * Knowledge Refresh CRON Job
 * Phase 4: Automated Knowledge Refresh
 * 
 * This endpoint re-scrapes community websites and updates the knowledge base.
 * Should be called by Vercel CRON or similar scheduler (weekly recommended).
 * 
 * Vercel CRON config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/knowledge-refresh",
 *     "schedule": "0 3 * * 0"  // Every Sunday at 3 AM
 *   }]
 * }
 */

const MAX_PROPERTIES_PER_RUN = 10 // Limit to avoid timeout
const DAYS_STALE_THRESHOLD = 7 // Consider knowledge stale after 7 days

export async function GET(request: NextRequest) {
  try {
    // Verify CRON secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Find properties with stale website knowledge
    const staleThreshold = new Date()
    staleThreshold.setDate(staleThreshold.getDate() - DAYS_STALE_THRESHOLD)

    // Get knowledge sources that are website type and haven't been synced recently
    const { data: staleSources, error: sourceError } = await adminClient
      .from('knowledge_sources')
      .select(`
        id,
        property_id,
        source_url,
        last_synced_at,
        properties!inner (
          id,
          name
        )
      `)
      .eq('source_type', 'website')
      .or(`last_synced_at.is.null,last_synced_at.lt.${staleThreshold.toISOString()}`)
      .limit(MAX_PROPERTIES_PER_RUN)

    if (sourceError) {
      console.error('Error fetching stale sources:', sourceError)
      return NextResponse.json({ error: 'Failed to fetch stale sources' }, { status: 500 })
    }

    if (!staleSources || staleSources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stale knowledge sources to refresh',
        processed: 0,
      })
    }

    const results: Array<{
      propertyId: string
      propertyName: string
      success: boolean
      error?: string
      changes?: string[]
    }> = []

    // Process each stale source
    for (const source of staleSources) {
      try {
        if (!source.source_url) {
          results.push({
            propertyId: source.property_id,
            propertyName: (source.properties as { name: string })?.name || 'Unknown',
            success: false,
            error: 'No source URL configured',
          })
          continue
        }

        // Call the website scrape endpoint
        const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/onboarding/scrape-website`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`,
          },
          body: JSON.stringify({
            propertyId: source.property_id,
            websiteUrl: source.source_url,
            isRefresh: true, // Flag to indicate this is a refresh, not initial scrape
          }),
        })

        if (!scrapeResponse.ok) {
          const errorData = await scrapeResponse.json()
          results.push({
            propertyId: source.property_id,
            propertyName: (source.properties as { name: string })?.name || 'Unknown',
            success: false,
            error: errorData.error || 'Scrape failed',
          })
          continue
        }

        const scrapeResult = await scrapeResponse.json()

        // Update the knowledge source record
        await adminClient
          .from('knowledge_sources')
          .update({
            last_synced_at: new Date().toISOString(),
            status: 'completed',
            documents_created: scrapeResult.documentsCreated || 0,
            processing_notes: `Refreshed at ${new Date().toISOString()}`,
          })
          .eq('id', source.id)

        results.push({
          propertyId: source.property_id,
          propertyName: (source.properties as { name: string })?.name || 'Unknown',
          success: true,
          changes: scrapeResult.changes || [],
        })

        // If there were significant changes, we could notify the user
        // This would be a good place to add notification logic
        if (scrapeResult.changes && scrapeResult.changes.length > 0) {
          // TODO: Send notification about changes
          console.log(`Changes detected for property ${source.property_id}:`, scrapeResult.changes)
        }

      } catch (error) {
        console.error(`Error processing property ${source.property_id}:`, error)
        results.push({
          propertyId: source.property_id,
          propertyName: (source.properties as { name: string })?.name || 'Unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Log summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    console.log(`Knowledge refresh complete: ${successful} succeeded, ${failed} failed`)

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results,
    })

  } catch (error) {
    console.error('Knowledge refresh CRON error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status: 500 })
  }
}

// POST endpoint for manual trigger
export async function POST(request: NextRequest) {
  try {
    const { propertyId } = await request.json()
    
    if (!propertyId) {
      // If no propertyId, run the full CRON job
      return GET(request)
    }

    // Otherwise, refresh just one property
    const adminClient = createAdminClient()

    const { data: source, error } = await adminClient
      .from('knowledge_sources')
      .select('*')
      .eq('property_id', propertyId)
      .eq('source_type', 'website')
      .single()

    if (error || !source) {
      return NextResponse.json({ error: 'No website knowledge source found for this property' }, { status: 404 })
    }

    if (!source.source_url) {
      return NextResponse.json({ error: 'No website URL configured for this property' }, { status: 400 })
    }

    // Trigger scrape
    const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/onboarding/scrape-website`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        propertyId,
        websiteUrl: source.source_url,
        isRefresh: true,
      }),
    })

    const result = await scrapeResponse.json()

    if (!scrapeResponse.ok) {
      return NextResponse.json({ error: result.error || 'Refresh failed' }, { status: scrapeResponse.status })
    }

    // Update source record
    await adminClient
      .from('knowledge_sources')
      .update({
        last_synced_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', source.id)

    return NextResponse.json({
      success: true,
      ...result,
    })

  } catch (error) {
    console.error('Manual knowledge refresh error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status: 500 })
  }
}

