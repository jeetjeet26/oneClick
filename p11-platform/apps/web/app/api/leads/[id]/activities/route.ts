import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type ActivityType = 
  | 'note' 
  | 'status_change' 
  | 'tour_scheduled' 
  | 'tour_completed' 
  | 'tour_cancelled'
  | 'tour_no_show'
  | 'email_sent' 
  | 'sms_sent' 
  | 'call_made' 
  | 'tour_booked'
  | 'workflow_started'
  | 'workflow_stopped'
  | 'lead_created'

// GET - Fetch activities for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params
  const supabaseAuth = await createClient()
  
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Fetch activities with creator info
    const { data: activities, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        created_by_user:created_by (
          id,
          full_name
        )
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw error
    }

    return NextResponse.json({ activities: activities || [] })
  } catch (error) {
    console.error('Activities fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

// POST - Create a new activity (e.g., add a note)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params
  const supabaseAuth = await createClient()
  
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { type, description, metadata } = body

    // Validation
    if (!type || !description) {
      return NextResponse.json({ error: 'Type and description are required' }, { status: 400 })
    }

    const validTypes: ActivityType[] = [
      'note', 
      'status_change', 
      'tour_scheduled', 
      'tour_completed', 
      'tour_cancelled',
      'tour_no_show',
      'email_sent', 
      'sms_sent', 
      'call_made', 
      'tour_booked',
      'workflow_started',
      'workflow_stopped',
      'lead_created'
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
    }

    // Create activity
    const { data: activity, error: activityError } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        type,
        description,
        metadata: metadata || null,
        created_by: user.id,
      })
      .select(`
        *,
        created_by_user:created_by (
          id,
          full_name
        )
      `)
      .single()

    if (activityError) {
      console.error('Activity creation error:', activityError)
      return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
    }

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    console.error('Activity creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

