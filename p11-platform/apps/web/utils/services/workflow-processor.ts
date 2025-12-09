/**
 * TourSpark Workflow Processor
 * Processes automated follow-up workflows
 */

import { createServiceClient } from '@/utils/supabase/admin'
import { sendMessage, replaceTemplateVariables, type TemplateVariables } from './messaging'

export interface WorkflowStep {
  id: number
  delay_hours: number
  action: 'sms' | 'email' | 'wait'
  template_slug: string
}

export interface LeadWorkflowRow {
  id: string
  lead_id: string
  workflow_id: string
  current_step: number
  status: 'active' | 'paused' | 'completed' | 'converted' | 'stopped'
  last_action_at: string
  next_action_at: string | null
  workflow_definitions: {
    id: string
    name: string
    steps: WorkflowStep[]
    exit_conditions: string[]
    property_id: string
  }
  leads: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
    status: string
  }
}

export interface ProcessResult {
  processed: number
  succeeded: number
  failed: number
  errors: string[]
}

/**
 * Process all pending workflow actions
 * Should be called by a CRON job every 10 minutes
 */
export async function processWorkflows(): Promise<ProcessResult> {
  const supabase = createServiceClient()
  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Get all active workflows that are due for next action
    const { data: workflows, error } = await supabase
      .from('lead_workflows')
      .select(`
        id,
        lead_id,
        workflow_id,
        current_step,
        status,
        last_action_at,
        next_action_at,
        workflow_definitions!inner (
          id,
          name,
          steps,
          exit_conditions,
          property_id
        ),
        leads!inner (
          id,
          first_name,
          last_name,
          email,
          phone,
          status
        )
      `)
      .eq('status', 'active')
      .lte('next_action_at', new Date().toISOString())
      .limit(100) // Process in batches

    if (error) {
      console.error('[Workflow] Error fetching workflows:', error)
      result.errors.push(error.message)
      return result
    }

    if (!workflows || workflows.length === 0) {
      console.log('[Workflow] No pending workflows to process')
      return result
    }

    console.log(`[Workflow] Processing ${workflows.length} workflows`)

    // Process each workflow
    for (const workflow of workflows as unknown as LeadWorkflowRow[]) {
      result.processed++

      try {
        const processResult = await processWorkflowStep(supabase, workflow)
        if (processResult.success) {
          result.succeeded++
        } else {
          result.failed++
          if (processResult.error) {
            result.errors.push(`Lead ${workflow.lead_id}: ${processResult.error}`)
          }
        }
      } catch (err) {
        result.failed++
        result.errors.push(`Lead ${workflow.lead_id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    console.log(`[Workflow] Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`)
    return result
  } catch (err) {
    console.error('[Workflow] Fatal error:', err)
    result.errors.push(err instanceof Error ? err.message : 'Unknown fatal error')
    return result
  }
}

/**
 * Process a single workflow step
 */
async function processWorkflowStep(
  supabase: ReturnType<typeof createServiceClient>,
  workflow: LeadWorkflowRow
): Promise<{ success: boolean; error?: string }> {
  const lead = workflow.leads
  const definition = workflow.workflow_definitions
  const steps = definition.steps as WorkflowStep[]
  const currentStepIndex = workflow.current_step

  // Check if workflow is complete
  if (currentStepIndex >= steps.length) {
    await updateWorkflowStatus(supabase, workflow.id, 'completed')
    return { success: true }
  }

  // Check exit conditions (lead status)
  const exitConditions = definition.exit_conditions as string[]
  if (exitConditions.includes(lead.status)) {
    const newStatus = lead.status === 'leased' ? 'converted' : 'stopped'
    await updateWorkflowStatus(supabase, workflow.id, newStatus)
    return { success: true }
  }

  const currentStep = steps[currentStepIndex]

  // Get template for this step
  const { data: template, error: templateError } = await supabase
    .from('follow_up_templates')
    .select('*')
    .eq('property_id', definition.property_id)
    .eq('slug', currentStep.template_slug)
    .single()

  if (templateError || !template) {
    console.error(`[Workflow] Template not found: ${currentStep.template_slug}`)
    return { success: false, error: `Template not found: ${currentStep.template_slug}` }
  }

  // Get property info
  const { data: property } = await supabase
    .from('properties')
    .select('name, settings')
    .eq('id', definition.property_id)
    .single()

  // Prepare template variables
  const variables: TemplateVariables = {
    first_name: lead.first_name,
    last_name: lead.last_name,
    property_name: property?.name || 'Our Property',
    tour_link: `${process.env.NEXT_PUBLIC_SITE_URL}/book-tour/${lead.id}`,
  }

  // Replace variables in template
  const messageBody = replaceTemplateVariables(template.body, variables)
  const messageSubject = template.subject 
    ? replaceTemplateVariables(template.subject, variables) 
    : undefined

  // Determine recipient
  const recipient = currentStep.action === 'sms' ? lead.phone : lead.email
  if (!recipient) {
    console.warn(`[Workflow] No ${currentStep.action} address for lead ${lead.id}`)
    // Skip this step and move to next
    await advanceWorkflow(supabase, workflow, steps)
    return { success: true }
  }

  // Send message
  const sendResult = await sendMessage({
    to: recipient,
    channel: currentStep.action as 'sms' | 'email',
    body: messageBody,
    subject: messageSubject,
    propertyName: property?.name,
  })

  // Log the action
  await supabase.from('workflow_actions').insert({
    lead_workflow_id: workflow.id,
    step_number: currentStepIndex,
    action_type: currentStep.action,
    template_id: template.id,
    status: sendResult.success ? 'sent' : 'failed',
    external_id: sendResult.messageId,
    error_message: sendResult.error,
  })

  // Also log to messages/conversations for visibility
  if (sendResult.success) {
    // Get or create conversation
    let conversationId: string

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('channel', currentStep.action)
      .single()

    if (existingConv) {
      conversationId = existingConv.id
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          property_id: definition.property_id,
          channel: currentStep.action,
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

    // Update lead's last_contacted_at
    await supabase
      .from('leads')
      .update({ 
        last_contacted_at: new Date().toISOString(),
        status: lead.status === 'new' ? 'contacted' : lead.status,
      })
      .eq('id', lead.id)
  }

  // Advance to next step
  await advanceWorkflow(supabase, workflow, steps)

  return { success: sendResult.success, error: sendResult.error }
}

/**
 * Advance workflow to next step
 */
async function advanceWorkflow(
  supabase: ReturnType<typeof createServiceClient>,
  workflow: LeadWorkflowRow,
  steps: WorkflowStep[]
) {
  const nextStepIndex = workflow.current_step + 1
  const now = new Date()

  if (nextStepIndex >= steps.length) {
    // Workflow complete
    await supabase
      .from('lead_workflows')
      .update({
        current_step: nextStepIndex,
        status: 'completed',
        last_action_at: now.toISOString(),
        next_action_at: null,
        updated_at: now.toISOString(),
      })
      .eq('id', workflow.id)
  } else {
    // Calculate next action time
    const nextStep = steps[nextStepIndex]
    const nextActionAt = new Date(now.getTime() + nextStep.delay_hours * 60 * 60 * 1000)

    await supabase
      .from('lead_workflows')
      .update({
        current_step: nextStepIndex,
        last_action_at: now.toISOString(),
        next_action_at: nextActionAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', workflow.id)
  }
}

/**
 * Update workflow status
 */
async function updateWorkflowStatus(
  supabase: ReturnType<typeof createServiceClient>,
  workflowId: string,
  status: 'active' | 'paused' | 'completed' | 'converted' | 'stopped'
) {
  await supabase
    .from('lead_workflows')
    .update({
      status,
      updated_at: new Date().toISOString(),
      next_action_at: status === 'active' ? new Date().toISOString() : null,
    })
    .eq('id', workflowId)
}

/**
 * Start a workflow for a lead
 */
export async function startWorkflow(
  leadId: string,
  propertyId: string,
  trigger: string = 'lead_created'
): Promise<{ success: boolean; workflowId?: string; error?: string }> {
  const supabase = createServiceClient()

  // Find active workflow for this trigger
  const { data: workflow, error } = await supabase
    .from('workflow_definitions')
    .select('id, steps')
    .eq('property_id', propertyId)
    .eq('trigger_on', trigger)
    .eq('is_active', true)
    .single()

  if (error || !workflow) {
    return { success: false, error: 'No active workflow found' }
  }

  const steps = workflow.steps as WorkflowStep[]
  const firstStep = steps[0]
  const nextActionAt = new Date(Date.now() + (firstStep?.delay_hours || 0) * 60 * 60 * 1000)

  // Create lead workflow
  const { data: leadWorkflow, error: insertError } = await supabase
    .from('lead_workflows')
    .insert({
      lead_id: leadId,
      workflow_id: workflow.id,
      current_step: 0,
      status: 'active',
      next_action_at: nextActionAt.toISOString(),
    })
    .select('id')
    .single()

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  return { success: true, workflowId: leadWorkflow?.id }
}

