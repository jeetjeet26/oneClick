import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vercel CRON - runs every 15 minutes
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "*/15 * * * *" }] }

export async function GET(request: NextRequest) {
  // Verify CRON secret for security
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In development, allow without auth
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const now = new Date().toISOString()
    
    // Get all scheduled posts that are due
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('content_drafts')
      .select(`
        *,
        social_connections:properties!content_drafts_property_id_fkey (
          id,
          name,
          social_connections (
            id,
            platform,
            is_active,
            page_access_token,
            account_id,
            page_id
          )
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(50)

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No posts to publish',
        processed: 0
      })
    }

    const results: Array<{
      draftId: string
      status: 'published' | 'failed'
      error?: string
    }> = []

    for (const draft of scheduledPosts) {
      try {
        // Get active social connections for the property
        const { data: connections, error: connError } = await supabase
          .from('social_connections')
          .select('*')
          .eq('property_id', draft.property_id)
          .eq('is_active', true)
          .eq('platform', draft.platform)

        if (connError || !connections || connections.length === 0) {
          // No active connection for this platform - mark as failed
          await supabase
            .from('content_drafts')
            .update({
              status: 'failed',
              rejection_reason: 'No active social connection for platform',
              updated_at: new Date().toISOString()
            })
            .eq('id', draft.id)

          results.push({
            draftId: draft.id,
            status: 'failed',
            error: 'No active social connection'
          })
          continue
        }

        // Publish to each connection
        const publishRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/forgestudio/social/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: draft.id,
            connectionIds: connections.map(c => c.id)
          })
        })

        if (publishRes.ok) {
          results.push({
            draftId: draft.id,
            status: 'published'
          })
        } else {
          const errorData = await publishRes.json()
          
          // Update draft with error
          await supabase
            .from('content_drafts')
            .update({
              status: 'failed',
              rejection_reason: errorData.error || 'Publishing failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', draft.id)

          results.push({
            draftId: draft.id,
            status: 'failed',
            error: errorData.error
          })
        }
      } catch (publishError) {
        console.error(`Error publishing draft ${draft.id}:`, publishError)
        
        await supabase
          .from('content_drafts')
          .update({
            status: 'failed',
            rejection_reason: publishError instanceof Error ? publishError.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', draft.id)

        results.push({
          draftId: draft.id,
          status: 'failed',
          error: publishError instanceof Error ? publishError.message : 'Unknown error'
        })
      }
    }

    const published = results.filter(r => r.status === 'published').length
    const failed = results.filter(r => r.status === 'failed').length

    return NextResponse.json({
      success: true,
      processed: results.length,
      published,
      failed,
      results
    })

  } catch (error) {
    console.error('CRON publish error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'CRON job failed' },
      { status: 500 }
    )
  }
}

