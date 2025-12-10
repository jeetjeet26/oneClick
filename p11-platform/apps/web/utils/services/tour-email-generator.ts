/**
 * LLM-Powered Tour Email Generator
 * Uses GPT-4o-mini to craft personalized, conversion-focused tour confirmation emails
 */

import OpenAI from 'openai'

// Types
export interface TourEmailContext {
  // Lead info
  lead: {
    firstName: string
    lastName?: string
    email: string
    source: string
    moveInDate?: string | null
    bedrooms?: string | null
    notes?: string | null
  }
  // Tour info
  tour: {
    date: string // formatted like "Wednesday, December 11, 2024"
    time: string // formatted like "10:00 AM"
    type: 'in_person' | 'virtual' | 'self_guided'
  }
  // Property info
  property: {
    name: string
    address?: string
    websiteUrl?: string
    amenities?: string[]
    petPolicy?: Record<string, unknown>
    parkingInfo?: Record<string, unknown>
    brandVoice?: string
    officeHours?: Record<string, unknown>
  }
  // Conversation history (from Luma or other sources)
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  // Is this a reschedule?
  isReschedule?: boolean
}

export interface GeneratedEmail {
  subject: string
  textBody: string
  htmlBody: string
}

/**
 * Generate a personalized tour confirmation email using LLM
 */
export async function generateTourEmail(context: TourEmailContext): Promise<GeneratedEmail> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  // Build the context prompt
  const contextPrompt = buildContextPrompt(context)
  
  const systemPrompt = `You are an expert leasing agent copywriter. Your job is to write personalized, conversion-focused tour confirmation emails that get prospects excited about their upcoming visit.

GOALS:
1. Confirm the tour details clearly
2. Build excitement and anticipation
3. Reduce no-shows by creating commitment
4. Highlight 1-2 relevant property features based on what you know about the prospect
5. Include a clear call-to-action

STYLE GUIDELINES:
- Warm and professional, not salesy or pushy
- Conversational but polished
- Keep it concise (under 200 words for the body)
- Use the prospect's first name
${context.property.brandVoice ? `- Brand voice: ${context.property.brandVoice}` : '- Default to friendly and welcoming'}

FORMAT:
Return a JSON object with exactly these fields:
{
  "subject": "Email subject line (compelling, under 60 chars)",
  "textBody": "Plain text version of the email",
  "htmlBody": "HTML version with basic formatting (use <p>, <strong>, <br> tags only)"
}

IMPORTANT:
- Do NOT include unsubscribe links or legal footers (we add those separately)
- Do NOT make up information you don't have
- If you don't know specific amenities they're interested in, keep it general
- Always include the exact tour date, time, and type`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(responseText)

    // Validate and return
    return {
      subject: parsed.subject || `Your Tour at ${context.property.name} is Confirmed!`,
      textBody: parsed.textBody || buildFallbackText(context),
      htmlBody: parsed.htmlBody || buildFallbackHtml(context)
    }
  } catch (error) {
    console.error('[Tour Email Generator] LLM error, using fallback:', error)
    // Return fallback email if LLM fails
    return {
      subject: context.isReschedule 
        ? `Your Tour at ${context.property.name} Has Been Rescheduled`
        : `Your Tour at ${context.property.name} is Confirmed!`,
      textBody: buildFallbackText(context),
      htmlBody: buildFallbackHtml(context)
    }
  }
}

/**
 * Build the context prompt with all available information
 */
function buildContextPrompt(context: TourEmailContext): string {
  const { lead, tour, property, conversationHistory, isReschedule } = context
  
  let prompt = `Generate a ${isReschedule ? 'tour reschedule' : 'tour confirmation'} email for this prospect:

PROSPECT INFORMATION:
- Name: ${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}
- Source: ${lead.source}
${lead.moveInDate ? `- Move-in timeline: ${lead.moveInDate}` : ''}
${lead.bedrooms ? `- Looking for: ${lead.bedrooms} bedroom(s)` : ''}
${lead.notes ? `- Notes: ${lead.notes}` : ''}

TOUR DETAILS:
- Date: ${tour.date}
- Time: ${tour.time}
- Type: ${formatTourType(tour.type)}

PROPERTY INFORMATION:
- Name: ${property.name}
${property.address ? `- Address: ${property.address}` : ''}
${property.websiteUrl ? `- Website: ${property.websiteUrl}` : ''}
${property.amenities?.length ? `- Key amenities: ${property.amenities.slice(0, 5).join(', ')}` : ''}
${property.petPolicy && Object.keys(property.petPolicy).length > 0 ? `- Pet-friendly: Yes` : ''}
${property.parkingInfo && Object.keys(property.parkingInfo).length > 0 ? `- Parking available: Yes` : ''}`

  // Add conversation history if available (this is the key agentic part!)
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += `

CONVERSATION HISTORY (from their chat with our AI assistant):
This gives you insight into what they're specifically interested in:
---
${conversationHistory.slice(-10).map(msg => `${msg.role === 'user' ? 'Prospect' : 'Assistant'}: ${msg.content}`).join('\n')}
---
Use this context to personalize the email! Reference specific things they asked about.`
  }

  return prompt
}

