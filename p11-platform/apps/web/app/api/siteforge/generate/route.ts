// SiteForge: Generate Website API
// POST /api/siteforge/generate
// Created: December 11, 2025

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { SiteForgeOrchestrator } from '@/utils/siteforge/agents'
import type { GenerateWebsiteRequest } from '@/types/siteforge'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateWebsiteRequest = await request.json()
    const { propertyId, preferences, prompt, brandContext } = body

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
        generation_input: {
          prompt: prompt || null,
          createdAt: new Date().toISOString()
        },
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
        input_params: { propertyId, preferences, prompt }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
    }

    // Start generation in background (don't wait)
    // Pass pre-analyzed brandContext to avoid running Brand Agent twice
    generateWebsiteAsync(website.id, propertyId, preferences, prompt, brandContext).catch(error => {
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
 * Background generation process - AGENTIC VERSION
 * Uses orchestrator to coordinate all agents
 * 
 * @param brandContext - Pre-analyzed brand context from /api/siteforge/analyze
 *                       If provided, skips running Brand Agent again
 */
async function generateWebsiteAsync(
  websiteId: string,
  propertyId: string,
  preferences?: any,
  prompt?: string,
  brandContext?: any
) {
  const supabase = createServiceClient()
  
  try {
    // Initialize orchestrator with all agents
    const orchestrator = new SiteForgeOrchestrator(
      propertyId,
      websiteId,
      undefined // No existing WP instance yet
    )
    
    // Generate complete blueprint (agents work autonomously)
    // Pass pre-analyzed brandContext to skip re-running Brand Agent
    const blueprint = await orchestrator.generate(preferences, brandContext)
    
    // Blueprint is already saved by orchestrator
    console.log('✅ Agentic generation complete:', {
      pages: blueprint.pages.length,
      sections: blueprint.pages.reduce((sum, p) => sum + p.sections.length, 0),
      quality: blueprint.qualityReport.score,
      time: blueprint.generationTime
    })
    
  } catch (error) {
    console.error('Agentic generation error:', error)
    
    await supabase
      .from('property_websites')
      .update({
        generation_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Generation failed'
      })
      .eq('id', websiteId)
  }
}

// Old asset gathering function removed - Photo Agent handles this now








