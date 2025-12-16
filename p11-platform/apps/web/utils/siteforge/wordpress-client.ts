// SiteForge: WordPress Client
// Handles WordPress REST API, WP-CLI, and Cloudways API interactions
// Created: December 11, 2025

import type { SiteArchitecture, GeneratedPage, WebsiteAsset } from '@/types/siteforge'

interface CloudwaysCredentials {
  apiKey: string
  email: string
}

interface WordPressInstance {
  instanceId: string
  url: string
  adminUrl: string
  credentials: {
    username: string
    password: string
  }
}

/**
 * Cloudways API Client
 */
export class CloudwaysClient {
  private apiKey: string
  private email: string
  private baseUrl = 'https://api.cloudways.com/api/v1'
  
  constructor(credentials: CloudwaysCredentials) {
    this.apiKey = credentials.apiKey
    this.email = credentials.email
  }
  
  /**
   * Create a new WordPress instance
   */
  async createWordPressInstance(propertyName: string): Promise<WordPressInstance> {
    // TODO: Implement Cloudways API integration
    // This will:
    // 1. Create new WordPress app via Cloudways API
    // 2. Wait for provisioning
    // 3. Return instance details
    
    console.log('TODO: Implement Cloudways WordPress creation for:', propertyName)
    
    // Placeholder response
    const slug = slugify(propertyName)
    return {
      instanceId: 'placeholder-id',
      url: `https://${slug}.p11sites.com`,
      adminUrl: `https://${slug}.p11sites.com/wp-admin`,
      credentials: {
        username: 'admin',
        password: generateSecurePassword()
      }
    }
  }
  
  /**
   * Deploy theme and plugins to WordPress instance
   */
  async deployThemeAndPlugins(instanceId: string): Promise<void> {
    // TODO: Implement WP-CLI automation
    // This will:
    // 1. Install Collection theme
    // 2. Activate theme
    // 3. Install required plugins (ACF Pro, Yoast, etc.)
    // 4. Activate plugins
    // 5. Configure basic settings
    
    console.log('TODO: Deploy Collection theme to instance:', instanceId)
  }
  
  /**
   * Upload assets to WordPress media library
   */
  async uploadAssets(
    instanceId: string,
    assets: WebsiteAsset[]
  ): Promise<Map<string, number>> {
    // TODO: Implement media upload via WordPress REST API
    // Returns map of asset ID → WordPress media ID
    
    console.log('TODO: Upload', assets.length, 'assets to WordPress')
    return new Map()
  }
}

/**
 * WordPress REST API Client
 */
export class WordPressAPIClient {
  private baseUrl: string
  private credentials: {
    username: string
    password: string
  }
  
  constructor(wpUrl: string, credentials: { username: string; password: string }) {
    this.baseUrl = `${wpUrl}/wp-json/wp/v2`
    this.credentials = credentials
  }
  
  /**
   * Create WordPress page with ACF blocks
   */
  async createPage(page: GeneratedPage, mediaIds: Map<string, number>): Promise<number> {
    const blocks = page.sections.map(section => 
      convertToGutenbergBlock(section, mediaIds)
    )
    
    const content = renderGutenbergBlocks(blocks)
    
    const response = await this.post('/pages', {
      title: page.title,
      slug: page.slug,
      status: 'publish',
      content,
      // ACF blocks carry their data inside block attrs; meta mapping is optional
    })
    
    const id = typeof response.id === 'number' ? response.id : undefined
    if (!id) throw new Error('WordPress API did not return a page id')
    return id
  }
  
  /**
   * Update WordPress site settings
   */
  async updateSiteSettings(settings: {
    siteName: string
    tagline: string
    logo?: number
    primaryColor?: string
    secondaryColor?: string
  }): Promise<void> {
    // Site settings are not part of wp/v2 base endpoint; this is environment-specific
    // Keep as a no-op for now (safe default).
    console.log('Skipping WordPress settings update (not implemented)')
  }
  
  /**
   * Create navigation menu
   */
  async createNavigation(architecture: SiteArchitecture): Promise<void> {
    console.log('Skipping navigation creation (not implemented)')
  }
  
