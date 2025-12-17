/**
 * PropertyAudit Queries API
 * Manage query panels for GEO tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export interface GeoQuery {
  id: string
  propertyId: string
  text: string
  type: 'branded' | 'category' | 'comparison' | 'local' | 'faq'
  geo: string | null
  weight: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// GET: List queries for a property
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')
    const type = searchParams.get('type')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId required' }, { status: 400 })
    }

    let query = supabase
      .from('geo_queries')
      .select('*')
      .eq('property_id', propertyId)
      .order('type', { ascending: true })
      .order('created_at', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: queries, error } = await query

    if (error) {
      console.error('Error fetching queries:', error)
      return NextResponse.json({ error: 'Failed to fetch queries' }, { status: 500 })
    }

    // Group by type for easy consumption
    const grouped = {
      branded: queries?.filter(q => q.type === 'branded') || [],
      category: queries?.filter(q => q.type === 'category') || [],
      comparison: queries?.filter(q => q.type === 'comparison') || [],
      local: queries?.filter(q => q.type === 'local') || [],
      faq: queries?.filter(q => q.type === 'faq') || [],
    }

    return NextResponse.json({
      queries: queries?.map(formatQuery) || [],
      grouped,
      total: queries?.length || 0,
    })
  } catch (error) {
    console.error('PropertyAudit Queries GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create new query or generate query panel from property data
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { propertyId, query, generateFromProperty } = body

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId required' }, { status: 400 })
    }

    // Generate query panel from property data
    if (generateFromProperty) {
      const queries = await generateQueryPanel(supabase, propertyId)
      
      // Insert all generated queries
      const { data: insertedQueries, error: insertError } = await supabase
        .from('geo_queries')
        .insert(queries)
        .select()

      if (insertError) {
        console.error('Error inserting generated queries:', insertError)
        return NextResponse.json({ error: 'Failed to generate query panel' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        generated: insertedQueries?.length || 0,
        queries: insertedQueries?.map(formatQuery) || [],
      })
    }

    // Create single query
    if (query) {
      const { data: newQuery, error: insertError } = await supabase
        .from('geo_queries')
        .insert({
          property_id: propertyId,
          text: query.text,
          type: query.type,
          geo: query.geo || null,
          weight: query.weight || 1,
          is_active: true,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting query:', insertError)
        return NextResponse.json({ error: 'Failed to create query' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        query: formatQuery(newQuery),
      })
    }

    return NextResponse.json({ error: 'query or generateFromProperty required' }, { status: 400 })
  } catch (error) {
    console.error('PropertyAudit Queries POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove a query
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const queryId = searchParams.get('queryId')

    if (!queryId) {
      return NextResponse.json({ error: 'queryId required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('geo_queries')
      .delete()
      .eq('id', queryId)

    if (error) {
      console.error('Error deleting query:', error)
      return NextResponse.json({ error: 'Failed to delete query' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PropertyAudit Queries DELETE Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Generate query panel from property data
async function generateQueryPanel(supabase: Awaited<ReturnType<typeof createClient>>, propertyId: string) {
  // Fetch property data
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select(`
      id,
      name,
      address,
      property_type,
      amenities,
      special_features
    `)
    .eq('id', propertyId)
    .single()

  if (propertyError || !property) {
    console.error('Property fetch error:', propertyError)
    throw new Error('Property not found')
  }

  // Extract city/state from JSONB address
  const addressObj = property.address as { city?: string; state?: string; street?: string } | null
  const city = addressObj?.city || 'Unknown City'
  const state = addressObj?.state || ''

  // Fetch competitors from MarketVision
  const { data: competitors } = await supabase
    .from('competitors')
    .select('name')
    .eq('property_id', propertyId)
    .limit(5)

  const queries: Array<{
    property_id: string
    text: string
    type: string
    geo: string | null
    weight: number
    is_active: boolean
  }> = []

  const cityState = state ? `${city}, ${state}` : city
  const propertyName = property.name

  // Branded queries (weight: 1.5)
  queries.push(
    { property_id: propertyId, text: `What is ${propertyName}?`, type: 'branded', geo: cityState, weight: 1.5, is_active: true },
    { property_id: propertyId, text: `Is ${propertyName} a good place to live?`, type: 'branded', geo: cityState, weight: 1.5, is_active: true },
    { property_id: propertyId, text: `${propertyName} reviews`, type: 'branded', geo: cityState, weight: 1.5, is_active: true },
    { property_id: propertyId, text: `${propertyName} apartments`, type: 'branded', geo: cityState, weight: 1.5, is_active: true },
  )

  // Category queries (weight: 1.0)
  queries.push(
    { property_id: propertyId, text: `Best apartments in ${city}`, type: 'category', geo: cityState, weight: 1.0, is_active: true },
    { property_id: propertyId, text: `Top rated apartments ${cityState}`, type: 'category', geo: cityState, weight: 1.0, is_active: true },
    { property_id: propertyId, text: `Luxury apartments ${city}`, type: 'category', geo: cityState, weight: 1.0, is_active: true },
    { property_id: propertyId, text: `Best places to rent in ${city}`, type: 'category', geo: cityState, weight: 1.0, is_active: true },
  )

  // Local queries (weight: 1.2)
  queries.push(
    { property_id: propertyId, text: `Apartments near ${addressObj?.street || city}`, type: 'local', geo: cityState, weight: 1.2, is_active: true },
    { property_id: propertyId, text: `Apartments in ${city} downtown`, type: 'local', geo: cityState, weight: 1.2, is_active: true },
  )

  // Comparison queries (weight: 1.3)
  if (competitors && competitors.length > 0) {
    for (const competitor of competitors.slice(0, 3)) {
      queries.push({
        property_id: propertyId,
        text: `${propertyName} vs ${competitor.name}`,
        type: 'comparison',
        geo: cityState,
        weight: 1.3,
        is_active: true,
      })
    }
  }

  // FAQ queries from amenities (weight: 1.0)
  const amenities = property.amenities || []
  const amenityQueries = [
    { amenity: 'pool', query: `apartments with pool in ${city}` },
    { amenity: 'gym', query: `apartments with fitness center in ${city}` },
    { amenity: 'pet', query: `pet friendly apartments in ${city}` },
    { amenity: 'parking', query: `apartments with covered parking ${city}` },
    { amenity: 'rooftop', query: `apartments with rooftop ${city}` },
  ]

  for (const aq of amenityQueries) {
    const hasAmenity = amenities.some((a: string) => 
      a.toLowerCase().includes(aq.amenity)
    )
    if (hasAmenity) {
      queries.push({
        property_id: propertyId,
        text: aq.query,
        type: 'faq',
        geo: cityState,
        weight: 1.0,
        is_active: true,
      })
    }
  }

  // General FAQ queries
  queries.push(
    { property_id: propertyId, text: `What is the average rent in ${city}?`, type: 'faq', geo: cityState, weight: 1.0, is_active: true },
    { property_id: propertyId, text: `How to find good apartments in ${city}`, type: 'faq', geo: cityState, weight: 1.0, is_active: true },
  )

  return queries
}

// Format query for API response
function formatQuery(query: Record<string, unknown>): GeoQuery {
  return {
    id: query.id as string,
    propertyId: query.property_id as string,
    text: query.text as string,
    type: query.type as GeoQuery['type'],
    geo: query.geo as string | null,
    weight: query.weight as number,
    isActive: query.is_active as boolean,
    createdAt: query.created_at as string,
    updatedAt: query.updated_at as string,
  }
}
