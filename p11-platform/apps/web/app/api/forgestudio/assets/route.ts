import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch content assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const assetType = searchParams.get('assetType')
    const tags = searchParams.get('tags')?.split(',')
    const folder = searchParams.get('folder')
    const aiGenerated = searchParams.get('aiGenerated')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('content_assets')
      .select('*', { count: 'exact' })
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (assetType) {
      query = query.eq('asset_type', assetType)
    }

    if (folder) {
      query = query.eq('folder', folder)
    }

    if (aiGenerated !== null) {
      query = query.eq('is_ai_generated', aiGenerated === 'true')
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching assets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      assets: data,
      total: count,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Upload a new asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      propertyId,
      name,
      description,
      assetType,
      fileUrl,
      thumbnailUrl,
      fileSizeBytes,
      width,
      height,
      durationSeconds,
      format,
      tags,
      folder,
      uploadedBy
    } = body

    if (!propertyId || !name || !assetType || !fileUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('content_assets')
      .insert({
        property_id: propertyId,
        name,
        description,
        asset_type: assetType,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        file_size_bytes: fileSizeBytes,
        width,
        height,
        duration_seconds: durationSeconds,
        format,
        tags: tags || [],
        folder,
        is_ai_generated: false,
        uploaded_by: uploadedBy
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating asset:', error)
      return NextResponse.json(
        { error: 'Failed to create asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      asset: data
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update an asset
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      assetId,
      name,
      description,
      tags,
      folder,
      isFavorite
    } = body

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (tags !== undefined) updateData.tags = tags
    if (folder !== undefined) updateData.folder = folder
    if (isFavorite !== undefined) updateData.is_favorite = isFavorite

    const { data, error } = await supabase
      .from('content_assets')
      .update(updateData)
      .eq('id', assetId)
      .select()
      .single()

    if (error) {
      console.error('Error updating asset:', error)
      return NextResponse.json(
        { error: 'Failed to update asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      asset: data
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an asset
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('content_assets')
      .delete()
      .eq('id', assetId)

    if (error) {
      console.error('Error deleting asset:', error)
      return NextResponse.json(
        { error: 'Failed to delete asset' },
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

