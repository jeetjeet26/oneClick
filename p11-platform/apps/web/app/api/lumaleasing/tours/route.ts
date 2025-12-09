import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Visitor-ID',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// GET - Fetch available tour slots
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('X-API-Key');
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createServiceClient();

    // Validate API key and get property
    const { data: config } = await supabase
      .from('lumaleasing_config')
      .select('property_id, tours_enabled, tour_duration_minutes')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (!config || !config.tours_enabled) {
      return NextResponse.json(
        { error: 'Tours not available' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Default to next 14 days
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch available slots
    const { data: slots, error } = await supabase
      .from('tour_slots')
      .select('id, slot_date, start_time, end_time, max_bookings, current_bookings')
      .eq('property_id', config.property_id)
      .eq('is_available', true)
      .gte('slot_date', start)
      .lte('slot_date', end)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Slots fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch slots' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Filter out fully booked slots and format response
    const availableSlots = (slots || [])
      .filter(slot => slot.current_bookings < slot.max_bookings)
      .map(slot => ({
        id: slot.id,
        date: slot.slot_date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        available: slot.max_bookings - slot.current_bookings,
      }));

    // Group by date for easier frontend consumption
    const groupedSlots: Record<string, typeof availableSlots> = {};
    availableSlots.forEach(slot => {
      if (!groupedSlots[slot.date]) {
        groupedSlots[slot.date] = [];
      }
      groupedSlots[slot.date].push(slot);
    });

    return NextResponse.json({
      slots: groupedSlots,
      tourDuration: config.tour_duration_minutes,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Tours GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tour slots' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Book a tour
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { 
      slotId, 
      leadInfo, // { first_name, last_name, email, phone }
      specialRequests,
      sessionId,
      conversationId,
    } = await req.json();

    if (!slotId || !leadInfo?.email) {
      return NextResponse.json(
        { error: 'Slot ID and email are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createServiceClient();

    // Validate API key
    const { data: config } = await supabase
      .from('lumaleasing_config')
      .select('property_id, tours_enabled')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (!config || !config.tours_enabled) {
      return NextResponse.json(
        { error: 'Tours not available' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify slot is available
    const { data: slot } = await supabase
      .from('tour_slots')
      .select('*')
      .eq('id', slotId)
      .eq('property_id', config.property_id)
      .eq('is_available', true)
      .single();

    if (!slot || slot.current_bookings >= slot.max_bookings) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Get or create lead
    let leadId: string | null = null;

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('property_id', config.property_id)
      .eq('email', leadInfo.email)
      .single();

    if (existingLead) {
      leadId = existingLead.id;
      // Update lead info if provided
      await supabase
        .from('leads')
        .update({
          first_name: leadInfo.first_name || undefined,
          last_name: leadInfo.last_name || undefined,
          phone: leadInfo.phone || undefined,
          status: 'tour_booked',
        })
        .eq('id', leadId);
    } else {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          property_id: config.property_id,
          first_name: leadInfo.first_name || '',
          last_name: leadInfo.last_name || '',
          email: leadInfo.email,
          phone: leadInfo.phone || '',
          source: 'LumaLeasing Tour Booking',
          status: 'tour_booked',
        })
        .select('id')
        .single();

      leadId = newLead?.id || null;
    }

    if (!leadId) {
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update session with lead if provided
    if (sessionId) {
      await supabase
        .from('widget_sessions')
        .update({ lead_id: leadId, converted_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('tour_bookings')
      .insert({
        property_id: config.property_id,
        lead_id: leadId,
        slot_id: slotId,
        scheduled_date: slot.slot_date,
        scheduled_time: slot.start_time,
        duration_minutes: (new Date(`1970-01-01T${slot.end_time}Z`).getTime() - new Date(`1970-01-01T${slot.start_time}Z`).getTime()) / 60000,
        special_requests: specialRequests || null,
        source: 'lumaleasing',
        booked_via_conversation_id: conversationId || null,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Increment slot booking count
    await supabase
      .from('tour_slots')
      .update({ current_bookings: slot.current_bookings + 1 })
      .eq('id', slotId);

    // Create activity on lead
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        type: 'tour_booked',
        description: `Tour booked for ${slot.slot_date} at ${slot.start_time}`,
        metadata: { booking_id: booking.id },
      });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        date: booking.scheduled_date,
        time: booking.scheduled_time,
        status: booking.status,
      },
      message: `Great! Your tour is confirmed for ${formatDate(booking.scheduled_date)} at ${formatTime(booking.scheduled_time)}. We'll send a confirmation to ${leadInfo.email}.`,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Tour booking error:', error);
    return NextResponse.json(
      { error: 'Failed to book tour' },
      { status: 500, headers: corsHeaders }
    );
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

