import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  google_analytics: 'Google Analytics',
  google_search_console: 'Google Search Console',
  google_tag_manager: 'Google Tag Manager',
  google_ads: 'Google Ads',
  google_business_profile: 'Google Business Profile',
  meta_ads: 'Meta Ads',
  linkedin_ads: 'LinkedIn Ads',
  tiktok_ads: 'TikTok Ads',
  email_marketing: 'Email Marketing',
  crm: 'CRM',
  pms: 'Property Management System',
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const propertyId = request.nextUrl.searchParams.get('propertyId')
    
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: integrations, error } = await adminClient
      .from('integration_credentials')
      .select('*')
      .eq('property_id', propertyId)
      .order('platform', { ascending: true })

    if (error) {
      console.error('Error fetching integrations:', error)
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 })
    }

    // Add display names
    const enrichedIntegrations = (integrations || []).map(integration => ({
      ...integration,
      displayName: PLATFORM_DISPLAY_NAMES[integration.platform] || integration.platform,
    }))

    return NextResponse.json({ integrations: enrichedIntegrations })
  } catch (error) {
    console.error('Integrations fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyId, integration } = body

    if (!propertyId || !integration?.platform) {
      return NextResponse.json({ error: 'propertyId and integration.platform are required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Upsert integration
    const { data, error } = await adminClient
      .from('integration_credentials')
      .upsert({
        property_id: propertyId,
        platform: integration.platform,
        account_id: integration.accountId || null,
        account_name: integration.accountName || null,
        access_type: integration.accessType || null,
        status: integration.status || 'pending',
        notes: integration.notes || null,
      }, {
        onConflict: 'property_id,platform',
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving integration:', error)
      return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      integration: {
        ...data,
        displayName: PLATFORM_DISPLAY_NAMES[data.platform] || data.platform,
      },
    })
  } catch (error) {
    console.error('Integration save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { integrationId, status, notes, accountId, accountName, lastError } = body

    if (!integrationId) {
      return NextResponse.json({ error: 'integrationId is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const updates: Record<string, unknown> = {}
    if (status !== undefined) updates.status = status
    if (notes !== undefined) updates.notes = notes
    if (accountId !== undefined) updates.account_id = accountId
    if (accountName !== undefined) updates.account_name = accountName
    if (lastError !== undefined) updates.last_error = lastError
    
    if (status === 'verified' || status === 'connected') {
      updates.verified_at = new Date().toISOString()
    }

    const { data, error } = await adminClient
      .from('integration_credentials')
      .update(updates)
      .eq('id', integrationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating integration:', error)
      return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      integration: {
        ...data,
        displayName: PLATFORM_DISPLAY_NAMES[data.platform] || data.platform,
      },
    })
  } catch (error) {
    console.error('Integration update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

