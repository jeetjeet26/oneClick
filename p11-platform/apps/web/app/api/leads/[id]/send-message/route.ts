/**
 * Send Message API
 * Sends a manual message to a lead via SMS or Email
 */

import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendMessage, replaceTemplateVariables, type TemplateVariables } from '@/utils/services/messaging'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient()
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await params
    const body = await request.json()
    const { channel, message, templateSlug } = body

    if (!channel || !['sms', 'email'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }

    if (!message && !templateSlug) {
      return NextResponse.json({ error: 'Message or template slug required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get lead info
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, properties(id, name)')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Determine message content
    let messageBody = message
    let messageSubject = body.subject

    if (templateSlug) {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('follow_up_templates')
        .select('*')
        .eq('property_id', lead.property_id)
        .eq('slug', templateSlug)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      // Prepare variables
      const variables: TemplateVariables = {
        first_name: lead.first_name,
        last_name: lead.last_name,
        property_name: lead.properties?.name || 'Our Property',
        tour_link: `${process.env.NEXT_PUBLIC_SITE_URL}/book-tour/${lead.id}`,
      }

      messageBody = replaceTemplateVariables(template.body, variables)
      if (template.subject) {
        messageSubject = replaceTemplateVariables(template.subject, variables)
      }
    }

    // Validate recipient
    const recipient = channel === 'sms' ? lead.phone : lead.email
    if (!recipient) {
      return NextResponse.json(
        { error: `Lead has no ${channel === 'sms' ? 'phone number' : 'email address'}` },
        { status: 400 }
      )
    }

    // Send message
    const result = await sendMessage({
      to: recipient,
      channel,
      body: messageBody,
      subject: messageSubject || `Message from ${lead.properties?.name || 'Our Team'}`,
      propertyName: lead.properties?.name,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 500 }
      )
    }

    // Log to conversation
    let conversationId: string

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('channel', channel)
      .single()

    if (existingConv) {
      conversationId = existingConv.id
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          property_id: lead.property_id,
          channel,
        })
        .select('id')
        .single()
      conversationId = newConv?.id || ''
    }

    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: messageBody,
      })
    }

    // Update lead
    await supabase
      .from('leads')
      .update({
        last_contacted_at: new Date().toISOString(),
        status: lead.status === 'new' ? 'contacted' : lead.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      channel,
    })
  } catch (error) {
    console.error('[Send Message] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

