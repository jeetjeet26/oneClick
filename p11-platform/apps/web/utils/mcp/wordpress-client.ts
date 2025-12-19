// WordPress MCP Client
// TypeScript wrapper for WordPress MCP server
// Provides typed access to WordPress discovery and deployment tools
// Created: December 16, 2025

export interface WordPressCapabilities {
  availableBlocks: string[]
  blockSchemas: Record<string, ACFBlockSchema>
  designTokens: ThemeDesignTokens
  theme: {
    name: string
    version: string
    supports: Record<string, boolean>
  }
  plugins: string[]
  capabilities: {
    canCreatePages: boolean
    canUploadMedia: boolean
    canModifyTheme: boolean
    canInstallPlugins: boolean
    maxUploadSizeMb: number
  }
}

export interface ACFBlockSchema {
  label: string
  description: string
  fields: Record<string, FieldSchema>
  variants?: Record<string, BlockVariant>
  cssClasses?: string[]
  exampleUsage?: Record<string, unknown>
}

interface FieldSchema {
  type: string
  required?: boolean
  default?: unknown
  choices?: string[]
  min?: number
  max?: number
  description?: string
}

interface BlockVariant {
  cssClass: string
  description: string
  bestFor: string[]
  exampleScreenshot?: string
}

export interface ThemeDesignTokens {
  colors: {
    primary: string
    secondary: string
    availableVariants: string[]
  }
  typography: {
    availableFonts: string[]
    headingScales: string[]
  }
  spacing: {
    availableScales: string[]
    presets: Record<string, unknown>
  }
}

/**
 * WordPress MCP Client
 * Wraps MCP server calls in typed interface
 */
export class WordPressMcpClient {
  private cacheKey = 'wordpress-capabilities-cache'
  private cacheDuration = 24 * 60 * 60 * 1000 // 24 hours
  
  /**
   * Get WordPress capabilities (with caching)
   */
  async getCapabilities(
    instanceId: string = 'template-collection-theme',
    forceRefresh: boolean = false
  ): Promise<WordPressCapabilities> {
    
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getFromCache(instanceId)
      if (cached) return cached
    }
    
    // Call MCP server for fresh data
    const [abilities, schemas, tokens] = await Promise.all([
      this.callMcp('get_wordpress_abilities', { instance_id: instanceId }),
      this.callMcp('get_acf_block_schemas', { instance_id: instanceId }),
      this.callMcp('get_theme_design_tokens', { instance_id: instanceId })
    ])
    
    const capabilities: WordPressCapabilities = {
      availableBlocks: abilities.available_blocks,
      blockSchemas: schemas,
      designTokens: tokens,
      theme: abilities.theme,
      plugins: abilities.plugins,
      capabilities: abilities.capabilities
    }
    
    // Cache result
    this.saveToCache(instanceId, capabilities)
    
