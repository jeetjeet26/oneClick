import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

interface AddressInput {
  street?: string
  city?: string
  state?: string
  zip?: string
}

interface PropertyInput {
  name: string
  type?: string | null
  address?: AddressInput | null
  websiteUrl?: string | null
  additionalUrls?: string[]
  unitCount?: number | null
  yearBuilt?: number | null
  amenities?: string[]
}

// Helper to scrape website and save chunks for a property
async function scrapeAndSaveWebsiteKnowledge(
  propertyId: string,
  websiteUrl: string,
  additionalUrls: string[] = [],
  propertyName: string
): Promise<{ success: boolean; documentsCreated: number; error?: string }> {
  try {
    // Collect all URLs to scrape
    const urlsToScrape = [websiteUrl, ...additionalUrls].filter(u => u?.trim())
    if (urlsToScrape.length === 0) {
      return { success: false, documentsCreated: 0, error: 'No URLs provided' }
    }

    // Call the internal scrape API with propertyId
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/onboarding/scrape-website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        urls: urlsToScrape, 
        propertyId  // Pass propertyId so it saves to DB
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, documentsCreated: 0, error: errorData.error || 'Scrape failed' }
    }

    const result = await response.json()
    return { 
      success: true, 
      documentsCreated: result.documentsCreated || result.chunksCreated || 0 
    }
  } catch (error) {
    console.error('Website scrape error:', error)
    return { 
      success: false, 
      documentsCreated: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

interface ContactInput {
  type: 'primary' | 'secondary' | 'billing' | 'emergency'
  name: string
  email: string
  phone?: string | null
  role?: string | null
  billingAddress?: AddressInput | null
  billingMethod?: string | null
  specialInstructions?: string | null
  needsW9?: boolean
}

interface IntegrationInput {
  platform: string
  status: string
  accountId?: string | null
  accountName?: string | null
  notes?: string | null
}

interface AddPropertyRequestBody {
  property: PropertyInput
  contacts: ContactInput[]
  integrations?: IntegrationInput[]
  documentCount?: number
  // Legacy support for community naming
  community?: PropertyInput
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AddPropertyRequestBody = await request.json()
    // Support both 'property' and legacy 'community' naming
    const property = body.property || body.community
    const { contacts, integrations = [] } = body

    if (!property?.name?.trim()) {
      return NextResponse.json({ error: 'Property name is required' }, { status: 400 })
    }

    // Validate at least one primary contact
    const primaryContact = contacts?.find(c => c.type === 'primary')
    if (!primaryContact?.name?.trim() || !primaryContact?.email?.trim()) {
      return NextResponse.json({ error: 'Primary contact name and email are required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get user's organization
    const { data: profile } = await adminClient
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'You must belong to an organization to add properties' }, { status: 400 })
    }

    // Create property with all profile data consolidated
    const { data: newProperty, error: propertyError } = await adminClient
      .from('properties')
      .insert({
        org_id: profile.org_id,
        name: property.name.trim(),
        address: property.address ? {
          street: property.address.street || null,
          city: property.address.city || null,
          state: property.address.state || null,
          zip: property.address.zip || null,
        } : null,
        settings: {
          timezone: 'America/Los_Angeles',
        },
        // Profile data now directly on properties table
        property_type: property.type || null,
        website_url: property.websiteUrl || null,
        unit_count: property.unitCount || null,
        year_built: property.yearBuilt || null,
        amenities: property.amenities || [],
        onboarding_completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (propertyError) {
      console.error('Error creating property:', propertyError)
      return NextResponse.json({ error: 'Failed to create property' }, { status: 500 })
    }

    // Create contacts
    if (contacts && contacts.length > 0) {
      const contactsToInsert = contacts.map((c, index) => ({
        property_id: newProperty.id,
        contact_type: c.type,
        name: c.name,
        email: c.email,
        phone: c.phone || null,
        role: c.role || null,
        billing_address: c.billingAddress ? {
          street: c.billingAddress.street || null,
          city: c.billingAddress.city || null,
          state: c.billingAddress.state || null,
          zip: c.billingAddress.zip || null,
        } : null,
        billing_method: c.billingMethod || null,
        special_instructions: c.specialInstructions || null,
        needs_w9: c.needsW9 || false,
        is_primary: index === 0,
      }))

      const { error: contactsError } = await adminClient
        .from('property_contacts')
        .insert(contactsToInsert)

      if (contactsError) {
        console.error('Error creating contacts:', contactsError)
      }
    }

    // Create integration records
    if (integrations && integrations.length > 0) {
      const integrationsToInsert = integrations.map(i => ({
        property_id: newProperty.id,
        platform: i.platform,
        status: i.status,
        account_id: i.accountId || null,
        account_name: i.accountName || null,
        notes: i.notes || null,
      }))

      const { error: integrationsError } = await adminClient
        .from('integration_credentials')
        .insert(integrationsToInsert)

      if (integrationsError) {
        console.error('Error creating integrations:', integrationsError)
      }
    }

    // Create default onboarding tasks
    try {
      await adminClient.rpc('create_default_onboarding_tasks', {
        p_property_id: newProperty.id
      })
    } catch (taskError) {
      console.error('Error creating onboarding tasks:', taskError)
    }

    // Create knowledge source record for intake form
    const { error: knowledgeError } = await adminClient
      .from('knowledge_sources')
      .insert({
        property_id: newProperty.id,
        source_type: 'intake_form',
        source_name: 'Add Property Intake Form',
        status: 'completed',
        extracted_data: {
          property: {
            name: property.name,
            type: property.type,
            unitCount: property.unitCount,
            yearBuilt: property.yearBuilt,
            amenities: property.amenities,
            websiteUrl: property.websiteUrl,
          },
        },
        last_synced_at: new Date().toISOString(),
      })

    if (knowledgeError) {
      console.error('Error creating knowledge source:', knowledgeError)
    }

    // If website URL was provided, scrape and save to knowledge base
    if (property.websiteUrl) {
      console.log('Scraping website for knowledge base:', property.websiteUrl)
      const scrapeResult = await scrapeAndSaveWebsiteKnowledge(
        newProperty.id,
        property.websiteUrl,
        property.additionalUrls || [],
        property.name
      )
      if (scrapeResult.success) {
        console.log(`Website scrape complete: ${scrapeResult.documentsCreated} documents created`)
      } else {
        console.error('Website scrape failed:', scrapeResult.error)
      }
    }

    return NextResponse.json({
      success: true,
      property: newProperty,
    })
  } catch (error) {
    console.error('Add property error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
