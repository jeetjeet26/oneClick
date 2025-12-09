import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const propertyId = searchParams.get('propertyId')
  const days = parseInt(searchParams.get('days') || '30')

  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get all reviews for the property in the time range
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('*')
    .eq('property_id', propertyId)
    .gte('created_at', startDate.toISOString())

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError)
    return NextResponse.json({ error: reviewsError.message }, { status: 500 })
  }

  // Get ticket counts
  const { data: tickets } = await supabase
    .from('review_tickets')
    .select('status')
    .eq('property_id', propertyId)

  // Calculate stats
  const totalReviews = reviews?.length || 0
  const avgRating = reviews?.length 
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.filter(r => r.rating).length 
    : 0

  const sentimentCounts = {
    positive: reviews?.filter(r => r.sentiment === 'positive').length || 0,
    neutral: reviews?.filter(r => r.sentiment === 'neutral').length || 0,
    negative: reviews?.filter(r => r.sentiment === 'negative').length || 0
  }

  const responseCounts = {
    pending: reviews?.filter(r => r.response_status === 'pending').length || 0,
    draft_ready: reviews?.filter(r => r.response_status === 'draft_ready').length || 0,
    approved: reviews?.filter(r => r.response_status === 'approved').length || 0,
    posted: reviews?.filter(r => r.response_status === 'posted').length || 0,
    skipped: reviews?.filter(r => r.response_status === 'skipped').length || 0
  }

  const platformCounts: Record<string, number> = {}
  reviews?.forEach(r => {
    platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1
  })

  const ticketCounts = {
    open: tickets?.filter(t => t.status === 'open').length || 0,
    in_progress: tickets?.filter(t => t.status === 'in_progress').length || 0,
    resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
    closed: tickets?.filter(t => t.status === 'closed').length || 0
  }

  // Response rate
  const reviewsNeedingResponse = reviews?.filter(r => 
    r.response_status !== 'skipped' && r.response_status !== 'pending'
  ).length || 0
  const respondedReviews = reviews?.filter(r => r.response_status === 'posted').length || 0
  const responseRate = reviewsNeedingResponse > 0 
    ? Math.round((respondedReviews / reviewsNeedingResponse) * 100) 
    : 0

  // Get top topics
  const topicCounts: Record<string, number> = {}
  reviews?.forEach(r => {
    const topics = r.topics as string[] || []
    topics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1
    })
  })
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }))

  // Calculate rating distribution
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: reviews?.filter(r => r.rating === rating).length || 0
  }))

  // Recent activity - last 5 reviews
  const recentReviews = reviews
    ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      reviewer_name: r.reviewer_name,
      rating: r.rating,
      sentiment: r.sentiment,
      platform: r.platform,
      created_at: r.created_at
    })) || []

  return NextResponse.json({
    stats: {
      totalReviews,
      avgRating: Math.round(avgRating * 10) / 10,
      responseRate,
      sentimentCounts,
      responseCounts,
      platformCounts,
      ticketCounts,
      topTopics,
      ratingDistribution,
      recentReviews,
      periodDays: days
    }
  })
}

