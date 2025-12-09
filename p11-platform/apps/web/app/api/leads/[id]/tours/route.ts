import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { format, addHours, isBefore, isToday, isTomorrow } from 'date-fns'

type TourStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
type TourType = 'in_person' | 'virtual' | 'self_guided'

// GET - Fetch tours for a specific lead
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
    // Fetch all tours for this lead
    const { data: tours, error } = await supabase
      .from('tours')
      .select(`
        *,
        assigned_agent:assigned_agent_id (
          id,
          full_name
        )
      `)
      .eq('lead_id', leadId)
      .order('tour_date', { ascending: true })
      .order('tour_time', { ascending: true })

    if (error) {
      throw error
    }

    // Also fetch the lead info
    const { data: lead } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, property_id')
      .eq('id', leadId)
      .single()

    return NextResponse.json({ tours: tours || [], lead })
  } catch (error) {
    console.error('Tours fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch tours' }, { status: 500 })
  }
}

// POST - Create a new tour
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
    const { 
      tourDate, 
      tourTime, 
      tourType = 'in_person',
      notes,
      sendConfirmation = true,
      assignedAgentId
    } = body

    // Validation
    if (!tourDate || !tourTime) {
      return NextResponse.json({ error: 'Tour date and time are required' }, { status: 400 })
    }

    // Get lead info for confirmation message
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, property:property_id(*)')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Create the tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .insert({
        lead_id: leadId,
        property_id: lead.property_id,
        tour_date: tourDate,
        tour_time: tourTime,
        tour_type: tourType as TourType,
        status: 'scheduled',
        notes: notes || null,
        assigned_agent_id: assignedAgentId || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (tourError) {
      console.error('Tour creation error:', tourError)
      return NextResponse.json({ error: 'Failed to create tour' }, { status: 500 })
    }

    // Update lead status to tour_booked
    await supabase
      .from('leads')
      .update({ 
        status: 'tour_booked',
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    // Stop any active workflows since tour is booked
    await supabase
      .from('lead_workflows')
      .update({ status: 'completed' })
      .eq('lead_id', leadId)
      .eq('status', 'active')

    // Send confirmation message if requested
    if (sendConfirmation && (lead.phone || lead.email)) {
      await sendTourConfirmation(supabase, tour, lead)
    }

    return NextResponse.json({ tour, lead }, { status: 201 })
  } catch (error) {
    console.error('Tour creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a tour (status, reschedule, etc.)
export async function PATCH(
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
    const { 
      tourId,
      status,
      tourDate,
      tourTime,
      tourType,
      notes,
      sendNotification = false
    } = body

    if (!tourId) {
      return NextResponse.json({ error: 'Tour ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Validate status if provided
    if (status) {
      const validStatuses: TourStatus[] = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status

      // Update lead status based on tour outcome
      if (status === 'completed') {
        // Tour completed, lead might be interested - move to contacted for follow-up
        await supabase
          .from('leads')
          .update({ status: 'contacted', updated_at: new Date().toISOString() })
          .eq('id', leadId)
      } else if (status === 'cancelled' || status === 'no_show') {
        // Return lead to previous state
        await supabase
          .from('leads')
          .update({ status: 'contacted', updated_at: new Date().toISOString() })
          .eq('id', leadId)
      }
    }

    if (tourDate) updateData.tour_date = tourDate
    if (tourTime) updateData.tour_time = tourTime
    if (tourType) updateData.tour_type = tourType
    if (notes !== undefined) updateData.notes = notes

    const { data: tour, error } = await supabase
      .from('tours')
      .update(updateData)
      .eq('id', tourId)
      .eq('lead_id', leadId)
      .select()
      .single()

    if (error) {
      console.error('Tour update error:', error)
      return NextResponse.json({ error: 'Failed to update tour' }, { status: 500 })
    }

    // Send notification if rescheduled and requested
    if (sendNotification && (tourDate || tourTime)) {
      const { data: lead } = await supabase
        .from('leads')
        .select('*, property:property_id(*)')
        .eq('id', leadId)
        .single()
      
      if (lead) {
        await sendTourConfirmation(supabase, tour, lead, true) // true = reschedule notification
      }
    }

    return NextResponse.json({ tour })
  } catch (error) {
    console.error('Tour update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Cancel a tour
export async function DELETE(
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
    const { searchParams } = new URL(request.url)
    const tourId = searchParams.get('tourId')

    if (!tourId) {
      return NextResponse.json({ error: 'Tour ID is required' }, { status: 400 })
    }

    // Soft delete - set status to cancelled
    const { error } = await supabase
      .from('tours')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', tourId)
      .eq('lead_id', leadId)

    if (error) {
      throw error
    }

    // Check if lead has any other scheduled tours
    const { data: otherTours } = await supabase
      .from('tours')
      .select('id')
      .eq('lead_id', leadId)
      .eq('status', 'scheduled')

    // If no other tours, update lead status
    if (!otherTours || otherTours.length === 0) {
      await supabase
        .from('leads')
        .update({ status: 'contacted', updated_at: new Date().toISOString() })
        .eq('id', leadId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tour deletion error:', error)
    return NextResponse.json({ error: 'Failed to cancel tour' }, { status: 500 })
  }
}

// Helper function to send tour confirmation
async function sendTourConfirmation(
  supabase: ReturnType<typeof createServiceClient>,
  tour: any,
  lead: any,
  isReschedule = false
) {
  try {
    const property = lead.property || {}
    const tourDate = format(new Date(tour.tour_date), 'EEEE, MMMM d, yyyy')
    const tourTime = format(new Date(`2000-01-01T${tour.tour_time}`), 'h:mm a')
    const tourTypeLabels: Record<string, string> = {
      in_person: 'In-Person Tour',
      virtual: 'Virtual Tour',
      self_guided: 'Self-Guided Tour'
    }

    // Prepare template variables
    const variables = {
      first_name: lead.first_name,
      property_name: property.name || 'the property',
      tour_date: tourDate,
      tour_time: tourTime,
      tour_type: tourTypeLabels[tour.tour_type] || 'Tour',
      property_address: property.address?.street || ''
    }

    // Try SMS first if phone available
    if (lead.phone) {
      // For now, just log - in production this would call Twilio
      console.log(`[Tour Confirmation] Would send SMS to ${lead.phone}:`, {
        template: 'tour_confirmation_sms',
        variables
      })

      // Mark confirmation as sent
      await supabase
        .from('tours')
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq('id', tour.id)
    }

    // Also send email if available
    if (lead.email) {
      // For now, just log - in production this would call Resend
      console.log(`[Tour Confirmation] Would send email to ${lead.email}:`, {
        template: 'tour_confirmation_email',
        variables
      })
    }

    return true
  } catch (error) {
    console.error('Failed to send tour confirmation:', error)
    return false
  }
}

