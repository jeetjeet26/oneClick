/**
 * TourSpark Tour Reminder Processor
 * Sends automated reminders 24 hours and 1 hour before scheduled tours
 */

import { createServiceClient } from '@/utils/supabase/admin'
import { sendMessage, replaceTemplateVariables, type TemplateVariables } from './messaging'
import { format, parseISO, addHours, isBefore, isAfter, subHours } from 'date-fns'

export interface TourWithLead {
  id: string
  lead_id: string
  property_id: string
  tour_date: string
  tour_time: string
  tour_type: 'in_person' | 'virtual' | 'self_guided'
  status: string
  confirmation_sent_at: string | null
  reminder_24h_sent_at: string | null
  reminder_sent_at: string | null
  leads: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
  }
  properties: {
    id: string
    name: string
    address: {
      street?: string
      city?: string
      state?: string
      zip?: string
    } | null
  }
}

export interface ReminderResult {
  processed: number
  reminders24h: number
  reminders1h: number
  failed: number
  errors: string[]
}

const TOUR_TYPE_LABELS: Record<string, string> = {
  in_person: 'In-Person Tour',
  virtual: 'Virtual Tour',
  self_guided: 'Self-Guided Tour',
}

/**
 * Process all pending tour reminders
 * Should be called by a CRON job every 15-30 minutes
 */
