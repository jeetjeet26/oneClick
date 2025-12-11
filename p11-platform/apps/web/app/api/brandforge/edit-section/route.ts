import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandAssetId, updates } = await req.json()

    if (!brandAssetId || !updates) {
      return NextResponse.json({ error: 'brandAssetId and updates required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: brand } = await supabaseAdmin
      .from('property_brand_assets')
      .select('draft_section')
      .eq('id', brandAssetId)
      .single()

    if (!brand || !brand.draft_section) {
      return NextResponse.json({ error: 'No draft section to edit' }, { status: 400 })
    }

    const draftSection = brand.draft_section

    // Merge updates into existing data
    const updatedData = {
      ...draftSection.data,
      ...updates
    }

    // Update draft section
    await supabaseAdmin
      .from('property_brand_assets')
      .update({
        draft_section: {
          ...draftSection,
          data: updatedData,
          version: (draftSection.version || 1) + 1,
          manually_edited: true,
          edited_at: new Date().toISOString()
        }
      })
      .eq('id', brandAssetId)

    return NextResponse.json({
      success: true,
      step: draftSection.step,
      sectionName: draftSection.name,
      data: updatedData,
      version: (draftSection.version || 1) + 1
    })

  } catch (error) {
    console.error('Edit Section Error:', error)
    return NextResponse.json({ 
      error: 'Edit failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}



