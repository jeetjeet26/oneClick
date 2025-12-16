import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Get brand assets for a property
 * Used by SiteForge, LumaLeasing, and other products
 * 
 * Returns structured brand data including:
 * - Logo URL
 * - Color palette (hex codes)
 * - Typography (font names)
 * - Brand voice/personality
 * - Moodboard URLs
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId required' }, { status: 400 })
    }

    // Fetch brand assets
    const { data: brand, error } = await supabase
      .from('property_brand_assets')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching brand assets:', error)
      return NextResponse.json({ error: 'Failed to fetch brand assets' }, { status: 500 })
    }

    if (!brand) {
      return NextResponse.json({
        exists: false,
        message: 'No brand assets found for this property'
      })
    }

    // Extract the most commonly needed assets for other products
    const assets = {
      exists: true,
      propertyId,
      brandAssetId: brand.id,
      generationStatus: brand.generation_status,
      
      // Core brand identity
      brandName: brand.conversation_summary?.brandName || brand.section_5_name_story?.name,
      tagline: brand.conversation_summary?.tagline || brand.section_1_introduction?.tagline,
      
      // Logo
      logo: {
        url: brand.section_6_logo?.logoUrl,
        concept: brand.section_6_logo?.concept,
        style: brand.section_6_logo?.style,
        hasGenerated: !!brand.section_6_logo?.logoUrl
      },
      
      // Colors - ready for CSS/design use
      colors: {
        primary: brand.section_8_colors?.primary?.map((c: any) => ({
          name: c.name,
          hex: c.hex,
          usage: c.usage
        })) || [],
        secondary: brand.section_8_colors?.secondary?.map((c: any) => ({
          name: c.name,
          hex: c.hex,
          usage: c.usage
        })) || [],
        palette: brand.section_8_colors?.palette
      },
      
      // Typography - ready for CSS/design use
      typography: {
        primaryFont: brand.section_7_typography?.primaryFont?.name,
        secondaryFont: brand.section_7_typography?.secondaryFont?.name,
        primaryUsage: brand.section_7_typography?.primaryFont?.usage,
        secondaryUsage: brand.section_7_typography?.secondaryFont?.usage
      },
      
      // Brand voice for content generation
      voice: {
        personality: brand.conversation_summary?.brandPersonality,
        positioning: brand.section_2_positioning?.statement,
        targetAudience: brand.section_3_target_audience?.primary
      },
      
      // Visual assets
      visuals: {
        moodboardUrls: brand.section_9_design_elements?.moodboardUrls || [],
        photoExamples: brand.section_10_photo_yep?.generatedPhotos || [],
        visionBoardUrl: brand.vision_board_url
      },
      
      // Full sections (if needed)
      sections: {
        introduction: brand.section_1_introduction,
        positioning: brand.section_2_positioning,
        targetAudience: brand.section_3_target_audience,
        personas: brand.section_4_personas,
        nameStory: brand.section_5_name_story,
        logo: brand.section_6_logo,
        typography: brand.section_7_typography,
        colors: brand.section_8_colors,
        designElements: brand.section_9_design_elements,
        photoYep: brand.section_10_photo_yep,
        photoNope: brand.section_11_photo_nope,
        implementation: brand.section_12_implementation
      },
      
      // Metadata
      createdAt: brand.created_at,
      updatedAt: brand.updated_at
    }

    return NextResponse.json(assets)

  } catch (error) {
    console.error('Brand assets error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get brand assets' },
      { status: 500 }
    )
  }
}










