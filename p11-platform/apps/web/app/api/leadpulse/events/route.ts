/**
 * LeadPulse Events API
 * Track engagement events that affect lead scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'

export type EventType =
  | 'chat_started'
  | 'chat_message_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'sms_replied'
  | 'tour_scheduled'
  | 'tour_completed'
  | 'tour_no_show'
  | 'application_started'
  | 'application_submitted'
  | 'document_viewed'
  | 'price_check'
  | 'unit_favorited'
  | 'repeat_visit'
  | 'call_inbound'
  | 'call_outbound_answered'

const EVENT_WEIGHTS: Record<EventType, number> = {
  chat_started: 5,
  chat_message_sent: 3,
  email_opened: 8,
  email_clicked: 15,
  sms_replied: 20,
  tour_scheduled: 25,
  tour_completed: 35,
  tour_no_show: -25,
  application_started: 30,
  application_submitted: 40,
  document_viewed: 10,
  price_check: 12,
  unit_favorited: 15,
  repeat_visit: 10,
  call_inbound: 20,
  call_outbound_answered: 18,
}

// POST: Record an engagement event
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { leadId, eventType, metadata, propertyId } = body

    if (!leadId || !eventType) {
      return NextResponse.json({ error: 'leadId and eventType required' }, { status: 400 })
    }

    // Validate event type
    if (!Object.keys(EVENT_WEIGHTS).includes(eventType)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 })
    }

    const serviceClient = createServiceClient()

    // Verify lead exists and get property_id if not provided
    const { data: lead, error: leadError } = await serviceClient
      .from('leads')
      .select('id, property_id')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Insert event
    const { data: event, error: eventError } = await serviceClient
      .from('lead_engagement_events')
      .insert({
        lead_id: leadId,
        property_id: propertyId || lead.property_id,
        event_type: eventType,
        metadata: metadata || {},
        score_weight: EVENT_WEIGHTS[eventType as EventType],
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error inserting event:', eventError)
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
    }

    // Optionally trigger rescore (can be async/queued in production)
    const { data: scoreId } = await serviceClient
      .rpc('score_lead', { p_lead_id: leadId })

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        leadId: event.lead_id,
        eventType: event.event_type,
        scoreWeight: event.score_weight,
        createdAt: event.created_at,
      },
      rescored: !!scoreId,
    })
  } catch (error) {
    console.error('LeadPulse Events POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get events for a lead
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const leadId = searchParams.get('leadId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    const { data: events, error } = await supabase
      .from('lead_engagement_events')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({
      events: events.map(e => ({
        id: e.id,
        eventType: e.event_type,
        metadata: e.metadata,
        scoreWeight: e.score_weight,
        createdAt: e.created_at,
      })),
    })
  } catch (error) {
    console.error('LeadPulse Events GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

















