/**
 * TourSpark Messaging Service
 * Handles SMS (Twilio) and Email (Resend) sending
 */

import Twilio from 'twilio'
import { Resend } from 'resend'

// Types
export type MessageChannel = 'sms' | 'email'

export interface SendMessageOptions {
  to: string
  channel: MessageChannel
  body: string
  subject?: string // Required for email
  from?: string
  propertyName?: string
}

export interface MessageResult {
  success: boolean
  messageId?: string
  error?: string
  channel: MessageChannel
}

export interface TemplateVariables {
  first_name?: string
  last_name?: string
  property_name?: string
  tour_link?: string
  tour_time?: string
  tour_date?: string
  [key: string]: string | undefined
}

// Initialize clients (lazy)
let twilioClient: Twilio.Twilio | null = null
let resendClient: Resend | null = null

function getTwilioClient(): Twilio.Twilio | null {
  if (twilioClient) return twilioClient
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  
  if (!accountSid || !authToken) {
    console.warn('[Messaging] Twilio credentials not configured')
    return null
  }
  
  twilioClient = Twilio(accountSid, authToken)
  return twilioClient
}

function getResendClient(): Resend | null {
  if (resendClient) return resendClient
  
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.warn('[Messaging] Resend API key not configured')
    return null
  }
  
  resendClient = new Resend(apiKey)
  return resendClient
}

/**
 * Replace template variables in message body
 * Variables are in format {{variable_name}}
 */
export function replaceTemplateVariables(
  template: string, 
  variables: TemplateVariables
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match
  })
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(
  to: string,
  body: string,
  from?: string
): Promise<MessageResult> {
  const client = getTwilioClient()
  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER
  
  if (!client || !fromNumber) {
    // Dev mode: log instead of sending
    console.log('[SMS Dev Mode] Would send SMS:')
    console.log(`  To: ${to}`)
    console.log(`  From: ${fromNumber || 'NOT_CONFIGURED'}`)
    console.log(`  Body: ${body}`)
    
    return {
      success: true,
      messageId: `dev_${Date.now()}`,
      channel: 'sms',
    }
  }
  
  try {
    const message = await client.messages.create({
      to,
      from: fromNumber,
      body,
    })
    
    console.log(`[SMS] Sent to ${to}: ${message.sid}`)
    
    return {
      success: true,
      messageId: message.sid,
      channel: 'sms',
    }
  } catch (error) {
    console.error('[SMS] Error sending:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      channel: 'sms',
    }
  }
}

// Email attachment type
export interface EmailAttachment {
  filename: string
  content: string // base64 encoded
  contentType?: string
}

/**
 * Send Email via Resend
 * Supports plain text, HTML, and attachments (including .ics calendar invites)
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  from?: string,
  html?: string,
  attachments?: EmailAttachment[]
): Promise<MessageResult> {
  const client = getResendClient()
  const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  
  // Validate inputs
  if (!to || !subject || !body) {
    console.error('[Email] Missing required fields:', { to: !!to, subject: !!subject, body: !!body })
    return {
      success: false,
      error: 'Missing required fields: to, subject, or body',
      channel: 'email',
    }
  }
  
  if (!client) {
    // Dev mode: log instead of sending
    console.log('[Email Dev Mode] Would send email:')
    console.log(`  To: ${to}`)
    console.log(`  From: ${fromEmail}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Body: ${body.substring(0, 200)}...`)
    console.log(`  Has HTML: ${!!html}`)
    console.log(`  Attachments: ${attachments?.length || 0}`)
    if (attachments?.length) {
      attachments.forEach(a => console.log(`    - ${a.filename} (${a.contentType})`))
    }
    
    return {
      success: true,
      messageId: `dev_${Date.now()}`,
      channel: 'email',
    }
  }
  
  try {
    console.log(`[Email] Attempting to send to ${to} from ${fromEmail}`)
    console.log(`[Email] Subject: ${subject}`)
    console.log(`[Email] Has HTML: ${!!html}`)
    console.log(`[Email] Attachments: ${attachments?.length || 0}`)
    
    // Build Resend attachments format
    const resendAttachments = attachments?.map(att => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
      content_type: att.contentType
    }))
    
    const result = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      text: body,
      ...(html && { html }),
      ...(resendAttachments?.length && { attachments: resendAttachments }),
    })
    
    console.log(`[Email] Resend API Response:`, JSON.stringify(result, null, 2))
    
    // Resend SDK types vary by version; guard safely.
    const maybeError = (result as any)?.error
    if (maybeError) {
      console.error('[Email] Resend API returned error:', maybeError)
      return {
        success: false,
        error: typeof maybeError === 'string' ? maybeError : JSON.stringify(maybeError),
        channel: 'email',
      }
    }
    
    const messageId = (result as any)?.data?.id ?? (result as any)?.id
    console.log(`[Email] ✅ Successfully sent to ${to}, Message ID: ${messageId}`)
    
    return {
      success: true,
      messageId,
      channel: 'email',
    }
  } catch (error) {
    console.error('[Email] ❌ Exception while sending:', error)
    if (error instanceof Error) {
      console.error('[Email] Error stack:', error.stack)
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      channel: 'email',
    }
  }
}

/**
 * Send a message via the appropriate channel
 */
export async function sendMessage(options: SendMessageOptions): Promise<MessageResult> {
  const { to, channel, body, subject } = options
  
  if (channel === 'sms') {
    return sendSMS(to, body, options.from)
  } else if (channel === 'email') {
    if (!subject) {
      return {
        success: false,
        error: 'Subject is required for email',
        channel: 'email',
      }
    }
    return sendEmail(to, subject, body, options.from)
  }
  
  return {
    success: false,
    error: `Unknown channel: ${channel}`,
    channel,
  }
}

/**
 * Check if messaging is configured
 */
export function isMessagingConfigured(): { sms: boolean; email: boolean } {
  return {
    sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
    email: !!process.env.RESEND_API_KEY,
  }
}

