/**
 * Google Calendar API Utility
 * Handles token refresh, API calls, and availability generation
 */

import { createServiceClient } from '@/utils/supabase/admin'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export interface CalendarConfig {
  id: string
  property_id: string
  google_email: string
  calendar_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  working_hours: Record<string, { start: string; end: string; enabled: boolean }>
  tour_duration_minutes: number
  buffer_minutes: number
  timezone: string
  token_status: string
}

export interface BusyTime {
  start: string // ISO datetime
  end: string   // ISO datetime
}

export interface AvailableSlot {
  time: string  // HH:MM format
  available: boolean
}

/**
 * Refresh access token if expired or expiring soon
 */
export async function refreshAccessTokenIfNeeded(
  config: CalendarConfig
): Promise<{ accessToken: string; expiresAt: string }> {
  const expiresAt = new Date(config.token_expires_at)
  const now = new Date()

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('[GoogleCalendar] Token expiring soon, refreshing...')
    return await refreshAccessToken(config)
  }

  return {
    accessToken: config.access_token,
    expiresAt: config.token_expires_at,
  }
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken(
  config: CalendarConfig
): Promise<{ accessToken: string; expiresAt: string }> {
  const supabase = createServiceClient()

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: config.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[GoogleCalendar] Token refresh failed:', errorText)

      // Check if refresh token is revoked
      if (errorText.includes('invalid_grant')) {
        await supabase
          .from('agent_calendars')
          .update({
            token_status: 'revoked',
            health_check_error: 'Refresh token revoked by user',
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id)

        throw new Error('Calendar authorization revoked. Please reconnect.')
      }

      throw new Error('Failed to refresh token')
    }

    const tokens = await response.json()
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Update database with new token
    await supabase
      .from('agent_calendars')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt,
        token_status: 'healthy',
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id)

    // Log refresh for audit
    await supabase
      .from('calendar_token_refreshes')
      .insert({
        agent_calendar_id: config.id,
        refresh_status: 'success',
        old_expires_at: config.token_expires_at,
        new_expires_at: newExpiresAt,
      })

    return {
      accessToken: tokens.access_token,
      expiresAt: newExpiresAt,
    }
  } catch (error) {
    // Log failed refresh
    await supabase
      .from('calendar_token_refreshes')
      .insert({
        agent_calendar_id: config.id,
        refresh_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        old_expires_at: config.token_expires_at,
      })

    throw error
  }
}

/**
 * Fetch busy times from Google Calendar
 */
export async function fetchBusyTimes(
  config: CalendarConfig,
  startDate: Date,
  endDate: Date
): Promise<BusyTime[]> {
  // Ensure token is fresh
  const { accessToken } = await refreshAccessTokenIfNeeded(config)

  // Call Google Calendar freebusy API
  const response = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      items: [{ id: config.calendar_id }],
      timeZone: config.timezone,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[GoogleCalendar] Freebusy API error:', errorText)
    
    // If 401, token might be invalid
    if (response.status === 401) {
      // Try refreshing and retry once
      const { accessToken: newToken } = await refreshAccessToken(config)
      return fetchBusyTimes({ ...config, access_token: newToken }, startDate, endDate)
    }
    
    throw new Error(`Calendar API error: ${response.status}`)
  }

  const data = await response.json()
  const busyTimes: BusyTime[] = data.calendars[config.calendar_id]?.busy || []

  return busyTimes
}

/**
 * Generate available time slots based on working hours and busy times
 */
export function generateAvailableSlots(
  date: Date,
  config: CalendarConfig,
  busyTimes: BusyTime[]
): AvailableSlot[] {
  const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()]
  const workingHours = config.working_hours[dayOfWeek]

  if (!workingHours || !workingHours.enabled) {
    return [] // Not a working day
  }

  const slots: AvailableSlot[] = []
  const [startHour, startMin] = workingHours.start.split(':').map(Number)
  const [endHour, endMin] = workingHours.end.split(':').map(Number)

  // Generate 30-minute slots (or tour_duration_minutes)
  const slotDuration = config.tour_duration_minutes
  let currentMinutes = startHour * 60 + startMin

  const endMinutes = endHour * 60 + endMin
  
  while (currentMinutes + slotDuration <= endMinutes) {
    const hour = Math.floor(currentMinutes / 60)
    const minute = currentMinutes % 60
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    
    // Check if this slot conflicts with busy times
    const slotStart = new Date(date)
    slotStart.setHours(hour, minute, 0, 0)
    
    const slotEnd = new Date(slotStart)
    slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration + config.buffer_minutes)

    const isAvailable = !busyTimes.some(busy => {
      const busyStart = new Date(busy.start)
      const busyEnd = new Date(busy.end)
      
      // Check for overlap
      return (
        (slotStart >= busyStart && slotStart < busyEnd) ||
        (slotEnd > busyStart && slotEnd <= busyEnd) ||
        (slotStart <= busyStart && slotEnd >= busyEnd)
      )
    })

    slots.push({
      time: timeStr,
      available: isAvailable,
    })

    currentMinutes += slotDuration
  }

  return slots
}

/**
 * Create a Google Calendar event for a tour booking
 */
export async function createCalendarEvent(
  config: CalendarConfig,
  tourDetails: {
    propertyName: string
    prospectName: string
    prospectEmail: string
    prospectPhone?: string
    tourDate: string // YYYY-MM-DD
    tourTime: string // HH:MM
    specialRequests?: string
    propertyAddress?: string
  }
): Promise<{ eventId: string; htmlLink: string }> {
  // Ensure token is fresh
  const { accessToken } = await refreshAccessTokenIfNeeded(config)

  // Build event datetime
  const startDateTime = `${tourDetails.tourDate}T${tourDetails.tourTime}:00`
  const start = new Date(startDateTime)
  const end = new Date(start.getTime() + config.tour_duration_minutes * 60 * 1000)

  // Format description
  let description = `Property Tour with ${tourDetails.prospectName}\n\n`
  description += `Contact: ${tourDetails.prospectEmail}`
  if (tourDetails.prospectPhone) {
    description += ` | ${tourDetails.prospectPhone}`
  }
  if (tourDetails.specialRequests) {
    description += `\n\nSpecial Requests: ${tourDetails.specialRequests}`
  }
  description += `\n\nBooked via LumaLeasing widget`

  // Create event
  const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${config.calendar_id}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `Tour - ${tourDetails.propertyName}`,
      description,
      location: tourDetails.propertyAddress || '',
      start: {
        dateTime: start.toISOString(),
        timeZone: config.timezone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: config.timezone,
      },
      attendees: [
        { email: tourDetails.prospectEmail }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 }, // 24hr
          { method: 'email', minutes: 60 }    // 1hr
        ]
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[GoogleCalendar] Event creation failed:', errorText)
    
    // Retry once if 401
    if (response.status === 401) {
      const { accessToken: newToken } = await refreshAccessToken(config)
      return createCalendarEvent({ ...config, access_token: newToken }, tourDetails)
    }
    
    throw new Error(`Failed to create calendar event: ${response.status}`)
  }

  const event = await response.json()
  
  return {
    eventId: event.id,
    htmlLink: event.htmlLink,
  }
}

/**
 * Get calendar configuration for a property
 */
export async function getCalendarConfig(propertyId: string): Promise<CalendarConfig | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('agent_calendars')
    .select('*')
    .eq('property_id', propertyId)
    .eq('sync_enabled', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as CalendarConfig
}
