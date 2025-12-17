import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'

// GET - List documents for a property
export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get unique documents by title/source
    const { data, error } = await supabase
      .from('documents')
      .select('id, content, metadata, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by source file
    const groupedDocs = new Map<string, {
      id: string
      title: string
      source: string
      chunks: number
      created_at: string
      preview: string
    }>()

    for (const doc of data || []) {
      const source = doc.metadata?.source || doc.metadata?.title || 'Unknown'
      
      if (!groupedDocs.has(source)) {
        groupedDocs.set(source, {
          id: doc.id,
          title: doc.metadata?.title || source,
          source,
          chunks: 1,
          created_at: doc.created_at,
          preview: doc.content.slice(0, 200) + '...',
        })
      } else {
        const existing = groupedDocs.get(source)!
        existing.chunks += 1
      }
    }

    return NextResponse.json({
      documents: Array.from(groupedDocs.values()),
      total: groupedDocs.size,
    })
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Remove a document and all its chunks
export async function DELETE(req: NextRequest) {
  try {
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const source = searchParams.get('source')
    const propertyId = searchParams.get('propertyId')

    if (!source || !propertyId) {
      return NextResponse.json({ error: 'source and propertyId are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Delete all chunks with this source
    const { error, count } = await supabase
      .from('documents')
      .delete({ count: 'exact' })
      .eq('property_id', propertyId)
      .eq('metadata->>source', source)

    if (error) {
      console.error('Error deleting document:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      deleted: count || 0,
    })
  } catch (error) {
    console.error('Document delete error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

















