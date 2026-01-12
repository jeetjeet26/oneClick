/**
 * CRM Integration API Routes
 * Proxies requests to the Python data-engine for CRM operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Data engine configuration
const DATA_ENGINE_URL = process.env.DATA_ENGINE_URL || 'http://localhost:8000'
const DATA_ENGINE_API_KEY = process.env.DATA_ENGINE_API_KEY || ''

/**
 * Helper to call data-engine with proper auth
 */
async function callDataEngine(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(`${DATA_ENGINE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DATA_ENGINE_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || data.error || `API returned ${response.status}`,
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[CRM API] Data engine call failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to data engine',
    }
  }
}

/**
 * Verify user has access to the property
 */
async function verifyPropertyAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', userId)
    .single()

  if (!profile) return false

  const { data: property } = await supabase
    .from('properties')
    .select('org_id')
    .eq('id', propertyId)
    .single()

  if (!property) return false

  return profile.org_id === property.org_id
}

/**
 * POST /api/integrations/crm
 * 
 * Actions:
 * - test-connection: Test CRM API connection
 * - discover-schema: AI-powered schema discovery and field mapping
 * - search-lead: Check if lead exists in CRM
 * - push-lead: Push lead to CRM
 * - validate-mapping: Validate field mapping with test sync
 * - save-mapping: Save validated field mapping
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, propertyId, ...params } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      )
    }

    // For property-specific actions, verify access
    if (propertyId) {
      const hasAccess = await verifyPropertyAccess(supabase, propertyId, user.id)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this property' },
          { status: 403 }
        )
      }
    }

    // Route to appropriate data-engine endpoint
    let endpoint: string
    let requestBody: Record<string, unknown>

    switch (action) {
      case 'test-connection':
        endpoint = '/crm/test-connection'
        requestBody = {
          crm_type: params.crmType,
          credentials: params.credentials,
        }
        break

      case 'discover-schema':
        endpoint = '/crm/discover-schema'
        requestBody = {
          property_id: propertyId,
          crm_type: params.crmType,
          credentials: params.credentials,
        }
        break

      case 'search-lead':
        endpoint = '/crm/search-lead'
        requestBody = {
          property_id: propertyId,
          crm_type: params.crmType,
          credentials: params.credentials,
          email: params.email,
          phone: params.phone,
        }
        break

      case 'push-lead':
        endpoint = '/crm/push-lead'
        requestBody = {
          property_id: propertyId,
          lead_id: params.leadId,
          crm_type: params.crmType,
          credentials: params.credentials,
          lead_data: params.leadData,
          field_mapping: params.fieldMapping,
        }
        break

      case 'validate-mapping':
        endpoint = '/crm/validate-mapping'
        requestBody = {
          property_id: propertyId,
          crm_type: params.crmType,
          credentials: params.credentials,
          field_mapping: params.fieldMapping,
        }
        break

      case 'save-mapping':
        endpoint = '/crm/save-mapping'
        requestBody = {
          property_id: propertyId,
          crm_type: params.crmType,
          credentials: params.credentials,
          field_mapping: params.fieldMapping,
          validated: params.validated || false,
        }
        break

      case 'record-correction':
        endpoint = '/crm/record-correction'
        requestBody = {
          crm_type: params.crmType,
          tourspark_field: params.toursparkField,
          suggested_crm_field: params.suggestedCrmField,
          final_crm_field: params.finalCrmField,
        }
        break

      case 'sync-stats':
        endpoint = '/crm/sync-stats'
        requestBody = {
          property_id: propertyId,
          date_from: params.dateFrom,
          date_to: params.dateTo,
        }
        break

      case 'sync-history':
        endpoint = `/crm/sync-history/${propertyId}?limit=${params.limit || 50}`
        // This is a GET request, handle separately
        const historyResult = await callDataEngine(endpoint, 'GET')
        if (!historyResult.success) {
          return NextResponse.json({ error: historyResult.error }, { status: 500 })
        }
        return NextResponse.json(historyResult.data)

      case 'bulk-sync':
        endpoint = '/crm/bulk-sync'
        requestBody = {
          property_id: propertyId,
          lead_ids: params.leadIds,
        }
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    // Call data engine
    const result = await callDataEngine(endpoint, 'POST', requestBody)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data)

  } catch (error) {
    console.error('[CRM API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/integrations/crm
 * 
 * Query params:
 * - action: 'learned-patterns' | 'tourspark-schema' | 'integration-status'
 * - crmType: (for learned-patterns)
 * - propertyId: (for integration-status)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const crmType = searchParams.get('crmType')
    const propertyId = searchParams.get('propertyId')

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'learned-patterns':
        if (!crmType) {
          return NextResponse.json(
            { error: 'Missing crmType parameter' },
            { status: 400 }
          )
        }
        const patternsResult = await callDataEngine(`/crm/learned-patterns/${crmType}`, 'GET')
        if (!patternsResult.success) {
          return NextResponse.json({ error: patternsResult.error }, { status: 500 })
        }
        return NextResponse.json(patternsResult.data)

      case 'tourspark-schema':
        const schemaResult = await callDataEngine('/crm/tourspark-schema', 'GET')
        if (!schemaResult.success) {
          return NextResponse.json({ error: schemaResult.error }, { status: 500 })
        }
        return NextResponse.json(schemaResult.data)

      case 'integration-status':
        if (!propertyId) {
          return NextResponse.json(
            { error: 'Missing propertyId parameter' },
            { status: 400 }
          )
        }
        
        // Verify property access
        const hasAccess = await verifyPropertyAccess(supabase, propertyId, user.id)
        if (!hasAccess) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Get integration status from database
        const { data: integration, error: integrationError } = await supabase
          .from('integration_credentials')
          .select('*')
          .eq('property_id', propertyId)
          .in('platform', ['crm', 'pms', 'yardi', 'realpage', 'salesforce', 'hubspot'])
          .single()

        if (integrationError && integrationError.code !== 'PGRST116') {
          return NextResponse.json({ error: integrationError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          configured: !!integration,
          integration: integration || null,
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('[CRM API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

