// SiteForge: Generate Website API
// POST /api/siteforge/generate
// Created: December 11, 2025

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { getBrandIntelligence, getPropertyContext } from '@/utils/siteforge/brand-intelligence'
import { planSiteArchitecture, generateAllPageContent } from '@/utils/siteforge/llm-orchestration'
import type { GenerateWebsiteRequest, SiteContext } from '@/types/siteforge'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateWebsiteRequest = await request.json()
    const { propertyId, preferences } = body

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId required' }, { status: 400 })
    }

    // Verify user has access to this property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, org_id')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profile?.org_id !== property.org_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get current version number for this property
    const { data: existingWebsites } = await supabase
      .from('property_websites')
      .select('version')
      .eq('property_id', propertyId)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = existingWebsites && existingWebsites.length > 0 
      ? (existingWebsites[0].version || 1) + 1 
      : 1

    // Create website record
    const { data: website, error: websiteError } = await supabase
      .from('property_websites')
      .insert({
        property_id: propertyId,
        version: nextVersion,
        generation_status: 'queued',
        generation_progress: 0,
        user_preferences: preferences,
        generation_started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (websiteError || !website) {
      console.error('Error creating website record:', websiteError)
      return NextResponse.json({ error: 'Failed to create website' }, { status: 500 })
    }

    // Create job for async processing
    const { data: job, error: jobError } = await supabase
      .from('siteforge_jobs')
      .insert({
        website_id: website.id,
        job_type: 'full_generation',
        status: 'queued',
        input_params: { propertyId, preferences }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
    }

    // Start generation in background (don't wait)
    generateWebsiteAsync(website.id, propertyId, preferences).catch(error => {
      console.error('Background generation error:', error)
    })

    return NextResponse.json({
      jobId: job?.id || website.id,
      websiteId: website.id,
      status: 'queued',
      estimatedTimeSeconds: 180
    })

  } catch (error) {
    console.error('Generate website error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate website' },
      { status: 500 }
    )
  }
}

/**
 * Background generation process
 * Uses service client since this runs after HTTP response is sent
 */
async function generateWebsiteAsync(
  websiteId: string,
  propertyId: string,
  preferences?: any
) {
  // Use service client for background tasks (no request context available)
  const supabase = createServiceClient()
  
  try {
    // Update status: Analyzing brand
    await updateStatus(websiteId, 'analyzing_brand', 10, 'Analyzing brand assets...')
    
    // 1. Gather brand intelligence
    const brand = await getBrandIntelligence(propertyId)
    
    // 2. Get property context
    const propertyContext = await getPropertyContext(propertyId)
    
    // 3. Get competitor intelligence
    const { data: competitors } = await supabase
      .from('competitor_snapshots')
      .select('property_name, website_url')
      .eq('property_id', propertyId)
      .limit(5)
    
    // 4. Get knowledge base documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id, file_name, file_url, metadata')
      .eq('property_id', propertyId)
    
    const context: SiteContext = {
      brand,
      property: propertyContext,
      competitors: {
        sites: (competitors || []).map(c => ({
          name: c.property_name,
          url: c.website_url
        })),
        commonPatterns: [],
        contentGaps: [],
        designTrends: []
      },
      documents: (documents || []).map(d => ({
        id: d.id,
        fileName: d.file_name,
        fileUrl: d.file_url,
        type: d.metadata?.type || 'document'
      })),
      preferences
    }
    
    // Update website with brand source
    await supabase
      .from('property_websites')
      .update({
        brand_source: brand.source,
        brand_confidence: brand.confidence
      })
      .eq('id', websiteId)
    
    // Update status: Planning architecture
    await updateStatus(websiteId, 'planning_architecture', 30, 'Planning site structure...')
    
    // 5. Plan site architecture with Gemini 3
    const architecture = await planSiteArchitecture(context)
    
    // Save architecture
    await supabase
      .from('property_websites')
      .update({
        site_architecture: architecture
      })
      .eq('id', websiteId)
    
    // Update status: Generating content
    await updateStatus(websiteId, 'generating_content', 50, 'Generating page content...')
    
    // 6. Generate content for all pages
    const pages = await generateAllPageContent(architecture, context)
    
    // Save generated pages
    await supabase
      .from('property_websites')
      .update({
        pages_generated: pages
      })
      .eq('id', websiteId)
    
    // Update status: Preparing assets
    await updateStatus(websiteId, 'preparing_assets', 70, 'Preparing images and assets...')
    
    // 7. Gather and prepare assets
    const assets = await gatherAssets(websiteId, propertyId, pages, supabase)
    
    // Update status: Ready for Preview (NOT auto-deploying)
    // User must explicitly click "Deploy to WordPress" after reviewing the preview
    await updateStatus(websiteId, 'ready_for_preview', 100, 'Website ready for preview!')
    
    const websiteData = await getWebsite(websiteId)
    await supabase
      .from('property_websites')
      .update({
        generation_completed_at: new Date().toISOString(),
        generation_duration_seconds: Math.floor(
          (Date.now() - new Date(websiteData?.generation_started_at || Date.now()).getTime()) / 1000
        )
      })
      .eq('id', websiteId)
    
  } catch (error) {
    console.error('Generation error:', error)
    
    await supabase
      .from('property_websites')
      .update({
        generation_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Generation failed'
      })
      .eq('id', websiteId)
  }
}

