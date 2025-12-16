// SiteForge: Delete Website API
// DELETE /api/siteforge/delete/[websiteId]
// Created: December 11, 2025

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

type WebsiteWithOrg = {
  id: string
  properties: { org_id: string | null } | Array<{ org_id: string | null }>
}

export async function DELETE(
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

    // Verify user has access before deleting
    const { data: website, error: fetchError } = await supabase
      .from('property_websites')
      .select(`
        id,
        properties!inner (
          org_id
        )
      `)
      .eq('id', websiteId)
      .single()

    if (fetchError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    const websiteProperties = (website as WebsiteWithOrg).properties
    const websiteOrgId = Array.isArray(websiteProperties)
      ? websiteProperties[0]?.org_id
      : websiteProperties?.org_id

    const profileOrgId = (profile as { org_id: string | null } | null)?.org_id

    if (!websiteOrgId || !profileOrgId || profileOrgId !== websiteOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete website (cascades to assets and generations via FK)
    const { error: deleteError } = await supabase
      .from('property_websites')
      .delete()
      .eq('id', websiteId)

    if (deleteError) {
      console.error('Error deleting website:', deleteError)
      return NextResponse.json({ error: 'Failed to delete website' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete website error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete website' },
      { status: 500 }
    )
  }
}







