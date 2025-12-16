// SiteForge: Deploy Website to WordPress API
// POST /api/siteforge/deploy/[websiteId]
// Created: December 11, 2025

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { deployToExistingWordPress, deployToWordPress } from '@/utils/siteforge/wordpress-client'
import { getPropertyContext } from '@/utils/siteforge/brand-intelligence'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { websiteId } = await params

    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId required' }, { status: 400 })
    }

    // Get website with property check
    const { data: website, error } = await supabase
      .from('property_websites')
      .select(`
        *,
        properties!inner (
          id,
          name,
          org_id
        )
      `)
      .eq('id', websiteId)
      .single()

    if (error || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Verify user access
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profile?.org_id !== website.properties.org_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if website is ready for deployment
    if (website.generation_status !== 'ready_for_preview' && website.generation_status !== 'complete') {
      return NextResponse.json({ 
        error: 'Website must be ready for preview before deploying' 
      }, { status: 400 })
    }

    // Check if already deployed
    if (website.wp_url) {
      return NextResponse.json({ 
        error: 'Website already deployed',
        wpUrl: website.wp_url,
        wpAdminUrl: website.wp_admin_url
      }, { status: 400 })
    }

    // Deployment options:
    // A) Cloudways provision + deploy (requires CLOUDWAYS_API_KEY + CLOUDWAYS_EMAIL)
    // B) Deploy to an existing WordPress instance (requires SITEFORGE_WP_URL + SITEFORGE_WP_USERNAME + SITEFORGE_WP_APP_PASSWORD)
    const cloudwaysApiKey = process.env.CLOUDWAYS_API_KEY
    const cloudwaysEmail = process.env.CLOUDWAYS_EMAIL
    const wpUrl = process.env.SITEFORGE_WP_URL
    const wpUsername = process.env.SITEFORGE_WP_USERNAME
    const wpAppPassword = process.env.SITEFORGE_WP_APP_PASSWORD

    const hasCloudways = Boolean(cloudwaysApiKey && cloudwaysEmail)
    const hasExistingWp = Boolean(wpUrl && wpUsername && wpAppPassword)

    if (!hasCloudways && !hasExistingWp) {
      return NextResponse.json(
        {
          error:
            'WordPress deployment requires either Cloudways credentials (CLOUDWAYS_API_KEY + CLOUDWAYS_EMAIL) or an existing WP target (SITEFORGE_WP_URL + SITEFORGE_WP_USERNAME + SITEFORGE_WP_APP_PASSWORD).',
          requiresConfig: true
        },
        { status: 400 }
      )
    }

    // Update status to deploying
    await supabase
      .from('property_websites')
      .update({
        generation_status: 'deploying',
        current_step: 'Deploying to WordPress...'
      })
      .eq('id', websiteId)

    // Start deployment in background
    deployToWordPressAsync(websiteId, website).catch(error => {
      console.error('Deployment error:', error)
    })

    return NextResponse.json({
      status: 'deploying',
      message: 'Deployment started. This may take a few minutes.'
    })

  } catch (error) {
    console.error('Deploy website error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to deploy website' },
      { status: 500 }
    )
  }
}

/**
 * Background WordPress deployment process
 * Uses service client since this runs after HTTP response is sent
 */
async function deployToWordPressAsync(websiteId: string, website: any) {
  // Use service client for background tasks (no request context available)
  const supabase = createServiceClient()
  
  try {
    const cloudwaysApiKey = process.env.CLOUDWAYS_API_KEY
    const cloudwaysEmail = process.env.CLOUDWAYS_EMAIL
    const wpUrl = process.env.SITEFORGE_WP_URL
    const wpUsername = process.env.SITEFORGE_WP_USERNAME
    const wpAppPassword = process.env.SITEFORGE_WP_APP_PASSWORD

    // Load assets for this website
    const { data: assets } = await supabase
      .from('website_assets')
      .select('*')
      .eq('website_id', websiteId)

    // Get property context (for naming/settings)
    const propertyContext = await getPropertyContext(website.property_id)

    // Determine pages to deploy (prefer blueprint)
    const pages = website.site_blueprint?.pages || website.pages_generated || []

    let instance: any
    if (cloudwaysApiKey && cloudwaysEmail) {
      // Provision + deploy (Cloudways integration is still partially TODO in wordpress-client)
      instance = await deployToWordPress(
        { pages, navigation: website.site_architecture?.navigation, designDecisions: website.site_architecture?.designDecisions } as any,
        propertyContext,
        assets || [],
        { apiKey: cloudwaysApiKey, email: cloudwaysEmail }
      )
    } else if (wpUrl && wpUsername && wpAppPassword) {
      instance = await deployToExistingWordPress({
        wpUrl,
        credentials: { username: wpUsername, password: wpAppPassword },
        pages,
        propertyContext,
        assets: assets || []
      })
    } else {
      throw new Error('No deployment credentials configured')
    }

    // Mark as complete
    await supabase
      .from('property_websites')
      .update({
        generation_status: 'complete',
        current_step: 'Deployment complete!',
        wp_url: instance.url,
        wp_admin_url: instance.adminUrl,
        wp_instance_id: instance.instanceId,
        wp_credentials: instance.credentials,
        deployed_at: new Date().toISOString()
      })
      .eq('id', websiteId)
      
  } catch (error) {
    console.error('WordPress deployment error:', error)
    
    await supabase
      .from('property_websites')
      .update({
        generation_status: 'deploy_failed',
        error_message: error instanceof Error ? error.message : 'Deployment failed'
      })
      .eq('id', websiteId)
  }
}







