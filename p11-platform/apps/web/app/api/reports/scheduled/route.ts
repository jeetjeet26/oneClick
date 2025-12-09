import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type ScheduledReport = {
  id: string
  org_id: string
  property_id: string | null
  name: string
  schedule_type: 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null
  day_of_month: number | null
  hour_utc: number
  recipients: string[]
  report_type: 'performance' | 'leads' | 'summary'
  date_range_type: 'previous_period' | 'last_7_days' | 'last_30_days' | 'month_to_date'
  include_comparison: boolean
  include_campaigns: boolean
  is_active: boolean
  last_sent_at: string | null
  next_run_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// GET - List all scheduled reports for the user's organization
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('propertyId')

  try {
    // Get user's profile to find their org
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('scheduled_reports')
      .select(`
        *,
        property:properties(id, name),
        creator:profiles!scheduled_reports_created_by_fkey(id, full_name)
      `)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data: reports, error: reportsError } = await query

    if (reportsError) {
      console.error('Error fetching scheduled reports:', reportsError)
      return NextResponse.json({ error: reportsError.message }, { status: 500 })
    }

    // Get recent send history for each report
    const reportsWithHistory = await Promise.all(
      (reports || []).map(async (report) => {
        const { data: history } = await supabase
          .from('report_send_history')
          .select('id, status, created_at, completed_at, error_message')
          .eq('scheduled_report_id', report.id)
          .order('created_at', { ascending: false })
          .limit(5)

        return {
          ...report,
          recent_history: history || [],
        }
      })
    )

    return NextResponse.json({ reports: reportsWithHistory })
  } catch (err) {
    console.error('Scheduled reports API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new scheduled report
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.schedule_type || !body.recipients || body.recipients.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, schedule_type, recipients' 
      }, { status: 400 })
    }

    // Validate schedule-specific fields
    if (body.schedule_type === 'weekly' && (body.day_of_week === undefined || body.day_of_week === null)) {
      return NextResponse.json({ 
        error: 'day_of_week is required for weekly schedules (0-6, Sunday-Saturday)' 
      }, { status: 400 })
    }
    
    if (body.schedule_type === 'monthly' && (body.day_of_month === undefined || body.day_of_month === null)) {
      return NextResponse.json({ 
        error: 'day_of_month is required for monthly schedules (1-28)' 
      }, { status: 400 })
    }

    // Validate email format for recipients
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = body.recipients.filter((email: string) => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      return NextResponse.json({ 
        error: `Invalid email addresses: ${invalidEmails.join(', ')}` 
      }, { status: 400 })
    }

    // Get user's profile to find their org
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user has permission (admin or manager)
    if (!['admin', 'manager'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // If property_id is provided, verify it belongs to the same org
    if (body.property_id) {
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', body.property_id)
        .eq('org_id', profile.org_id)
        .single()

      if (propError || !property) {
        return NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 })
      }
    }

    // Create the scheduled report
    const { data: report, error: createError } = await supabase
      .from('scheduled_reports')
      .insert({
        org_id: profile.org_id,
        property_id: body.property_id || null,
        name: body.name,
        schedule_type: body.schedule_type,
        day_of_week: body.schedule_type === 'weekly' ? body.day_of_week : null,
        day_of_month: body.schedule_type === 'monthly' ? body.day_of_month : null,
        hour_utc: body.hour_utc ?? 9,
        recipients: body.recipients,
        report_type: body.report_type || 'performance',
        date_range_type: body.date_range_type || 'previous_period',
        include_comparison: body.include_comparison ?? true,
        include_campaigns: body.include_campaigns ?? true,
        is_active: body.is_active ?? true,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating scheduled report:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ report }, { status: 201 })
  } catch (err) {
    console.error('Create scheduled report error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update an existing scheduled report
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!['admin', 'manager'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Verify the report exists and belongs to user's org
    const { data: existingReport, error: fetchError } = await supabase
      .from('scheduled_reports')
      .select('id')
      .eq('id', body.id)
      .eq('org_id', profile.org_id)
      .single()

    if (fetchError || !existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Validate emails if provided
    if (body.recipients) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = body.recipients.filter((email: string) => !emailRegex.test(email))
      if (invalidEmails.length > 0) {
        return NextResponse.json({ 
          error: `Invalid email addresses: ${invalidEmails.join(', ')}` 
        }, { status: 400 })
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<ScheduledReport> = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.schedule_type !== undefined) updateData.schedule_type = body.schedule_type
    if (body.day_of_week !== undefined) updateData.day_of_week = body.day_of_week
    if (body.day_of_month !== undefined) updateData.day_of_month = body.day_of_month
    if (body.hour_utc !== undefined) updateData.hour_utc = body.hour_utc
    if (body.recipients !== undefined) updateData.recipients = body.recipients
    if (body.report_type !== undefined) updateData.report_type = body.report_type
    if (body.date_range_type !== undefined) updateData.date_range_type = body.date_range_type
    if (body.include_comparison !== undefined) updateData.include_comparison = body.include_comparison
    if (body.include_campaigns !== undefined) updateData.include_campaigns = body.include_campaigns
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.property_id !== undefined) updateData.property_id = body.property_id

    const { data: updatedReport, error: updateError } = await supabase
      .from('scheduled_reports')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating scheduled report:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ report: updatedReport })
  } catch (err) {
    console.error('Update scheduled report error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a scheduled report
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('id')

  if (!reportId) {
    return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
  }

  try {
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!['admin', 'manager'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Delete the report (cascades to history)
    const { error: deleteError } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', reportId)
      .eq('org_id', profile.org_id)

    if (deleteError) {
      console.error('Error deleting scheduled report:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete scheduled report error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

