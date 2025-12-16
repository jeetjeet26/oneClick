// SiteForge: Website Preview API
// GET /api/siteforge/preview/[websiteId]
// Created: December 11, 2025

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { makeBlueprintFromPages } from '@/utils/siteforge/blueprint'

export async function GET(
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

    // Get website with full details
    const { data: website, error } = await supabase
      .from('property_websites')
      .select(`
        *,
        properties!inner (
          id,
          name,
          org_id,
          address
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

    // Backfill blueprint for older records (best-effort)
    let siteBlueprint = website.site_blueprint
    let siteBlueprintVersion = website.site_blueprint_version
    let siteBlueprintUpdatedAt = website.site_blueprint_updated_at

    if (!siteBlueprint && Array.isArray(website.pages_generated) && website.pages_generated.length > 0) {
      try {
        const blueprint = makeBlueprintFromPages(website.pages_generated, 1)
        await supabase
          .from('property_websites')
          .update({
            site_blueprint: blueprint,
            site_blueprint_version: 1,
            site_blueprint_updated_at: blueprint.updatedAt,
            pages_generated: blueprint.pages
          })
          .eq('id', websiteId)
        siteBlueprint = blueprint
        siteBlueprintVersion = 1
        siteBlueprintUpdatedAt = blueprint.updatedAt
      } catch (e) {
        console.warn('Failed to backfill blueprint (non-fatal):', e)
      }
    }

    // Get assets
    const { data: assets } = await supabase
      .from('website_assets')
      .select('*')
      .eq('website_id', websiteId)

    const response = {
      websiteId: website.id,
      property: website.properties,
      generationStatus: website.generation_status,
      brandSource: website.brand_source,
      brandConfidence: website.brand_confidence,
      siteArchitecture: website.site_architecture,
      siteBlueprint,
      siteBlueprintVersion,
      siteBlueprintUpdatedAt,
      pagesGenerated: siteBlueprint?.pages || website.pages_generated,
      assets: assets || [],
      wpUrl: website.wp_url,
      wpAdminUrl: website.wp_admin_url,
      createdAt: website.created_at,
      completedAt: website.generation_completed_at
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Website preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get preview' },
      { status: 500 }
    )
  }
}







