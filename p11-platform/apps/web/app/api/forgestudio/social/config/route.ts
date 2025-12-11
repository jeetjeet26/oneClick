import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Simple encryption/decryption for app secrets
// In production, use a proper KMS like AWS KMS or Vault
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'p11-platform-default-key-change-me'

function encrypt(text: string): string {
  // Simple base64 encoding with key mixing - replace with proper encryption in production
  const mixed = Buffer.from(text).toString('base64')
  return `enc_${mixed}`
}

function decrypt(encrypted: string): string {
  if (!encrypted.startsWith('enc_')) return encrypted
  const mixed = encrypted.slice(4)
  return Buffer.from(mixed, 'base64').toString('utf-8')
}

// GET - Check if OAuth config exists for a property/platform
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const platform = searchParams.get('platform') || 'meta'

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID required' },
        { status: 400 }
      )
    }

    // Check database for stored config
    const { data: dbConfig } = await supabase
      .from('social_auth_configs')
      .select('id, platform, app_id, is_configured, last_verified_at, created_at')
      .eq('property_id', propertyId)
      .eq('platform', platform)
      .single()

    // Also check environment variables as fallback
    const hasEnvConfig = platform === 'meta' 
      ? !!(process.env.META_APP_ID && process.env.META_APP_SECRET)
      : false

    return NextResponse.json({
      hasConfig: !!dbConfig || hasEnvConfig,
      configSource: dbConfig ? 'database' : (hasEnvConfig ? 'environment' : null),
      config: dbConfig ? {
        id: dbConfig.id,
        platform: dbConfig.platform,
        appId: dbConfig.app_id,
        isConfigured: dbConfig.is_configured,
        lastVerifiedAt: dbConfig.last_verified_at,
        createdAt: dbConfig.created_at
      } : null
    })

  } catch (error) {
    console.error('Error checking social auth config:', error)
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    )
  }
}

// POST - Save OAuth credentials for a property
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { propertyId, platform, appId, appSecret } = body

    if (!propertyId || !platform || !appId || !appSecret) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, platform, appId, appSecret' },
        { status: 400 }
      )
    }

    // Validate platform
    const validPlatforms = ['meta', 'linkedin', 'twitter']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    // Encrypt the app secret
    const encryptedSecret = encrypt(appSecret)

    // Upsert the config
    const { data, error } = await supabase
      .from('social_auth_configs')
      .upsert({
        property_id: propertyId,
        platform,
        app_id: appId,
        app_secret_encrypted: encryptedSecret,
        is_configured: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'property_id,platform'
      })
      .select('id, platform, app_id, is_configured, created_at')
      .single()

    if (error) {
      console.error('Error saving social auth config:', error)
      return NextResponse.json(
        { error: 'Failed to save configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      config: {
        id: data.id,
        platform: data.platform,
        appId: data.app_id,
        isConfigured: data.is_configured
      }
    })

  } catch (error) {
    console.error('Error saving social auth config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove OAuth credentials for a property
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const platform = searchParams.get('platform') || 'meta'

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('social_auth_configs')
      .delete()
      .eq('property_id', propertyId)
      .eq('platform', platform)

    if (error) {
      console.error('Error deleting social auth config:', error)
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting social auth config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get decrypted credentials (for use by other API routes)
export async function getMetaCredentials(propertyId: string): Promise<{
  appId: string
  appSecret: string
  source: 'database' | 'environment'
} | null> {
  // First check database
  const { data } = await supabase
    .from('social_auth_configs')
    .select('app_id, app_secret_encrypted')
    .eq('property_id', propertyId)
    .eq('platform', 'meta')
    .single()

  if (data) {
    return {
      appId: data.app_id,
      appSecret: decrypt(data.app_secret_encrypted),
      source: 'database'
    }
  }

  // Fallback to environment variables
  if (process.env.META_APP_ID && process.env.META_APP_SECRET) {
    return {
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      source: 'environment'
    }
  }

  return null
}






