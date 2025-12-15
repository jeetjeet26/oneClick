import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { syncPropertyUnitsToKnowledgeBase } from '@/utils/property-units-kb-sync'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: units, error } = await supabase
      .from('property_units')
      .select('*')
      .eq('property_id', id)
      .order('bedrooms', { ascending: true })
      .order('unit_type', { ascending: true })
    
    if (error) throw error
    
    // Auto-sync units to knowledge base if units exist but no pricing document
    if (units && units.length > 0) {
      const adminClient = createAdminClient()
      
      // Check if pricing document exists
      const { data: pricingDoc } = await adminClient
        .from('documents')
        .select('id')
        .eq('property_id', id)
        .eq('metadata->>category', 'pricing')
        .eq('metadata->>source', 'property_units')
        .single()
      
      // If no pricing document, sync units to KB
      if (!pricingDoc) {
        const syncResult = await syncPropertyUnitsToKnowledgeBase(id)
        if (!syncResult.success) {
          console.warn('Auto-sync to KB failed:', syncResult.error)
        }
      }
    }
    
    return NextResponse.json({ units: units || [] })
    
  } catch (error: any) {
    console.error('Error fetching property units:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

