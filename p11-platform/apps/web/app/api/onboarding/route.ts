import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationName, propertyName, propertyAddress } = body

    if (!organizationName?.trim()) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS for creating org and updating profile
    const adminClient = createAdminClient()

    // Check if user already has an organization
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.org_id) {
      return NextResponse.json({ error: 'You already belong to an organization' }, { status: 400 })
    }

    // Create organization
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: organizationName.trim(),
        subscription_tier: 'starter',
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // Update user profile with org_id and make them admin
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        org_id: org.id,
        role: 'admin', // First user in org is admin
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // Rollback org creation
      await adminClient.from('organizations').delete().eq('id', org.id)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Create property if provided
    let property = null
    if (propertyName?.trim()) {
      const { data: newProperty, error: propertyError } = await adminClient
        .from('properties')
        .insert({
          org_id: org.id,
          name: propertyName.trim(),
          address: propertyAddress ? {
            street: propertyAddress.street || null,
            city: propertyAddress.city || null,
            state: propertyAddress.state || null,
            zip: propertyAddress.zip || null,
          } : null,
          settings: {
            timezone: 'America/Los_Angeles',
          },
        })
        .select()
        .single()

      if (propertyError) {
        console.error('Error creating property:', propertyError)
        // Don't fail the whole onboarding, org was created successfully
      } else {
        property = newProperty
      }
    }

    return NextResponse.json({
      success: true,
      organization: org,
      property,
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to check onboarding status
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has an org
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('org_id, role, full_name')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      needsOnboarding: !profile?.org_id,
      profile,
    })
  } catch (error) {
    console.error('Onboarding status check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

