import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { syncPropertyUnitsToKnowledgeBase } from '@/utils/property-units-kb-sync'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { propertyId } = await req.json()
    
    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
    }
    
    // Verify user has access to this property
    const { data: property } = await supabase
      .from('properties')
      .select('id, org_id')
      .eq('id', propertyId)
      .single()
    
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()
    
    if (profile?.org_id !== property.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Sync units to knowledge base
    const result = await syncPropertyUnitsToKnowledgeBase(propertyId)
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to sync units' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      document_id: result.document_id,
      message: 'Property units synced to knowledge base'
    })
    
  } catch (error: any) {
    console.error('Sync units to KB error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync units' },
      { status: 500 }
    )
  }
}

