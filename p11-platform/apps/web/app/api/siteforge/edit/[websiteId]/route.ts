// SiteForge: Edit Website Section API
// POST /api/siteforge/edit/[websiteId]
// Allows LLM-driven editing of specific sections
// Created: December 16, 2025

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { generateBlueprintPatches } from '@/utils/siteforge/llm-patch-generator'
import { applyBlueprintPatch } from '@/utils/siteforge/blueprint'
import type { SiteBlueprint } from '@/utils/siteforge/agents'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    const supabase = await createClient()
    const { websiteId } = await params
    const { sectionId, userIntent } = await request.json()
    
    if (!sectionId || !userIntent) {
      return NextResponse.json(
        { error: 'sectionId and userIntent required' },
        { status: 400 }
      )
    }
    
    // Get current blueprint
    const { data: website, error: websiteError } = await supabase
      .from('property_websites')
      .select('blueprint, version, property_id, org_id')
      .eq('id', websiteId)
      .single()
    
    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }
    
    // Verify access (user must have access to property's org)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()
    
    if (profile?.org_id !== website.org_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Generate patches using LLM
    const patches = await generateBlueprintPatches(
      website.blueprint as SiteBlueprint,
      sectionId,
      userIntent
    )
    
    // Apply patches to blueprint
    const updatedBlueprint = applyBlueprintPatch(
      website.blueprint as SiteBlueprint,
      patches
    )
    
    // Save new version
    const newVersion = (website.version || 1) + 1
    
    const serviceClient = createServiceClient()
    await serviceClient
      .from('property_websites')
      .update({
        blueprint: updatedBlueprint,
        version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', websiteId)
    
    // Log edit action
    await serviceClient
      .from('mcp_audit_log')
      .insert({
        server: 'siteforge-edit',
        tool: 'edit_section',
        property_id: website.property_id,
        action_details: {
          websiteId,
          sectionId,
          userIntent,
          patchCount: patches.length
        }
      })
    
    return NextResponse.json({
      success: true,
      blueprint: updatedBlueprint,
      patches,
      newVersion
    })
    
  } catch (error) {
    console.error('Edit section error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to edit section' },
      { status: 500 }
    )
  }
}
