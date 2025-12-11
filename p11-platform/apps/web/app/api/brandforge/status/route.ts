import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Get brand asset status and progress
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const propertyId = req.nextUrl.searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId required' }, { status: 400 })
    }

    const { data: brandAsset, error } = await supabase
      .from('property_brand_assets')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No brand asset exists
        return NextResponse.json({ exists: false })
      }
      throw error
    }

    // Count approved sections
    const approvedSections = [
      'section_1_introduction',
      'section_2_positioning',
      'section_3_target_audience',
      'section_4_personas',
      'section_5_name_story',
      'section_6_logo',
      'section_7_typography',
      'section_8_colors',
      'section_9_design_elements',
      'section_10_photo_yep',
      'section_11_photo_nope',
      'section_12_implementation'
    ].filter(section => brandAsset[section] !== null)

    return NextResponse.json({
      exists: true,
      brandAsset: {
        id: brandAsset.id,
        currentStep: brandAsset.current_step,
        generationStatus: brandAsset.generation_status,
        approvedSections: approvedSections.length,
        totalSections: 12,
        progress: Math.round((approvedSections.length / 12) * 100),
        isComplete: brandAsset.generation_status === 'complete',
        pdfUrl: brandAsset.brand_book_pdf_url,
        brandName: brandAsset.section_5_name_story?.name,
        colors: brandAsset.section_8_colors,
        logo: brandAsset.section_6_logo
      }
    })

  } catch (error) {
    console.error('Brand Status Error:', error)
    return NextResponse.json({ 
      error: 'Failed to get status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}



