import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { startWorkflow } from '@/utils/services/workflow-processor'
import { logAuditEvent } from '@/utils/audit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = (page - 1) * limit

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Build query
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('property_id', propertyId)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (source && source !== 'all') {
      query = query.eq('source', source)
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Apply sorting
    const validSortColumns = ['created_at', 'first_name', 'last_name', 'status', 'source']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: leads, error, count } = await query

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    // Get distinct sources for filters
    const { data: sources } = await supabase
      .from('leads')
      .select('source')
      .eq('property_id', propertyId)
      .not('source', 'is', null)

    const uniqueSources = [...new Set(sources?.map(s => s.source).filter(Boolean))]

    // Get status counts
    const { data: statusCounts } = await supabase
      .from('leads')
      .select('status')
      .eq('property_id', propertyId)

    const statusSummary = statusCounts?.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return NextResponse.json({
      leads: leads || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      filters: {
        sources: uniqueSources,
        statuses: ['new', 'contacted', 'tour_booked', 'leased', 'lost'],
      },
      statusSummary,
    })
  } catch (error) {
    console.error('Leads API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      propertyId, 
      firstName, 
      lastName, 
      email, 
      phone, 
      source, 
      moveInDate, 
      bedrooms, 
      notes 
    } = body

    // Validation
    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
    }
    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
    }

    // Create lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        property_id: propertyId,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        source: source || 'manual',
        move_in_date: moveInDate || null,
        bedrooms: bedrooms || null,
        notes: notes || null,
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }

    // Start workflow for new lead (if auto-workflow is enabled)
    try {
      const workflowResult = await startWorkflow(lead.id, propertyId, 'lead_created')
      if (workflowResult.success) {
        console.log(`[Leads API] Started workflow ${workflowResult.workflowId} for lead ${lead.id}`)
      }
    } catch (workflowError) {
      // Don't fail lead creation if workflow fails
      console.error('[Leads API] Failed to start workflow:', workflowError)
    }

    // Log audit event
    await logAuditEvent({
      action: 'create',
      entityType: 'lead',
      entityId: lead.id,
      entityName: `${firstName} ${lastName}`,
      details: { source: source || 'manual', email, phone },
      request
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('Lead creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { leadId, status, notes, moveInDate, bedrooms } = body

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      const validStatuses = ['new', 'contacted', 'tour_booked', 'leased', 'lost']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
      
      // If status is contacted, update last_contacted_at
      if (status === 'contacted') {
        updateData.last_contacted_at = new Date().toISOString()
      }
      
      // If leased or lost, stop workflow
      if (status === 'leased' || status === 'lost') {
        await supabase
          .from('lead_workflows')
          .update({ status: status === 'leased' ? 'converted' : 'stopped' })
          .eq('lead_id', leadId)
          .eq('status', 'active')
      }
    }

    if (notes !== undefined) updateData.notes = notes
    if (moveInDate !== undefined) updateData.move_in_date = moveInDate
    if (bedrooms !== undefined) updateData.bedrooms = bedrooms

    const { data: lead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single()

    if (error) {
      console.error('Error updating lead:', error)
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }

    // Log audit event
    await logAuditEvent({
      action: 'update',
      entityType: 'lead',
      entityId: leadId,
      entityName: `${lead.first_name} ${lead.last_name}`,
      details: { status, notes: notes ? 'updated' : undefined },
      request
    })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Lead update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