/**
 * Format tour type for display
 */
function formatTourType(type: string): string {
  const types: Record<string, string> = {
    'in_person': 'In-Person Tour',
    'virtual': 'Virtual Tour',
    'self_guided': 'Self-Guided Tour'
  }
  return types[type] || 'Tour'
}

/**
 * Fallback plain text email if LLM fails
 */
function buildFallbackText(context: TourEmailContext): string {
  const { lead, tour, property, isReschedule } = context
  
  return `Hi ${lead.firstName},

${isReschedule 
  ? `Your tour at ${property.name} has been rescheduled.`
  : `Great news! Your tour at ${property.name} is confirmed.`}

Here are your tour details:
📅 Date: ${tour.date}
🕐 Time: ${tour.time}
📍 Type: ${formatTourType(tour.type)}
${property.address ? `📍 Address: ${property.address}` : ''}

We're excited to show you around and answer any questions you have about making ${property.name} your new home.

${tour.type === 'virtual' 
  ? 'You\'ll receive a video call link before your scheduled time.'
  : 'When you arrive, just check in at the leasing office and we\'ll take care of the rest.'}

If you need to reschedule, just reply to this email or give us a call.

See you soon!

The ${property.name} Team`
}

/**
 * Fallback HTML email if LLM fails
 */
function buildFallbackHtml(context: TourEmailContext): string {
  const { lead, tour, property, isReschedule } = context
  
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <p style="font-size: 16px; line-height: 1.6;">Hi ${lead.firstName},</p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    ${isReschedule 
      ? `Your tour at <strong>${property.name}</strong> has been rescheduled.`
      : `Great news! Your tour at <strong>${property.name}</strong> is confirmed.`}
  </p>
  
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 24px; margin: 24px 0; color: white;">
    <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.9;">YOUR TOUR DETAILS</p>
    <p style="margin: 0 0 4px 0; font-size: 18px;"><strong>📅 ${tour.date}</strong></p>
    <p style="margin: 0 0 4px 0; font-size: 18px;"><strong>🕐 ${tour.time}</strong></p>
    <p style="margin: 0; font-size: 16px;">${formatTourType(tour.type)}</p>
    ${property.address ? `<p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">📍 ${property.address}</p>` : ''}
  </div>
  
  <p style="font-size: 16px; line-height: 1.6;">
    We're excited to show you around and answer any questions you have about making ${property.name} your new home.
  </p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    ${tour.type === 'virtual' 
      ? 'You\'ll receive a video call link before your scheduled time.'
      : 'When you arrive, just check in at the leasing office and we\'ll take care of the rest.'}
  </p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    If you need to reschedule, just reply to this email or give us a call.
  </p>
  
  <p style="font-size: 16px; line-height: 1.6; margin-top: 32px;">
    See you soon!<br>
    <strong>The ${property.name} Team</strong>
  </p>
</div>`
}

/**
 * Send a tour confirmation email using the LLM generator
 */
export async function sendTourConfirmationEmail(
  context: TourEmailContext,
  sendEmailFn: (to: string, subject: string, body: string, html?: string) => Promise<{ success: boolean; messageId?: string; error?: string }>
): Promise<{ success: boolean; messageId?: string; error?: string; generatedEmail?: GeneratedEmail }> {
  try {
    // Generate the personalized email
    const generatedEmail = await generateTourEmail(context)
    
    console.log('[Tour Email] Generated personalized email:', {
      to: context.lead.email,
      subject: generatedEmail.subject,
      bodyPreview: generatedEmail.textBody.substring(0, 100) + '...'
    })
    
    // Send it
    const result = await sendEmailFn(
      context.lead.email,
      generatedEmail.subject,
      generatedEmail.textBody,
      generatedEmail.htmlBody
    )
    
    return {
      ...result,
      generatedEmail
    }
  } catch (error) {
    console.error('[Tour Email] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate/send email'
    }
  }
}




