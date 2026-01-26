import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type OrgSettings = {
  timezone?: string
  notifications?: {
    new_leads?: boolean
    ai_handoff?: boolean
    daily_summary?: boolean
    weekly_report?: boolean
  }
}

type UserPreferences = {
  theme?: 'light' | 'dark' | 'system'
  accent_color?: 'indigo' | 'purple' | 'blue' | 'emerald'
}

// GET - Fetch settings for the current user's organization and preferences
export async function GET(request: NextRequest) {
  const supabaseAuth = await createClient()
  
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get user's profile with preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, preferences')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get organization settings
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier, settings')
      .eq('id', profile.org_id)
      .single()

    if (orgError) {
      throw orgError
    }

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        subscription_tier: org.subscription_tier,
        settings: org.settings || {},
      },
      preferences: profile.preferences || {},
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PATCH - Update settings
export async function PATCH(request: NextRequest) {
  const supabaseAuth = await createClient()
  
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { organization, preferences } = body as {
      organization?: { name?: string; settings?: OrgSettings }
      preferences?: UserPreferences
    }

    // Get user's profile to find their org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const results: { organization?: boolean; preferences?: boolean } = {}

    // Update organization settings (admin/manager only for org settings)
    if (organization) {
      if (!['admin', 'manager'].includes(profile.role || '')) {
        return NextResponse.json({ 
          error: 'Insufficient permissions to update organization settings' 
        }, { status: 403 })
      }

      const orgUpdate: Record<string, unknown> = {}
      
      if (organization.name !== undefined) {
        orgUpdate.name = organization.name
      }
      
      if (organization.settings !== undefined) {
        // Merge with existing settings
        const { data: currentOrg } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', profile.org_id)
          .single()

        orgUpdate.settings = {
          ...(currentOrg?.settings || {}),
          ...organization.settings,
          notifications: {
            ...(currentOrg?.settings?.notifications || {}),
            ...(organization.settings.notifications || {}),
          },
        }
      }

      if (Object.keys(orgUpdate).length > 0) {
        const { error } = await supabase
          .from('organizations')
          .update(orgUpdate)
          .eq('id', profile.org_id)

        if (error) throw error
        results.organization = true
      }
    }

    // Update user preferences (anyone can update their own)
    if (preferences) {
      // Merge with existing preferences
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()

      const newPreferences = {
        ...(currentProfile?.preferences || {}),
        ...preferences,
      }

      const { error } = await supabase
        .from('profiles')
        .update({ preferences: newPreferences })
        .eq('id', user.id)

      if (error) throw error
      results.preferences = true
    }

    return NextResponse.json({ 
      success: true,
      updated: results,
    })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update settings' 
    }, { status: 500 })
  }
}



























