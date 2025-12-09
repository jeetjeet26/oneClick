import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const propertyId = searchParams.get('propertyId')
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const assignedTo = searchParams.get('assignedTo')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
  }

  let query = supabase
    .from('review_tickets')
    .select(`
      *,
      reviews (
        id,
        reviewer_name,
        rating,
        review_text,
        sentiment,
        platform,
        review_date
      ),
      assigned_user:profiles!review_tickets_assigned_to_fkey (
        id,
        full_name
      ),
      resolved_by_user:profiles!review_tickets_resolved_by_fkey (
        id,
        full_name
      )
    `)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }
  if (priority) {
    query = query.eq('priority', priority)
  }
  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tickets: data, total: count })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const { reviewId, propertyId, title, description, priority } = body

  if (!reviewId || !propertyId || !title) {
    return NextResponse.json(
      { error: 'reviewId, propertyId, and title are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('review_tickets')
    .insert({
      review_id: reviewId,
      property_id: propertyId,
      title,
      description,
      priority: priority || 'medium',
      status: 'open'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ticket: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const { id, status, assignedTo, priority, resolutionNotes } = body

  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (status) {
    updateData.status = status
    
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_by = user?.id
      updateData.resolved_at = new Date().toISOString()
    }
  }

  if (assignedTo !== undefined) {
    updateData.assigned_to = assignedTo
    updateData.assigned_at = assignedTo ? new Date().toISOString() : null
  }

  if (priority) {
    updateData.priority = priority
  }

  if (resolutionNotes) {
    updateData.resolution_notes = resolutionNotes
  }

  const { data, error } = await supabase
    .from('review_tickets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ticket: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('review_tickets')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

