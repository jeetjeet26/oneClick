import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const propertyId = searchParams.get('propertyId')
  const platform = searchParams.get('platform')
  const sentiment = searchParams.get('sentiment')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
  }

  let query = supabase
    .from('reviews')
    .select(`
      *,
      review_responses (
        id,
        response_text,
        response_type,
        status,
        tone,
        created_at
      ),
      review_tickets (
        id,
        title,
        priority,
        status
      )
    `)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (platform) {
    query = query.eq('platform', platform)
  }
  if (sentiment) {
    query = query.eq('sentiment', sentiment)
  }
  if (status) {
    query = query.eq('response_status', status)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reviews: data, total: count })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const {
    propertyId,
    platform,
    platformReviewId,
    reviewerName,
    reviewerAvatarUrl,
    rating,
    reviewText,
    reviewDate,
    rawData
  } = body

  if (!propertyId || !platform || !reviewText) {
    return NextResponse.json(
      { error: 'propertyId, platform, and reviewText are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('reviews')
    .upsert({
      property_id: propertyId,
      platform,
      platform_review_id: platformReviewId,
      reviewer_name: reviewerName,
      reviewer_avatar_url: reviewerAvatarUrl,
      rating,
      review_text: reviewText,
      review_date: reviewDate,
      raw_data: rawData,
      response_status: 'pending',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'property_id,platform,platform_review_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating review:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ review: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Review ID is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reviews')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating review:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ review: data })
}