/**
 * Update generation status
 * Uses service client for background context
 */
async function updateStatus(
  websiteId: string,
  status: string,
  progress: number,
  step: string
) {
  const supabase = createServiceClient()
  
  await supabase
    .from('property_websites')
    .update({
      generation_status: status,
      generation_progress: progress,
      current_step: step
    })
    .eq('id', websiteId)
}

/**
 * Get website record
 * Uses service client for background context
 */
async function getWebsite(websiteId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('property_websites')
    .select('*')
    .eq('id', websiteId)
    .single()
  return data
}

/**
 * Gather and prepare assets for the website
 * Analyzes generated pages to identify all image references
 * Creates asset records in website_assets table
 */
async function gatherAssets(
  websiteId: string, 
  propertyId: string, 
  pages: any[],
  supabase: any
) {
  const assets: any[] = []
  const imageIndicesUsed = new Set<number>()
  
  // Scan all pages and sections for image references
  for (const page of pages) {
    for (const section of page.sections || []) {
      const content = section.content
      if (!content) continue
      
      // Check for image_index references
      if (typeof content.image_index === 'number') {
        imageIndicesUsed.add(content.image_index)
      }
      
      // Check slides array
      if (Array.isArray(content.slides)) {
        for (const slide of content.slides) {
          if (typeof slide.image_index === 'number') {
            imageIndicesUsed.add(slide.image_index)
          }
        }
      }
      
      // Check image_indices array (gallery)
      if (Array.isArray(content.image_indices)) {
        for (const idx of content.image_indices) {
          imageIndicesUsed.add(idx)
        }
      }
      
      // Check items array (content grids may have images)
      if (Array.isArray(content.items)) {
        for (const item of content.items) {
          if (typeof item.image_index === 'number') {
            imageIndicesUsed.add(item.image_index)
          }
        }
      }
    }
  }
  
  // Try to get existing property images from storage
  const { data: storageFiles } = await supabase.storage
    .from('property-assets')
    .list(`${propertyId}/photos`, {
      limit: 50,
      sortBy: { column: 'name', order: 'asc' }
    })
  
  // Create asset records for each referenced image
  for (const imageIndex of imageIndicesUsed) {
    let fileUrl = null
    let source = 'placeholder'
    
    // Check if we have a real file for this index
    if (storageFiles && storageFiles[imageIndex]) {
      const file = storageFiles[imageIndex]
      const { data: urlData } = supabase.storage
        .from('property-assets')
        .getPublicUrl(`${propertyId}/photos/${file.name}`)
      fileUrl = urlData?.publicUrl
      source = 'storage'
    }
    
    // Create placeholder URL if no real file
    if (!fileUrl) {
      fileUrl = `https://placehold.co/1200x800/1f2937/6366f1?text=Image+${imageIndex}`
    }
    
    assets.push({
      website_id: websiteId,
      asset_type: 'image',
      source: source,
      file_url: fileUrl,
      alt_text: `Property image ${imageIndex}`,
      usage_context: { image_index: imageIndex },
      optimized: false
    })
  }
  
  // Insert assets into database
  if (assets.length > 0) {
    const { error } = await supabase
      .from('website_assets')
      .insert(assets)
    
    if (error) {
      console.error('Error inserting assets:', error)
    }
  }
  
  return assets
}





