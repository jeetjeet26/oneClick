/**
 * CRM Sync Utility
 * Helper functions for syncing leads to client CRMs
 */

import { createClient } from '@/utils/supabase/server'

const DATA_ENGINE_URL = process.env.DATA_ENGINE_URL || 'http://localhost:8000'
const DATA_ENGINE_API_KEY = process.env.DATA_ENGINE_API_KEY || ''

export interface LeadData {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  source?: string
  status?: string
  move_in_date?: string
  bedrooms?: string
  notes?: string
}

export interface CRMSyncResult {
  success: boolean
  action: 'created' | 'linked' | 'skipped' | 'failed'
  externalId?: string
  error?: string
}

/**
 * Get CRM integration configuration for a property
 */
export async function getCRMIntegration(propertyId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('integration_credentials')
    .select('*')
    .eq('property_id', propertyId)
    .in('platform', ['yardi', 'realpage', 'salesforce', 'hubspot'])
    .eq('status', 'connected')
    .single()

  if (error || !data) {
    return null
  }

  return {
    crmType: data.platform,
    credentials: data.credentials,
    fieldMapping: data.field_mapping,
    validated: data.mapping_validated,
  }
}

/**
 * Check if a lead already exists in the CRM
 */
export async function searchLeadInCRM(
  propertyId: string,
  email: string,
  phone?: string | null
): Promise<{ found: boolean; externalId?: string; matchType?: string }> {
  try {
    const integration = await getCRMIntegration(propertyId)
    if (!integration) {
      return { found: false }
    }

    const response = await fetch(`${DATA_ENGINE_URL}/crm/search-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DATA_ENGINE_API_KEY,
      },
      body: JSON.stringify({
        property_id: propertyId,
        crm_type: integration.crmType,
        credentials: integration.credentials,
        email,
        phone: phone || undefined,
      }),
    })

    if (!response.ok) {
      console.error('[CRM Sync] Search failed:', await response.text())
      return { found: false }
    }

    const result = await response.json()
    return {
      found: result.found || false,
      externalId: result.external_id,
      matchType: result.match_type,
    }
  } catch (error) {
    console.error('[CRM Sync] Search error:', error)
    return { found: false }
  }
}

/**
 * Push a lead to the client's CRM
 */
export async function pushLeadToCRM(
  propertyId: string,
  leadId: string,
  leadData: LeadData
): Promise<CRMSyncResult> {
  try {
    const integration = await getCRMIntegration(propertyId)
    
    if (!integration) {
      console.log('[CRM Sync] No CRM integration configured for property:', propertyId)
      return { success: true, action: 'skipped' }
    }

    if (!integration.validated) {
      console.log('[CRM Sync] CRM mapping not validated, skipping sync')
      return { success: true, action: 'skipped' }
    }

    // Check if lead already exists
    const searchResult = await searchLeadInCRM(
      propertyId,
      leadData.email || '',
      leadData.phone
    )

    if (searchResult.found && searchResult.externalId) {
      // Lead already exists - link to existing record
      await updateLeadCRMStatus(leadId, searchResult.externalId, 'linked')
      return {
        success: true,
        action: 'linked',
        externalId: searchResult.externalId,
      }
    }

    // Create new lead in CRM
    const response = await fetch(`${DATA_ENGINE_URL}/crm/push-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DATA_ENGINE_API_KEY,
      },
      body: JSON.stringify({
        property_id: propertyId,
        lead_id: leadId,
        crm_type: integration.crmType,
        credentials: integration.credentials,
        lead_data: leadData,
        field_mapping: integration.fieldMapping,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[CRM Sync] Push failed:', errorText)
      await updateLeadCRMStatus(leadId, null, 'failed', errorText)
      return { success: false, action: 'failed', error: errorText }
    }

    const result = await response.json()

    if (result.success && result.external_id) {
      await updateLeadCRMStatus(leadId, result.external_id, result.action)
      return {
        success: true,
        action: result.action,
        externalId: result.external_id,
      }
    } else {
      await updateLeadCRMStatus(leadId, null, 'failed', result.error)
      return { success: false, action: 'failed', error: result.error }
    }
  } catch (error) {
    console.error('[CRM Sync] Push error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await updateLeadCRMStatus(leadId, null, 'failed', errorMsg)
    return { success: false, action: 'failed', error: errorMsg }
  }
}

/**
 * Update lead's CRM sync status in database
 */
async function updateLeadCRMStatus(
  leadId: string,
  externalId: string | null,
  status: 'created' | 'linked' | 'failed',
  error?: string
) {
  try {
    const supabase = await createClient()
    
    await supabase
      .from('leads')
      .update({
        external_crm_id: externalId,
        crm_sync_status: status,
        crm_synced_at: new Date().toISOString(),
        crm_sync_error: error || null,
      })
      .eq('id', leadId)
  } catch (err) {
    console.error('[CRM Sync] Failed to update lead status:', err)
  }
}

/**
 * Sync a lead to CRM (called after lead creation)
 * This is the main function to call from other parts of the app
 */
export async function syncLeadToCRM(
  propertyId: string,
  leadId: string,
  leadData: LeadData
): Promise<CRMSyncResult> {
  console.log(`[CRM Sync] Syncing lead ${leadId} to CRM for property ${propertyId}`)
  
  const result = await pushLeadToCRM(propertyId, leadId, leadData)
  
  if (result.success) {
    console.log(`[CRM Sync] Lead synced successfully: ${result.action}`, result.externalId || '')
  } else {
    console.error(`[CRM Sync] Lead sync failed:`, result.error)
  }
  
  return result
}

