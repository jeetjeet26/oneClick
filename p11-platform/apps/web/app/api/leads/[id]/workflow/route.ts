import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get workflow status for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await params

    // Get lead workflow with definition and actions
    const { data: workflow, error } = await supabase
      .from('lead_workflows')
      .select(`
        id,
        current_step,
        status,
        last_action_at,
        next_action_at,
        created_at,
        workflow:workflow_definitions(
          id,
          name,
          steps,
          exit_conditions
        ),
        actions:workflow_actions(
          id,
          step_number,
          action_type,
          status,
          created_at
        )
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching workflow:', error)
      return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 })
    }

    return NextResponse.json({ workflow })
  } catch (error) {
    console.error('Workflow API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update workflow status (pause, resume, stop)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await params
    const body = await request.json()
    const { action } = body

    if (!action || !['pause', 'resume', 'stop'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const statusMap: Record<string, string> = {
      pause: 'paused',
      resume: 'active',
      stop: 'stopped',
    }

    const updateData: Record<string, unknown> = {
      status: statusMap[action],
      updated_at: new Date().toISOString(),
    }

    if (action === 'resume') {
      // Recalculate next action time when resuming
      updateData.next_action_at = new Date().toISOString()
    }

    const { data: workflow, error } = await supabase
      .from('lead_workflows')
      .update(updateData)
      .eq('lead_id', leadId)
      .eq('status', action === 'resume' ? 'paused' : 'active')
      .select()
      .single()

    if (error) {
      console.error('Error updating workflow:', error)
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
    }

    return NextResponse.json({ workflow })
  } catch (error) {
    console.error('Workflow update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

