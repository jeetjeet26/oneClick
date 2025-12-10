import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Data Engine URL for scraping operations
const DATA_ENGINE_URL = process.env.DATA_ENGINE_URL || 'http://localhost:8000'

// Review type definition
interface ReviewData {
  reviewer_name: string
  rating: number
  review_text: string
  review_date: string
  platform_review_id: string
  reviewer_avatar_url: string | null
}

// ============================================================================
// GOOGLE PLACES API - Direct API Method
// ============================================================================
async function fetchGoogleReviewsViaAPI(placeId: string, apiKey?: string): Promise<ReviewData[]> {
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

// ============================================================================
// GOOGLE REVIEWS VIA DATA-ENGINE SCRAPER
// ============================================================================
async function fetchGoogleReviewsViaScraper(placeId: string): Promise<ReviewData[]> {
  try {
    const response = await fetch(`${DATA_ENGINE_URL}/scraper/google-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: placeId, max_reviews: 100 })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Scraper error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success || !data.reviews) {
      throw new Error(data.error || 'No reviews returned from scraper')
    }

    return data.reviews.map((review: {
      platform_review_id: string
      reviewer_name: string
      reviewer_avatar_url?: string
      rating: number
      review_text: string
      review_date: string
    }) => ({
      platform_review_id: review.platform_review_id,
      reviewer_name: review.reviewer_name || 'Anonymous',
      reviewer_avatar_url: review.reviewer_avatar_url || null,
      rating: review.rating || 0,
      review_text: review.review_text || '',
      review_date: review.review_date || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Google scraper error:', error)
    throw error
  }
}

// ============================================================================
// YELP REVIEWS VIA DATA-ENGINE
// ============================================================================
async function fetchYelpReviews(businessId: string): Promise<ReviewData[]> {
  try {
    const response = await fetch(`${DATA_ENGINE_URL}/scraper/yelp-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Yelp API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Yelp API request failed')
    }

    return data.reviews.map((review: {
      platform_review_id: string
      reviewer_name: string
      reviewer_avatar_url?: string
      rating: number
      review_text: string
      review_date: string
    }) => ({
      platform_review_id: review.platform_review_id,
      reviewer_name: review.reviewer_name || 'Anonymous',
      reviewer_avatar_url: review.reviewer_avatar_url || null,
      rating: review.rating || 0,
      review_text: review.review_text || '',
      review_date: review.review_date || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Yelp API error:', error)
    throw error
  }
}

// ============================================================================
// YELP REVIEWS VIA URL (extracts business ID)
// ============================================================================
async function fetchYelpReviewsFromUrl(yelpUrl: string): Promise<ReviewData[]> {
  try {
    const response = await fetch(`${DATA_ENGINE_URL}/scraper/yelp-reviews/from-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: yelpUrl })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Yelp URL error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Yelp URL request failed')
    }

    return data.reviews.map((review: {
      platform_review_id: string
      reviewer_name: string
      reviewer_avatar_url?: string
      rating: number
      review_text: string
      review_date: string
    }) => ({
      platform_review_id: review.platform_review_id,
      reviewer_name: review.reviewer_name || 'Anonymous',
      reviewer_avatar_url: review.reviewer_avatar_url || null,
      rating: review.rating || 0,
      review_text: review.review_text || '',
      review_date: review.review_date || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Yelp URL error:', error)
    throw error
  }
}

// ============================================================================
// MAIN SYNC ENDPOINT
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { propertyId, platform, connectionId, method } = body

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

    // Determine which method to use
    const connectionType = method || connection.connection_type || 'api'
    
    let reviews: ReviewData[] = []
    let syncMethod = connectionType
    
    try {
      switch (platform) {
        case 'google':
          if (connectionType === 'scraper' || connectionType === 'both') {
            // Try scraper first if configured
            if (connection.place_id) {
              try {
                reviews = await fetchGoogleReviewsViaScraper(connection.place_id)
                syncMethod = 'scraper'
              } catch (scraperError) {
                console.warn('Google scraper failed, falling back to API:', scraperError)
                // Fall back to API if scraper fails and connection type is 'both'
                if (connectionType === 'both' && connection.place_id) {
                  reviews = await fetchGoogleReviewsViaAPI(connection.place_id, connection.api_key)
                  syncMethod = 'api'
                } else {
                  throw scraperError
                }
              }
            } else {
              throw new Error('Google Place ID not configured for scraping')
            }
          } else {
            // Use API method (default)
            if (!connection.place_id) {
              throw new Error('Google Place ID not configured')
            }
            reviews = await fetchGoogleReviewsViaAPI(connection.place_id, connection.api_key)
            syncMethod = 'api'
          }
          break
          
        case 'yelp':
          // Check which identifier we have
          if (connection.yelp_business_id) {
            reviews = await fetchYelpReviews(connection.yelp_business_id)
          } else if (connection.yelp_business_url) {
            reviews = await fetchYelpReviewsFromUrl(connection.yelp_business_url)
          } else {
            throw new Error('Yelp Business ID or URL not configured. Please provide either yelp_business_id or yelp_business_url.')
          }
          syncMethod = 'api' // Yelp always uses API via data-engine
          break
          
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
        message: 'No reviews found',
        syncMethod
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

    // Update connection stats
    await supabase
      .from('review_platform_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        error_count: 0,
        last_error: null,
        total_reviews_synced: (connection.total_reviews_synced || 0) + (upserted?.length || 0),
        last_review_date: reviews.length > 0 ? reviews[0].review_date : connection.last_review_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    // Analyze new reviews in background
    const newReviews = upserted?.filter(r => !r.sentiment) || []
    if (newReviews.length > 0) {
      // Don't await - let analysis happen in background
      analyzeReviewsBatch(newReviews.map(r => r.id))
    }

    // Add limitation note for Yelp
    let note: string | undefined
    if (platform === 'yelp') {
      note = 'Yelp API returns only 3 most recent reviews per business'
    }

    return NextResponse.json({
      success: true,
      imported: upserted?.length || 0,
      newReviews: newReviews.length,
      syncMethod,
      note
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
