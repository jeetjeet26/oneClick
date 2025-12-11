// SiteForge: Deploy Website to WordPress API
// POST /api/siteforge/deploy/[websiteId]
// Created: December 11, 2025

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'

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

    // TODO: Check for Cloudways API credentials
    const cloudwaysApiKey = process.env.CLOUDWAYS_API_KEY
    const cloudwaysEmail = process.env.CLOUDWAYS_EMAIL
    
    if (!cloudwaysApiKey || !cloudwaysEmail) {
      return NextResponse.json({ 
        error: 'WordPress deployment requires Cloudways API credentials. Please add CLOUDWAYS_API_KEY and CLOUDWAYS_EMAIL to your environment variables.',
        requiresConfig: true
      }, { status: 400 })
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
    // TODO: Implement actual WordPress deployment via Cloudways API
    // Steps:
    // 1. Create WordPress site on Cloudways (or use existing)
    // 2. Install Collection theme
    // 3. Create pages with ACF blocks
    // 4. Upload media assets
    // 5. Set up navigation
    // 6. Configure SEO settings
    
    // For now, simulate deployment
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Mark as complete (mock deployment)
    await supabase
      .from('property_websites')
      .update({
        generation_status: 'complete',
        current_step: 'Deployment complete!',
        // These would be set by actual Cloudways deployment
        // wp_url: 'https://property-site.example.com',
        // wp_admin_url: 'https://property-site.example.com/wp-admin',
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

