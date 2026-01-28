/**
 * LumaLeasing Tour Availability API
 * Returns available tour slots from Property Manager's Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { getCalendarConfig, fetchBusyTimes, generateAvailableSlots, type AvailableSlot } from '@/utils/services/google-calendar'
import { addDays, startOfDay, endOfDay, format, parseISO } from 'date-fns'

function extractApiKey(req: NextRequest): string | null {
  const headerKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key')
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  const authKey = authHeader?.replace(/^Bearer\s+/i, '')
  const urlKey = new URL(req.url).searchParams.get('apiKey') || new URL(req.url).searchParams.get('api_key')

  const raw = headerKey || authKey || urlKey
  if (!raw) return null

  const normalized = raw.trim()
  return normalized.length ? normalized : null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Visitor-ID, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = extractApiKey(req)
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const supabase = createServiceClient()

    // Validate API key and get property
    const { data: config, error: configError } = await supabase
      .from('lumaleasing_config')
      .select('property_id, tours_enabled')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (configError || !config || !config.tours_enabled) {
      return NextResponse.json(
        { error: 'Tours not available for this property' },
        { status: 404, headers: corsHeaders }
      )
    }

    const propertyId = config.property_id

    // Get Google Calendar configuration
    const calendarConfig = await getCalendarConfig(propertyId)

    if (!calendarConfig) {
      return NextResponse.json(
        { 
          error: 'Google Calendar not connected', 
          fallback: true,
          message: 'Property manager has not connected their calendar yet. Please call to schedule.' 
        },
        { status: 503, headers: corsHeaders }
      )
    }

    // Check token health
    if (calendarConfig.token_status !== 'healthy') {
      return NextResponse.json(
        { 
          error: 'Calendar authorization expired', 
          fallback: true,
          message: 'Tour booking is temporarily unavailable. Please call to schedule.' 
        },
        { status: 503, headers: corsHeaders }
      )
    }

    // Default to next 14 days
    const start = startDate ? parseISO(startDate) : startOfDay(new Date())
    const end = endDate ? parseISO(endDate) : endOfDay(addDays(new Date(), 14))

    // Fetch busy times from Google Calendar
    const busyTimes = await fetchBusyTimes(calendarConfig, start, end)

    // Generate available slots for each date
    const slotsByDate: Record<string, AvailableSlot[]> = {}
    const availableDates: string[] = []

    let currentDate = new Date(start)
    while (currentDate <= end) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const slots = generateAvailableSlots(currentDate, calendarConfig, busyTimes)
      
      // Only include dates that have at least one available slot
      const hasAvailability = slots.some(slot => slot.available)
      if (hasAvailability) {
        slotsByDate[dateStr] = slots
        availableDates.push(dateStr)
      }

      currentDate = addDays(currentDate, 1)
    }

    return NextResponse.json({
      success: true,
      availableDates,
      slotsByDate,
      timezone: calendarConfig.timezone,
      tourDuration: calendarConfig.tour_duration_minutes,
      bufferMinutes: calendarConfig.buffer_minutes,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('[TourAvailability] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Check if it's a calendar authorization error
    if (errorMessage.includes('revoked') || errorMessage.includes('expired')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          fallback: true,
          message: 'Calendar authorization expired. Please call to schedule your tour.' 
        },
        { status: 503, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch tour availability',
        details: errorMessage,
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
