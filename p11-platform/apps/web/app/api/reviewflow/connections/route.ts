import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List platform connections for a property
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json(
        { error: 'propertyId is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('review_platform_connections')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching connections:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ connections: data })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new platform connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { propertyId, platform, placeId, apiKey, accessToken } = body

    if (!propertyId || !platform) {
      return NextResponse.json(
        { error: 'propertyId and platform are required' },
        { status: 400 }
      )
    }

    // Validate platform
    const validPlatforms = ['google', 'yelp', 'apartments_com', 'facebook']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('review_platform_connections')
      .select('id')
      .eq('property_id', propertyId)
      .eq('platform', platform)
      .single()

    if (existing) {
      // Update existing connection
      const { data, error } = await supabase
        .from('review_platform_connections')
        .update({
          place_id: placeId || null,
          api_key: apiKey || null,
          access_token: accessToken || null,
          is_active: true,
          error_count: 0,
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ connection: data, updated: true })
    }

    // Create new connection
    const { data, error } = await supabase
      .from('review_platform_connections')
      .insert({
        property_id: propertyId,
        platform,
        place_id: placeId || null,
        api_key: apiKey || null,
        access_token: accessToken || null,
        is_active: true,
        sync_frequency: 'hourly'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating connection:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ connection: data })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a platform connection
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('review_platform_connections')
      .delete()
      .eq('id', connectionId)

    if (error) {
      console.error('Error deleting connection:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