export async function processTourReminders(): Promise<ReminderResult> {
  const supabase = createServiceClient()
  const now = new Date()
  const result: ReminderResult = {
    processed: 0,
    reminders24h: 0,
    reminders1h: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Fetch all scheduled tours that need reminders
    // We look for tours happening in the next 25 hours (to catch 24h reminders)
    const tomorrow = addHours(now, 25)
    const todayStr = format(now, 'yyyy-MM-dd')
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd')

    const { data: tours, error } = await supabase
      .from('tours')
      .select(`
        id,
        lead_id,
        property_id,
        tour_date,
        tour_time,
        tour_type,
        status,
        confirmation_sent_at,
        reminder_24h_sent_at,
        reminder_sent_at,
        leads!inner (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        properties:property_id (
          id,
          name,
          address
        )
      `)
      .eq('status', 'scheduled')
      .or(`tour_date.eq.${todayStr},tour_date.eq.${tomorrowStr}`)
      .order('tour_date', { ascending: true })
      .order('tour_time', { ascending: true })

    if (error) {
      console.error('[TourReminders] Error fetching tours:', error)
      result.errors.push(error.message)
      return result
    }

    if (!tours || tours.length === 0) {
      console.log('[TourReminders] No upcoming tours found')
      return result
    }

    console.log(`[TourReminders] Found ${tours.length} upcoming tours to check`)

    // Process each tour
    for (const tour of tours as unknown as TourWithLead[]) {
      result.processed++

      // Parse tour datetime
      const tourDateTime = parseISO(`${tour.tour_date}T${tour.tour_time}`)
      const hoursUntilTour = (tourDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Skip past tours
      if (isBefore(tourDateTime, now)) {
        continue
      }

      // Check if lead has contact info
      const lead = tour.leads
      if (!lead.phone && !lead.email) {
        console.log(`[TourReminders] Skipping tour ${tour.id} - no contact info`)
        continue
      }

      try {
        // 24h reminder: Send if tour is 22-25 hours away and not sent yet
        if (hoursUntilTour >= 22 && hoursUntilTour <= 25 && !tour.reminder_24h_sent_at) {
          await send24hReminder(supabase, tour)
          result.reminders24h++
        }
        // 1h reminder: Send if tour is 0.5-1.5 hours away and not sent yet
        else if (hoursUntilTour >= 0.5 && hoursUntilTour <= 1.5 && !tour.reminder_sent_at) {
          await send1hReminder(supabase, tour)
          result.reminders1h++
        }
      } catch (err) {
        result.failed++
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        result.errors.push(`Tour ${tour.id}: ${errorMsg}`)
      }
    }

    console.log(
      `[TourReminders] Processed: ${result.processed}, 24h sent: ${result.reminders24h}, 1h sent: ${result.reminders1h}, Failed: ${result.failed}`
    )

    return result
  } catch (err) {
    console.error('[TourReminders] Fatal error:', err)
    result.errors.push(err instanceof Error ? err.message : 'Unknown fatal error')
    return result
  }
}

/**
 * Send 24-hour reminder
 */
async function send24hReminder(
  supabase: ReturnType<typeof createServiceClient>,
  tour: TourWithLead
): Promise<void> {
  const lead = tour.leads
  const property = tour.properties
  const variables = buildTemplateVariables(tour)

  console.log(`[TourReminders] Sending 24h reminder for tour ${tour.id} to ${lead.first_name}`)

  // Try SMS first
  if (lead.phone) {
    const smsBody = build24hSmsMessage(variables)
    const smsResult = await sendMessage({
      to: lead.phone,
      channel: 'sms',
      body: smsBody,
      propertyName: property?.name,
    })

    if (!smsResult.success) {
      console.error(`[TourReminders] SMS failed for tour ${tour.id}:`, smsResult.error)
    }
  }

  // Also send email if available
  if (lead.email) {
    const emailBody = build24hEmailMessage(variables)
    const emailResult = await sendMessage({
      to: lead.email,
      channel: 'email',
      subject: `Reminder: Your tour at ${property?.name || 'the property'} is tomorrow!`,
      body: emailBody,
      propertyName: property?.name,
    })

    if (!emailResult.success) {
      console.error(`[TourReminders] Email failed for tour ${tour.id}:`, emailResult.error)
    }
  }

  // Mark reminder as sent
  await supabase
    .from('tours')
    .update({
      reminder_24h_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tour.id)
}

/**
 * Send 1-hour reminder
 */
async function send1hReminder(
  supabase: ReturnType<typeof createServiceClient>,
  tour: TourWithLead
): Promise<void> {
  const lead = tour.leads
  const property = tour.properties
  const variables = buildTemplateVariables(tour)

  console.log(`[TourReminders] Sending 1h reminder for tour ${tour.id} to ${lead.first_name}`)

  // SMS is most effective for last-minute reminders
  if (lead.phone) {
    const smsBody = build1hSmsMessage(variables)
    const smsResult = await sendMessage({
      to: lead.phone,
      channel: 'sms',
      body: smsBody,
      propertyName: property?.name,
    })

    if (!smsResult.success) {
      console.error(`[TourReminders] SMS failed for tour ${tour.id}:`, smsResult.error)
    }
  }

  // Mark reminder as sent
  await supabase
    .from('tours')
    .update({
      reminder_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tour.id)
}

/**
 * Build template variables for messages
 */
function buildTemplateVariables(tour: TourWithLead): TemplateVariables {
  const lead = tour.leads
  const property = tour.properties
  const tourDateTime = parseISO(`${tour.tour_date}T${tour.tour_time}`)

  return {
    first_name: lead.first_name,
    last_name: lead.last_name,
    property_name: property?.name || 'the property',
    tour_date: format(tourDateTime, 'EEEE, MMMM d'),
    tour_time: format(tourDateTime, 'h:mm a'),
    tour_type: TOUR_TYPE_LABELS[tour.tour_type] || 'Tour',
    property_address: property?.address?.street || '',
    property_city: property?.address?.city || '',
  }
}

/**
 * Build 24-hour SMS reminder message
 */
function build24hSmsMessage(variables: TemplateVariables): string {
  return `Hi ${variables.first_name}! 🏠 Just a reminder - your ${variables.tour_type?.toLowerCase()} at ${variables.property_name} is tomorrow at ${variables.tour_time}. We look forward to seeing you! Reply HELP for assistance or STOP to opt out.`
}

/**
 * Build 24-hour email reminder message
 */
function build24hEmailMessage(variables: TemplateVariables): string {
  return `Hi ${variables.first_name},

This is a friendly reminder that your ${variables.tour_type?.toLowerCase()} at ${variables.property_name} is scheduled for tomorrow!

📅 Date: ${variables.tour_date}
🕐 Time: ${variables.tour_time}
📍 Address: ${variables.property_address}${variables.property_city ? `, ${variables.property_city}` : ''}

What to Expect:
• Plan to arrive 5-10 minutes early
• Bring a valid ID
• Feel free to bring anyone who will be living with you

Need to reschedule? Just reply to this email or give us a call.

We look forward to meeting you!

Best regards,
${variables.property_name} Leasing Team`
}

/**
 * Build 1-hour SMS reminder message
 */
function build1hSmsMessage(variables: TemplateVariables): string {
  return `Hi ${variables.first_name}! Your tour at ${variables.property_name} starts in about an hour at ${variables.tour_time}. See you soon! 🔑`
}

/**
 * Get pending reminders count (for dashboard display)
 */
export async function getPendingRemindersCount(): Promise<{
  reminders24h: number
  reminders1h: number
}> {
  const supabase = createServiceClient()
  const now = new Date()
  const tomorrow = addHours(now, 25)
  const todayStr = format(now, 'yyyy-MM-dd')
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd')

  const { data: tours } = await supabase
    .from('tours')
    .select('id, tour_date, tour_time, reminder_24h_sent_at, reminder_sent_at')
    .eq('status', 'scheduled')
    .or(`tour_date.eq.${todayStr},tour_date.eq.${tomorrowStr}`)

  let reminders24h = 0
  let reminders1h = 0

  if (tours) {
    for (const tour of tours) {
      const tourDateTime = parseISO(`${tour.tour_date}T${tour.tour_time}`)
      const hoursUntilTour = (tourDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursUntilTour >= 22 && hoursUntilTour <= 25 && !tour.reminder_24h_sent_at) {
        reminders24h++
      } else if (hoursUntilTour >= 0.5 && hoursUntilTour <= 1.5 && !tour.reminder_sent_at) {
        reminders1h++
      }
    }
  }

  return { reminders24h, reminders1h }
}

