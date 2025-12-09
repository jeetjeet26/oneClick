import { NextRequest, NextResponse } from 'next/server'

// Instagram/Facebook OAuth - Start the connection flow
// This redirects to Meta's OAuth page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID required' },
        { status: 400 }
      )
    }

    const clientId = process.env.META_APP_ID
    if (!clientId) {
      return NextResponse.json(
        { error: 'Meta App ID not configured. Please add META_APP_ID to environment variables.' },
        { status: 500 }
      )
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/forgestudio/social/callback/instagram`
    
    // Store propertyId in state for the callback
    const state = Buffer.from(JSON.stringify({ propertyId })).toString('base64')

    // Required scopes for Instagram posting via Facebook Pages
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
      'business_management'
    ].join(',')

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')

    return NextResponse.redirect(authUrl.toString())

  } catch (error) {
    console.error('Instagram OAuth error:', error)
    return NextResponse.json(
      { error: 'Failed to start Instagram connection' },
      { status: 500 }
    )
  }
}

