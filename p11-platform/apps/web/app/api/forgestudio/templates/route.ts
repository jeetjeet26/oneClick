import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch content templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const contentType = searchParams.get('contentType')
    const platform = searchParams.get('platform')

    let query = supabase
      .from('content_templates')
      .select('*')
      .eq('is_active', true)
      .order('name')

    // Include global templates (property_id IS NULL) and property-specific ones
    if (propertyId) {
      query = query.or(`property_id.eq.${propertyId},property_id.is.null`)
    } else {
      query = query.is('property_id', null)
    }

    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    if (platform) {
      query = query.contains('platform', [platform])
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      templates: data
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a custom template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      propertyId,
      name,
      description,
      contentType,
      platform,
      promptTemplate,
      variables,
      sampleOutput
    } = body

    if (!name || !contentType || !promptTemplate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, contentType, promptTemplate' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('content_templates')
      .insert({
        property_id: propertyId || null,
        name,
        description,
        content_type: contentType,
        platform: platform || [],
        prompt_template: promptTemplate,
        variables: variables || [],
        sample_output: sampleOutput,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template: data
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('content_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

