// SiteForge: LLM-Driven Blueprint Edit API
// POST /api/siteforge/edit/[websiteId]
// Applies an LLM-generated patch to the stored site blueprint.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getBrandIntelligence, getPropertyContext } from '@/utils/siteforge/brand-intelligence'
import { editSiteBlueprintWithLLM } from '@/utils/siteforge/llm-orchestration'
import { makeBlueprintFromPages } from '@/utils/siteforge/blueprint'
import type { EditBlueprintRequest, SiteContext, SiteBlueprint } from '@/types/siteforge'

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

    const body = (await request.json()) as Partial<EditBlueprintRequest>
    const instruction = String(body.instruction || '').trim()
    if (!instruction) {
      return NextResponse.json({ error: 'instruction required' }, { status: 400 })
    }

    // Load website + property for org access check
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

    // Verify user org access
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profile?.org_id !== website.properties.org_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Ensure we have a blueprint (backward compatible with older records)
    const blueprint: SiteBlueprint =
      website.site_blueprint ||
      makeBlueprintFromPages(website.pages_generated || [], website.site_blueprint_version || 1)

    // Build context (brand + property + lightweight competitors/docs)
    const [brand, property] = await Promise.all([
      getBrandIntelligence(website.property_id),
      getPropertyContext(website.property_id)
    ])

    const { data: competitors } = await supabase
      .from('competitor_snapshots')
      .select('property_name, website_url')
      .eq('property_id', website.property_id)
      .limit(5)

    const { data: documents } = await supabase
      .from('documents')
      .select('id, file_name, file_url, metadata')
      .eq('property_id', website.property_id)

    const context: SiteContext = {
      brand,
      property,
      competitors: {
        sites: (competitors || []).map(c => ({ name: c.property_name, url: c.website_url })),
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
      preferences: website.user_preferences || undefined
    }

    const { blueprint: nextBlueprint, operations, summary } = await editSiteBlueprintWithLLM({
      blueprint,
      context,
      instruction,
      selected: {
        sectionId: body.selected?.sectionId,
        pageSlug: body.selected?.pageSlug
      }
    })

    const nextVersion = (website.site_blueprint_version || blueprint.version || 1) + 1
    const blueprintToStore: SiteBlueprint = {
      ...nextBlueprint,
      version: nextVersion,
      updatedAt: new Date().toISOString()
    }

    // Persist blueprint + also keep pages_generated in sync for existing preview flows
    const { error: updateError } = await supabase
      .from('property_websites')
      .update({
        site_blueprint: blueprintToStore,
        site_blueprint_version: nextVersion,
        site_blueprint_updated_at: blueprintToStore.updatedAt,
        pages_generated: blueprintToStore.pages
      })
      .eq('id', websiteId)

    if (updateError) {
      console.error('Failed to update website blueprint:', updateError)
      return NextResponse.json({ error: 'Failed to save edit' }, { status: 500 })
    }

    // Insert blueprint version record (best-effort)
    try {
      await supabase
        .from('siteforge_blueprint_versions')
        .insert({
          website_id: websiteId,
          version: nextVersion,
          blueprint: blueprintToStore,
          created_by: user.id
        })
    } catch (e) {
      console.warn('Failed to insert blueprint version record (non-fatal):', e)
    }

    return NextResponse.json({
      websiteId,
      blueprint: blueprintToStore,
      appliedOperations: operations,
      summary
    })
  } catch (error) {
    console.error('Blueprint edit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to edit website' },
      { status: 500 }
    )
  }
}

