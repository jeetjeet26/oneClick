/**
 * Human Takeover API
 * Allows agents to take over or release conversations from AI
 */

import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// POST - Take over conversation
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

    const { id: conversationId } = await params
    const supabase = createServiceClient()

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'manager'].includes(profile.role || '')) {
      return NextResponse.json(
        { error: 'Only admins and managers can take over conversations' },
        { status: 403 }
      )
    }

    // Update conversation to human mode
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update({
        is_human_mode: true,
        human_agent_id: profile.id,
        human_started_at: new Date().toISOString(),
        human_ended_at: null,
      })
      .eq('id', conversationId)
      .select(`
        id,
        is_human_mode,
        human_agent_id,
        human_started_at,
        lead:leads(id, first_name, last_name, email, phone)
      `)
      .single()

    if (error) {
      console.error('Error taking over conversation:', error)
      return NextResponse.json({ error: 'Failed to take over conversation' }, { status: 500 })
    }

    // Add system message about takeover
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'system',
      content: `A team member has joined the chat and will continue assisting you.`,
    })

    return NextResponse.json({
      success: true,
      conversation,
      message: 'You have taken over this conversation',
    })
  } catch (error) {
    console.error('Takeover API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Release conversation back to AI
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient()
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: conversationId } = await params
    const supabase = createServiceClient()

    // Get current conversation state
    const { data: current } = await supabase
      .from('conversations')
      .select('human_agent_id')
      .eq('id', conversationId)
      .single()

    // Only the agent who took over (or admin) can release
    if (current?.human_agent_id !== user.id) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only the assigned agent or admin can release this conversation' },
          { status: 403 }
        )
      }
    }

    // Update conversation back to AI mode
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update({
        is_human_mode: false,
        human_ended_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select('id, is_human_mode')
      .single()

    if (error) {
      console.error('Error releasing conversation:', error)
      return NextResponse.json({ error: 'Failed to release conversation' }, { status: 500 })
    }

    // Add system message about release
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'system',
      content: `Luma AI is back to assist you. How can I help?`,
    })

    return NextResponse.json({
      success: true,
      conversation,
      message: 'Conversation returned to AI mode',
    })
  } catch (error) {
    console.error('Release API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}







