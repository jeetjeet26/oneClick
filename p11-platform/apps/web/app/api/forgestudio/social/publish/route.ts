import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Publish content to connected social accounts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { draftId, connectionIds } = body

    if (!draftId || !connectionIds?.length) {
      return NextResponse.json(
        { error: 'Draft ID and connection IDs required' },
        { status: 400 }
      )
    }

    // Get the draft
    const { data: draft, error: draftError } = await supabase
      .from('content_drafts')
      .select('*')
      .eq('id', draftId)
      .single()

    if (draftError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Get the connections
    const { data: connections, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .in('id', connectionIds)
      .eq('is_active', true)

    if (connError || !connections?.length) {
      return NextResponse.json(
        { error: 'No valid connections found' },
        { status: 400 }
      )
    }

    const results: Array<{
      connectionId: string
      platform: string
      success: boolean
      postId?: string
      postUrl?: string
      error?: string
    }> = []

    // Publish to each connection
    for (const connection of connections) {
      try {
        let result: { postId: string; postUrl: string }

        switch (connection.platform) {
          case 'instagram':
            result = await publishToInstagram(connection, draft)
            break
          case 'facebook':
            result = await publishToFacebook(connection, draft)
            break
          case 'linkedin':
            result = await publishToLinkedIn(connection, draft)
            break
          default:
            throw new Error(`Unsupported platform: ${connection.platform}`)
        }

        // Save published post record
        await supabase
          .from('published_posts')
          .insert({
            content_draft_id: draftId,
            social_connection_id: connection.id,
            platform_post_id: result.postId,
            platform_post_url: result.postUrl,
            status: 'published',
            published_at: new Date().toISOString()
          })

        // Update last used
        await supabase
          .from('social_connections')
          .update({ last_used_at: new Date().toISOString(), error_count: 0, last_error: null })
          .eq('id', connection.id)

        results.push({
          connectionId: connection.id,
          platform: connection.platform,
          success: true,
          postId: result.postId,
          postUrl: result.postUrl
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Publishing failed'
        
        // Update error count
        await supabase
          .from('social_connections')
          .update({ 
            error_count: (connection.error_count || 0) + 1,
            last_error: errorMessage
          })
          .eq('id', connection.id)

        // Save failed attempt
        await supabase
          .from('published_posts')
          .insert({
            content_draft_id: draftId,
            social_connection_id: connection.id,
            status: 'failed',
            error_message: errorMessage
          })

        results.push({
          connectionId: connection.id,
          platform: connection.platform,
          success: false,
          error: errorMessage
        })
      }
    }

    // Update draft status if all published successfully
    const allSuccess = results.every(r => r.success)
    if (allSuccess) {
      await supabase
        .from('content_drafts')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', draftId)
    }

    return NextResponse.json({
      success: allSuccess,
      results
    })

  } catch (error) {
    console.error('Publishing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publishing failed' },
      { status: 500 }
    )
  }
}

// Publish to Instagram via Facebook Graph API
async function publishToInstagram(
  connection: {
    account_id: string
    page_access_token: string
  },
  draft: {
    caption: string
    hashtags: string[]
    media_urls: string[]
    media_type: string
  }
): Promise<{ postId: string; postUrl: string }> {
  const { account_id, page_access_token } = connection
  const fullCaption = `${draft.caption}\n\n${draft.hashtags.map(h => `#${h}`).join(' ')}`

  // Instagram requires media to be hosted at a public URL
  // For now, we'll handle image posts only
  if (!draft.media_urls?.length) {
    throw new Error('Instagram requires an image or video')
  }

  const mediaUrl = draft.media_urls[0]

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v18.0/${account_id}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: mediaUrl,
        caption: fullCaption,
        access_token: page_access_token
      })
    }
  )
  
  const containerData = await containerRes.json()
  
  if (containerData.error) {
    throw new Error(containerData.error.message || 'Failed to create media container')
  }

  const containerId = containerData.id

  // Step 2: Publish the container
  const publishRes = await fetch(
    `https://graph.facebook.com/v18.0/${account_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: page_access_token
      })
    }
  )

  const publishData = await publishRes.json()

  if (publishData.error) {
    throw new Error(publishData.error.message || 'Failed to publish to Instagram')
  }

  return {
    postId: publishData.id,
    postUrl: `https://www.instagram.com/p/${publishData.id}/` // Approximate URL
  }
}

// Publish to Facebook Page
async function publishToFacebook(
  connection: {
    page_id: string
    page_access_token: string
  },
  draft: {
    caption: string
    hashtags: string[]
    media_urls: string[]
    media_type: string
  }
): Promise<{ postId: string; postUrl: string }> {
  const { page_id, page_access_token } = connection
  const message = `${draft.caption}\n\n${draft.hashtags.map(h => `#${h}`).join(' ')}`

  let endpoint = `https://graph.facebook.com/v18.0/${page_id}/feed`
  const body: Record<string, string> = {
    message,
    access_token: page_access_token
  }

  // If there's an image, post as photo
  if (draft.media_urls?.length && draft.media_type === 'image') {
    endpoint = `https://graph.facebook.com/v18.0/${page_id}/photos`
    body.url = draft.media_urls[0]
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const data = await res.json()

  if (data.error) {
    throw new Error(data.error.message || 'Failed to publish to Facebook')
  }

  return {
    postId: data.id || data.post_id,
    postUrl: `https://www.facebook.com/${data.id || data.post_id}`
  }
}

// Publish to LinkedIn
async function publishToLinkedIn(
  connection: {
    account_id: string
    access_token: string
  },
  draft: {
    caption: string
    hashtags: string[]
    media_urls: string[]
    media_type: string
  }
): Promise<{ postId: string; postUrl: string }> {
  const { account_id, access_token } = connection
  const text = `${draft.caption}\n\n${draft.hashtags.map(h => `#${h}`).join(' ')}`

  // LinkedIn v2 API - UGC Posts
  const postData: any = {
    author: `urn:li:person:${account_id}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text
        },
        shareMediaCategory: draft.media_urls?.length && draft.media_type === 'image' ? 'IMAGE' : 'NONE'
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  }

  // If there's an image, add it (LinkedIn requires image to be uploaded first for proper support)
  // For MVP, we'll use external image URL (works for most cases)
  if (draft.media_urls?.length && draft.media_type === 'image') {
    postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
      status: 'READY',
      originalUrl: draft.media_urls[0]
    }]
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(postData)
  })

  const data = await res.json()

  if (!res.ok || data.error) {
    throw new Error(data.message || data.error || 'Failed to publish to LinkedIn')
  }

  const postId = data.id
  return {
    postId,
    postUrl: `https://www.linkedin.com/feed/update/${postId}/`
  }
}

