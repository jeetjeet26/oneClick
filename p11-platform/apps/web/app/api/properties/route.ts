import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logAuditEvent } from '@/utils/audit'

// GET - List all properties for the user's organization
export async function GET(request: NextRequest) {
  const supabaseAuth = await createClient()
  
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get user's profile to find their organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ properties: [], message: 'No organization found' })
    }

    // Get all properties for the organization
    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        address,
        settings,
        created_at,
        org_id
      `)
      .eq('org_id', profile.org_id)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching properties:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get stats for each property
    const propertiesWithStats = await Promise.all(
      (properties || []).map(async (property) => {
        // Get leads count
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', property.id)

        // Get documents count
        const { count: docsCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', property.id)

        return {
          ...property,
          stats: {
            leads: leadsCount || 0,
            documents: docsCount || 0,
          },
        }
      })
    )

    return NextResponse.json({ properties: propertiesWithStats })
  } catch (error) {
    console.error('Properties API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Create a new property
export async function POST(request: NextRequest) {
  const supabaseAuth = await createClient()
  
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { name, address, settings } = body

    if (!name) {
      return NextResponse.json({ error: 'Property name is required' }, { status: 400 })
    }

    // Get user's profile to find their organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Check if user has permission (admin or manager)
    if (!['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create the property
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        name,
        org_id: profile.org_id,
        address: address || {},
        settings: settings || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating property:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log audit event
    await logAuditEvent({
      action: 'create',
      entityType: 'property',
      entityId: property.id,
      entityName: name,
      details: { address: address?.city || address?.street },
      request
    })

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('Property create error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH - Update a property
export async function PATCH(request: NextRequest) {
  const supabaseAuth = await createClient()
  
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { id, name, address, settings } = body

    if (!id) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Check if user has permission
    if (!['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update the property
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (settings !== undefined) updateData.settings = settings

    const { data: property, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', profile.org_id) // Ensure property belongs to user's org
      .select()
      .single()

    if (error) {
      console.error('Error updating property:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log audit event
    await logAuditEvent({
      action: 'update',
      entityType: 'property',
      entityId: id,
      entityName: property.name,
      details: { updated_fields: Object.keys(updateData) },
      request
    })

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Property update error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Delete a property
export async function DELETE(request: NextRequest) {
  const supabaseAuth = await createClient()
  
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Check if user has permission (admin only for delete)
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete properties' }, { status: 403 })
    }

    // Get property name before deletion for audit log
    const { data: propertyToDelete } = await supabase
      .from('properties')
      .select('name')
      .eq('id', id)
      .single()

    // Delete the property (cascades to related data)
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('org_id', profile.org_id)

    if (error) {
      console.error('Error deleting property:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log audit event
    await logAuditEvent({
      action: 'delete',
      entityType: 'property',
      entityId: id,
      entityName: propertyToDelete?.name || 'Unknown',
      request
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property delete error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