    return capabilities
  }
  
  /**
   * Analyze existing WordPress site (like Cadence Creek)
   */
  async analyzeExistingSite(url: string): Promise<SiteAnalysis> {
    return this.callMcp('analyze_existing_site', { url })
  }
  
  /**
   * Discover variants for specific block
   */
  async discoverBlockVariants(
    instanceId: string,
    blockName: string
  ): Promise<Record<string, BlockVariant>> {
    return this.callMcp('discover_block_variants', { instance_id: instanceId, block_name: blockName })
  }
  
  /**
   * Deploy blueprint to WordPress
   */
  async deployBlueprint(
    instanceId: string,
    blueprint: unknown
  ): Promise<DeploymentResult> {
    return this.callMcp('deploy_siteforge_blueprint', { instance_id: instanceId, blueprint })
  }
  
  /**
   * Create new WordPress instance
   */
  async createInstance(
    propertyName: string,
    propertyId: string
  ): Promise<WordPressInstance> {
    return this.callMcp('create_wordpress_instance', { property_name: propertyName, property_id: propertyId })
  }
  
  /**
   * Call MCP server (abstraction for future MCP protocol integration)
   */
  private async callMcp(tool: string, args: Record<string, unknown>): Promise<any> {
    // Server-side: Use mock data directly (no fetch needed)
    // This avoids the "Failed to parse URL" error when running in API routes
    if (typeof window === 'undefined') {
      console.log(`[WordPress MCP] Server-side call: ${tool}`)
      return this.getMockResponse(tool, args)
    }
    
    // Client-side: Call REST endpoint that wraps MCP server
    try {
      const response = await fetch('/api/mcp/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, arguments: args })
      })
      
      if (!response.ok) {
        console.warn(`WordPress MCP call failed: ${response.statusText}, using mock`)
        return this.getMockResponse(tool, args)
      }
      
      const data = await response.json()
      return data.result
    } catch (error) {
      console.warn('WordPress MCP fetch failed, using mock:', error)
      return this.getMockResponse(tool, args)
    }
  }
  
  /**
   * Mock responses for development/server-side (until MCP server is fully set up)
   */
  private getMockResponse(tool: string, args: Record<string, unknown>): unknown {
    if (tool === 'get_wordpress_abilities') {
      return {
        available_blocks: [
          'acf/menu',
          'acf/top-slides',
          'acf/text-section',
          'acf/feature-section',
          'acf/image',
          'acf/links',
          'acf/content-grid',
          'acf/form',
          'acf/map',
          'acf/html-section',
          'acf/gallery',
          'acf/accordion-section',
          'acf/plans-availability',
          'acf/poi'
        ],
        theme: {
          name: 'collection',
          version: '2.1.0',
          supports: {
            custom_css: true,
            custom_fonts: true,
            block_patterns: true
          }
        },
        plugins: ['advanced-custom-fields-pro', 'yoast-seo', 'wp-rocket'],
        capabilities: {
          canCreatePages: true,
          canUploadMedia: true,
          canModifyTheme: false,
          canInstallPlugins: false,
          maxUploadSizeMb: 100
        }
      }
    }
    
    if (tool === 'get_acf_block_schemas') {
      return {
        'acf/top-slides': {
          label: 'Hero Carousel',
          fields: {
            slides: { type: 'repeater' },
            autoplay: { type: 'boolean', default: true },
            overlay_style: { 
              type: 'select', 
              choices: ['none', 'light', 'dark', 'gradient'] 
            }
          },
          variants: {
            fullwidth: {
              cssClass: 'hero-fullwidth',
              description: 'Full viewport hero',
              bestFor: ['luxury', 'impact', 'resort']
            },
            split: {
              cssClass: 'hero-split',
              description: 'Two-column layout',
              bestFor: ['lifestyle', 'family']
            }
          }
        },
        'acf/content-grid': {
          label: 'Content Grid',
          fields: {
            columns: { type: 'select', choices: ['2', '3', '4'], default: '3' },
            items: { type: 'repeater' }
          },
          variants: {
            'elevated-cards': {
              cssClass: 'grid-elevated',
              bestFor: ['luxury', 'modern']
            }
          }
        },
        'acf/text-section': {
          label: 'Text Section',
          fields: {
            heading: { type: 'text' },
            subheading: { type: 'text' },
            content: { type: 'wysiwyg' },
            alignment: { type: 'select', choices: ['left', 'center', 'right'] }
          }
        },
        'acf/feature-section': {
          label: 'Feature Section',
          fields: {
            title: { type: 'text' },
            features: { type: 'repeater' },
            layout: { type: 'select', choices: ['grid', 'list', 'cards'] }
          }
        },
        'acf/form': {
          label: 'Contact Form',
          fields: {
            form_type: { type: 'select', choices: ['contact', 'tour', 'interest'] },
            style: { type: 'select', choices: ['inline', 'modal', 'sidebar'] }
          }
        },
        'acf/gallery': {
          label: 'Photo Gallery',
          fields: {
            images: { type: 'gallery' },
            layout: { type: 'select', choices: ['grid', 'masonry', 'carousel'] }
          }
        }
      }
    }
    
    if (tool === 'get_theme_design_tokens') {
      return {
        colors: {
          primary: '#4F46E5',
          secondary: '#10B981',
          availableVariants: ['primary', 'secondary', 'accent', 'neutral']
        },
        typography: {
          availableFonts: ['Inter', 'Playfair Display', 'Montserrat', 'Open Sans'],
          headingScales: ['compact', 'balanced', 'luxury']
        },
        spacing: {
          availableScales: ['tight', 'balanced', 'luxury'],
          presets: {
            tight: { section: '4rem', container: '1200px' },
            balanced: { section: '6rem', container: '1400px' },
            luxury: { section: '8rem', container: '1600px' }
          }
        }
      }
    }
    
    if (tool === 'analyze_existing_site') {
      return {
        url: args.url,
        detectedTheme: 'collection',
        designAnalysis: {
          heroStyle: { style: 'fullwidth', hasOverlay: true },
          colorPalette: { primary: '#2B5C7F', secondary: '#8B6F47' },
          typography: { fonts: ['Playfair Display', 'Open Sans'], headingScale: 'luxury' }
        },
        insightsForAgents: {
          architectureAgent: 'Use fullwidth hero, prominent interest form',
          designAgent: 'Luxury spacing, serif headings, warm colors',
          photoAgent: '60% lifestyle ratio, warm lighting'
        }
      }
    }
    
    return {}
  }
  
  /**
   * Cache management (localStorage in browser, Redis in production)
   */
  private getFromCache(instanceId: string): WordPressCapabilities | null {
    if (typeof window === 'undefined') return null
    
    const key = `${this.cacheKey}-${instanceId}`
    const cached = localStorage.getItem(key)
    
    if (!cached) return null
    
    try {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp > this.cacheDuration) {
        localStorage.removeItem(key)
        return null
      }
      return data
    } catch {
      return null
    }
  }
  
  private saveToCache(instanceId: string, data: WordPressCapabilities): void {
    if (typeof window === 'undefined') return
    
    const key = `${this.cacheKey}-${instanceId}`
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  }
}

// Type exports
export interface SiteAnalysis {
  url: string
  detectedTheme: string
  blocksUsed: Array<{ block: string; variant?: string; order: number }>
  designAnalysis: {
    colorPalette: Record<string, string>
    typography: Record<string, string>
    spacing: Record<string, string>
    photoStrategy: Record<string, unknown>
  }
  architecturalPatterns: Record<string, unknown>
  insightsForAgents: Record<string, string>
}

export interface DeploymentResult {
  success: boolean
  instanceId: string
  url: string
  adminUrl: string
  pagesCreated: number
}

export interface WordPressInstance {
  instanceId: string
  url: string
  adminUrl: string
  credentials: {
    username: string
    password: string
  }
}




