import { NextRequest, NextResponse } from 'next/server'
import { getMetaCredentials } from '@/utils/forgestudio/social-config'

// Facebook OAuth - Start the connection flow
// This redirects to Meta's OAuth page (same app as Instagram)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/forgestudio?tab=connections&error=${encodeURIComponent('Property ID required')}`
      )
    }

    // Get Meta credentials (shared with Instagram - same app)
    const credentials = await getMetaCredentials(propertyId)
    
    if (!credentials) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/forgestudio?tab=connections&setup_required=facebook&propertyId=${propertyId}`
      )
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/forgestudio/social/callback/facebook`
    
    // Store propertyId in state for the callback
    const state = Buffer.from(JSON.stringify({ propertyId })).toString('base64')

    // Facebook requires pages_manage_posts for posting
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts', // Required for posting
      'business_management'
    ].join(',')

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', credentials.appId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')

    return NextResponse.redirect(authUrl.toString())

  } catch (error) {
    console.error('Facebook OAuth error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/forgestudio?tab=connections&error=${encodeURIComponent('Failed to start Facebook connection')}`
    )
  }
}