  /**
   * Configure Yoast SEO
   */
  async configureYoastSEO(_property: unknown): Promise<void> {
    console.log('Skipping Yoast SEO configuration (not implemented)')
  }
  
  private async post(endpoint: string, data: unknown): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${endpoint}`
    const auth = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64')
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`
      },
      body: JSON.stringify(data)
    })

    const text = await res.text()
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      // ignore
    }

    if (!res.ok) {
      const message =
        json && typeof json === 'object' && 'message' in json ? String((json as Record<string, unknown>).message) : text || 'Unknown error'
      throw new Error(`WordPress API POST ${endpoint} failed (${res.status}): ${message}`)
    }

    return (json && typeof json === 'object' ? (json as Record<string, unknown>) : {}) as Record<string, unknown>
  }
}

/**
 * Convert section to Gutenberg block format
 */
type GutenbergBlock = {
  blockName: string
  attrs?: Record<string, unknown>
}

function convertToGutenbergBlock(
  section: { acfBlock: string; content: Record<string, unknown> },
  _mediaIds: Map<string, number>
): GutenbergBlock {
  // For ACF blocks, the Collection theme reads $block['attrs']['data'].
  // We store our section.content as attrs.data directly.
  return {
    blockName: section.acfBlock,
    attrs: {
      data: section.content
    }
  }
}

/**
 * Render Gutenberg blocks as HTML
 */
function renderGutenbergBlocks(blocks: GutenbergBlock[]): string {
  return blocks
    .map(b => {
      const attrs = b.attrs && Object.keys(b.attrs).length > 0 ? ` ${JSON.stringify(b.attrs)}` : ''
      return `<!-- wp:${b.blockName}${attrs} /-->`
    })
    .join('\n\n')
}

/**
 * Utility: slugify string
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Utility: generate secure password
 */
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  return Array.from({ length: 24 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
}

/**
 * Complete WordPress deployment orchestration
 */
export async function deployToWordPress(
  architecture: SiteArchitecture,
  propertyContext: { name: string; tagline?: string },
  assets: WebsiteAsset[],
  cloudwaysCredentials: CloudwaysCredentials
): Promise<WordPressInstance> {
  const cloudways = new CloudwaysClient(cloudwaysCredentials)
  
  // 1. Create WordPress instance
  const instance = await cloudways.createWordPressInstance(propertyContext.name)
  
  // 2. Deploy theme and plugins
  await cloudways.deployThemeAndPlugins(instance.instanceId)
  
  // 3. Upload assets
  const mediaIds = await cloudways.uploadAssets(instance.instanceId, assets)
  
  // 4. Create pages
  const wpClient = new WordPressAPIClient(instance.url, instance.credentials)
  
  for (const page of architecture.pages) {
    await wpClient.createPage(page, mediaIds)
  }
  
  // 5. Configure site settings
  await wpClient.updateSiteSettings({
    siteName: propertyContext.name,
    tagline: propertyContext.tagline || '',
    logo: mediaIds.get('logo')
  })
  
  // 6. Create navigation
  await wpClient.createNavigation(architecture)
  
  // 7. Configure SEO
  await wpClient.configureYoastSEO(propertyContext)
  
  return instance
}

/**
 * Deploy to an existing WordPress instance (no Cloudways provisioning).
 * Assumes the instance already has required theme/plugins installed.
 */
export async function deployToExistingWordPress(args: {
  wpUrl: string
  credentials: { username: string; password: string }
  pages: GeneratedPage[]
  propertyContext: { name: string; tagline?: string }
  assets: WebsiteAsset[]
}): Promise<WordPressInstance> {
  const { wpUrl, credentials, pages, propertyContext } = args
  const wpClient = new WordPressAPIClient(wpUrl, credentials)

  // Media upload is TODO; pages will reference placeholders by index.
  const mediaIds = new Map<string, number>()

  for (const page of pages) {
    await wpClient.createPage(page, mediaIds)
  }

  return {
    instanceId: 'existing',
    url: wpUrl,
    adminUrl: `${wpUrl.replace(/\/$/, '')}/wp-admin`,
    credentials
  }
}







