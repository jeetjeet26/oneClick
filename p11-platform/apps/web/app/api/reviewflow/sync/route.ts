import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Google Places API - Fetch reviews
async function fetchGoogleReviews(placeId: string, apiKey: string): Promise<Array<{
  reviewer_name: string
  rating: number
  review_text: string
  review_date: string
  platform_review_id: string
  reviewer_avatar_url: string | null
}>> {
  const GOOGLE_API_KEY = apiKey || process.env.GOOGLE_PLACES_API_KEY
  
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Places API key not configured')
  }

  // Use Places API (New) - Place Details with reviews field
  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=reviews&key=${GOOGLE_API_KEY}`
  
  const response = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'reviews'
    }
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Google API error:', error)
    throw new Error(`Google API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (!data.reviews || !Array.isArray(data.reviews)) {
    return []
  }

  return data.reviews.map((review: {
    name?: string
    authorAttribution?: { displayName?: string; photoUri?: string }
    rating?: number
    text?: { text?: string }
    relativePublishTimeDescription?: string
    publishTime?: string
  }) => ({
    reviewer_name: review.authorAttribution?.displayName || 'Anonymous',
    reviewer_avatar_url: review.authorAttribution?.photoUri || null,
    rating: review.rating || 0,
    review_text: review.text?.text || '',
    review_date: review.publishTime || new Date().toISOString(),
    platform_review_id: review.name || `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }))
}

// Sync reviews from a connected platform
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { propertyId, platform, connectionId } = body

    if (!propertyId || !platform) {
      return NextResponse.json(
        { error: 'propertyId and platform are required' },
        { status: 400 }
      )
    }

    // Get the connection details
    let query = supabase
      .from('review_platform_connections')
      .select('*')
      .eq('property_id', propertyId)
      .eq('platform', platform)
      .eq('is_active', true)

    if (connectionId) {
      query = query.eq('id', connectionId)
    }

    const { data: connection, error: connError } = await query.single()

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'No active connection found for this platform' },
        { status: 404 }
      )
    }

    let reviews: Array<{
      reviewer_name: string
      rating: number
      review_text: string
      review_date: string
      platform_review_id: string
      reviewer_avatar_url: string | null
    }> = []
    
    try {
      switch (platform) {
        case 'google':
          if (!connection.place_id) {
            throw new Error('Google Place ID not configured')
          }
          reviews = await fetchGoogleReviews(connection.place_id, connection.api_key)
          break
          
        // Add other platforms here as needed
        case 'yelp':
          // Yelp API implementation would go here
          throw new Error('Yelp sync not yet implemented')
          
        default:
          throw new Error(`Unsupported platform: ${platform}`)
      }
    } catch (fetchError) {
      // Update connection with error
      await supabase
        .from('review_platform_connections')
        .update({
          error_count: (connection.error_count || 0) + 1,
          last_error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id)

      throw fetchError
    }

    if (reviews.length === 0) {
      // Update last sync time even with no new reviews
      await supabase
        .from('review_platform_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          error_count: 0,
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id)

      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No reviews found'
      })
    }

    // Prepare reviews for upsert
    const reviewsToUpsert = reviews.map(review => ({
      property_id: propertyId,
      platform,
      platform_review_id: review.platform_review_id,
      reviewer_name: review.reviewer_name,
      reviewer_avatar_url: review.reviewer_avatar_url,
      rating: review.rating,
      review_text: review.review_text,
      review_date: review.review_date,
      response_status: 'pending',
      updated_at: new Date().toISOString()
    }))

    // Upsert reviews (update if exists, insert if new)
    const { data: upserted, error: upsertError } = await supabase
      .from('reviews')
      .upsert(reviewsToUpsert, {
        onConflict: 'property_id,platform,platform_review_id'
      })
      .select()

    if (upsertError) {
      console.error('Error upserting reviews:', upsertError)
      throw new Error(upsertError.message)
    }

    // Update connection last sync time
    await supabase
      .from('review_platform_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        error_count: 0,
        last_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    // Analyze new reviews in background
    const newReviews = upserted?.filter(r => !r.sentiment) || []
    if (newReviews.length > 0) {
      // Don't await - let analysis happen in background
      analyzeReviewsBatch(newReviews.map(r => r.id))
    }

    return NextResponse.json({
      success: true,
      imported: upserted?.length || 0,
      newReviews: newReviews.length
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}

// Analyze reviews in background
async function analyzeReviewsBatch(reviewIds: string[]) {
  for (const reviewId of reviewIds) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/reviewflow/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId })
      })
    } catch (error) {
      console.error(`Error analyzing review ${reviewId}:`, error)
    }
  }
}

