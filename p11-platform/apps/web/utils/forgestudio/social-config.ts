import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SocialCredentials {
  appId: string
  appSecret: string
}

/**
 * Get Meta (Facebook/Instagram) credentials for a property
 * First checks the property's social_app_credentials table, then falls back to env vars
 */
export async function getMetaCredentials(propertyId: string): Promise<SocialCredentials | null> {
  try {
    // Try to get property-specific credentials from DB
    const { data, error } = await supabase
      .from('social_app_credentials')
      .select('app_id, app_secret')
      .eq('property_id', propertyId)
      .eq('platform', 'meta')
      .eq('is_active', true)
      .single()

    if (!error && data) {
      return {
        appId: data.app_id,
        appSecret: data.app_secret
      }
    }
  } catch (error) {
    console.error('Error fetching Meta credentials from DB:', error)
  }

  // Fallback to environment variables
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET

  if (appId && appSecret) {
    return { appId, appSecret }
  }

  return null
}

/**
 * Get LinkedIn credentials for a property
 * First checks the property's social_app_credentials table, then falls back to env vars
 */
export async function getLinkedInCredentials(propertyId: string): Promise<SocialCredentials | null> {
  try {
    // Try to get property-specific credentials from DB
    const { data, error } = await supabase
      .from('social_app_credentials')
      .select('app_id, app_secret')
      .eq('property_id', propertyId)
      .eq('platform', 'linkedin')
      .eq('is_active', true)
      .single()

    if (!error && data) {
      return {
        appId: data.app_id,
        appSecret: data.app_secret
      }
    }
  } catch (error) {
    console.error('Error fetching LinkedIn credentials from DB:', error)
  }

  // Fallback to environment variables
  const appId = process.env.LINKEDIN_APP_ID || process.env.LINKEDIN_CLIENT_ID
  const appSecret = process.env.LINKEDIN_APP_SECRET || process.env.LINKEDIN_CLIENT_SECRET

  if (appId && appSecret) {
    return { appId, appSecret }
  }

  return null
}
