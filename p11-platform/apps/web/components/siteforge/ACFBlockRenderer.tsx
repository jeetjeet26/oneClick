'use client'

// SiteForge: ACF Block Visual Renderer
// Renders ACF block content as styled HTML preview
// Created: December 11, 2025

import React from 'react'

interface BlockRendererProps {
  blockType: string
  content: any
  className?: string
}

/**
 * Main renderer that delegates to specific block renderers
 */
export function ACFBlockRenderer({ blockType, content, className = '' }: BlockRendererProps) {
  if (!content || Object.keys(content).length === 0) {
    return (
      <div className={`p-4 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 text-sm ${className}`}>
        No content generated for this block
      </div>
    )
  }

  const renderers: Record<string, React.FC<{ content: any }>> = {
    'acf/top-slides': HeroSlides,
    'acf/text-section': TextSection,
    'acf/content-grid': ContentGrid,
    'acf/feature-section': FeatureSection,
    'acf/gallery': Gallery,
    'acf/form': FormSection,
    'acf/map': MapSection,
    'acf/links': LinksSection,
    'acf/accordion-section': AccordionSection,
    'acf/image': ImageSection,
    'acf/html-section': HtmlSection,
    'acf/menu': MenuSection,
    'acf/plans-availability': PlansAvailability,
    'acf/poi': PointsOfInterest
  }

  const Renderer = renderers[blockType]
  
  if (!Renderer) {
    return (
      <div className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 ${className}`}>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">Unknown block type: {blockType}</p>
        <pre className="text-xs mt-2 text-gray-600">{JSON.stringify(content, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div className={className}>
      <Renderer content={content} />
    </div>
  )
}

/**
 * Hero Slides - Top carousel with CTAs
 */
function HeroSlides({ content }: { content: any }) {
  const slides = content.slides || []
  
  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden">
      {slides.map((slide: any, idx: number) => (
        <div key={idx} className="p-8 md:p-12 text-white">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              {slide.headline}
            </h2>
            <p className="text-lg text-gray-300 mb-6">
              {slide.subheadline}
            </p>
            <a 
              href={slide.cta_link} 
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              {slide.cta_text}
            </a>
          </div>
          {slide.image_index !== null && (
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              📷 Image #{slide.image_index}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Text Section - Headline + content block
 */
function TextSection({ content }: { content: any }) {
  const bgClasses: Record<string, string> = {
    white: 'bg-white dark:bg-gray-900',
    light: 'bg-gray-50 dark:bg-gray-800',
    dark: 'bg-gray-900 dark:bg-black text-white'
  }
  const bgClass = bgClasses[String(content.background)] || 'bg-white dark:bg-gray-900'
  
  const alignClasses: Record<string, string> = {
    center: 'text-center mx-auto',
    left: 'text-left',
    right: 'text-right ml-auto'
  }
  const alignClass = alignClasses[String(content.layout)] || 'text-center mx-auto'

  return (
    <div className={`p-6 md:p-8 rounded-lg ${bgClass}`}>
      <div className={`max-w-3xl ${alignClass}`}>
        <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {content.headline}
        </h3>
        <div 
          className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
      </div>
    </div>
  )
}

/**
 * Content Grid - Grid of items with icons
 */
function ContentGrid({ content }: { content: any }) {
  const items = content.items || []
  const cols = content.columns || 3
  
  const colsClasses: Record<string, string> = {
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-3',
    '4': 'md:grid-cols-4'
  }
  const colsClass = colsClasses[String(cols)] || 'md:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 ${colsClass} gap-6 p-4`}>
      {items.map((item: any, idx: number) => (
        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          {item.icon && (
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
              <span className="text-indigo-600 dark:text-indigo-400 text-xl">
                {getIconEmoji(item.icon)}
              </span>
            </div>
          )}
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {item.headline}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  )
}

/**
 * Feature Section - Image + text side by side
 */
function FeatureSection({ content }: { content: any }) {
  const isImageLeft = content.layout === 'image-left'
  
  return (
    <div className={`flex flex-col ${isImageLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 p-4 items-center`}>
      <div className="w-full md:w-1/2">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-video flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400">
            📷 Image #{content.image_index ?? 0}
          </span>
        </div>
      </div>
      <div className="w-full md:w-1/2">
        <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {content.headline}
        </h3>
        <div 
          className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 mb-6"
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
        {content.cta_text && (
          <a 
            href={content.cta_link} 
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-lg transition"
          >
            {content.cta_text}
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Gallery - Image grid
 */
function Gallery({ content }: { content: any }) {
  const indices = content.image_indices || []
  const layout = content.layout || 'grid'
  
  return (
    <div className="p-4">
      <div className={`grid ${layout === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'} gap-4`}>
        {indices.map((idx: number) => (
          <div key={idx} className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-square flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400">📷 #{idx}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Form Section - Contact/inquiry form
 */
function FormSection({ content }: { content: any }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 max-w-xl mx-auto">
      <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white text-center">
        {content.heading}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
        {content.subheading}
      </p>
      <div className="space-y-4">
        <input 
          type="text" 
          placeholder="Your Name" 
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          disabled
        />
        <input 
          type="email" 
          placeholder="Email Address" 
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          disabled
        />
        <input 
          type="tel" 
          placeholder="Phone Number" 
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          disabled
        />
        <textarea 
          placeholder="Message" 
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          disabled
        />
        <button className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg">
          Submit
        </button>
      </div>
    </div>
  )
}

/**
 * Map Section - Google Maps placeholder
 */
function MapSection({ content }: { content: any }) {
  return (
    <div className="p-4">
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-video flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl mb-2 block">🗺️</span>
          <span className="text-gray-500 dark:text-gray-400">
            Google Maps (Zoom: {content.zoom_level || 15})
          </span>
          {content.show_directions && (
            <p className="text-sm text-gray-400 mt-1">With directions enabled</p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Links Section - CTA buttons
 */
function LinksSection({ content }: { content: any }) {
  const links = content.links || []
  
  return (
    <div className="flex flex-wrap gap-4 justify-center p-4">
      {links.map((link: any, idx: number) => (
        <a
          key={idx}
          href={link.url}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            link.style === 'primary'
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
          }`}
        >
          {link.text}
        </a>
      ))}
    </div>
  )
}

/**
 * Accordion Section - FAQ style
 */
function AccordionSection({ content }: { content: any }) {
  const items = content.items || []
  
  return (
    <div className="space-y-3 p-4">
      {items.map((item: any, idx: number) => (
        <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 font-medium text-gray-900 dark:text-white flex justify-between items-center">
            {item.title}
            <span className="text-gray-400">▼</span>
          </div>
          <div 
            className="px-4 py-3 text-gray-600 dark:text-gray-300 prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Image Section - Single image
 */
function ImageSection({ content }: { content: any }) {
  const sizeClasses: Record<string, string> = {
    full: 'w-full',
    large: 'max-w-4xl mx-auto',
    medium: 'max-w-2xl mx-auto'
  }
  const sizeClass = sizeClasses[String(content.size)] || 'max-w-4xl mx-auto'

  return (
    <div className={`p-4 ${sizeClass}`}>
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-video flex items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400">📷 Image #{content.image_index ?? 0}</span>
      </div>
      {content.caption && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
          {content.caption}
        </p>
      )}
    </div>
  )
}

/**
 * HTML Section - Custom HTML
 */
function HtmlSection({ content }: { content: any }) {
  return (
    <div 
      className="p-4"
      dangerouslySetInnerHTML={{ __html: content.html_content }}
    />
  )
}

/**
 * Menu Section - Navigation links
 */
function MenuSection({ content }: { content: any }) {
  const items = content.menu_items || []
  
  return (
    <div className="flex flex-wrap gap-2 justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {items.map((item: string, idx: number) => (
        <span 
          key={idx}
          className="px-4 py-2 bg-white dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

/**
 * Plans Availability - Interactive floor plans placeholder
 */
function PlansAvailability({ content }: { content: any }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-8 text-center">
      <span className="text-4xl mb-4 block">🏠</span>
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Interactive Floor Plans
      </h4>
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        Data source: {content.data_source || 'yardi'}
      </p>
      <p className="text-xs text-gray-400 mt-2">
        (Connects to property management system)
      </p>
    </div>
  )
}

/**
 * Points of Interest - Neighborhood map
 */
function PointsOfInterest({ content }: { content: any }) {
  const categories = content.categories || []
  
  return (
    <div className="p-4">
      <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {content.intro_text}
      </p>
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-video flex items-center justify-center mb-4">
        <div className="text-center">
          <span className="text-4xl mb-2 block">📍</span>
          <span className="text-gray-500 dark:text-gray-400">
            Points of Interest Map ({content.radius_miles || 2} mile radius)
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((cat: string, idx: number) => (
          <span 
            key={idx}
            className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm capitalize"
          >
            {cat}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Helper: Convert Font Awesome class to emoji
 */
function getIconEmoji(iconClass: string): string {
  const iconMap: Record<string, string> = {
    'fa-swimming-pool': '🏊',
    'fa-bell': '🔔',
    'fa-wifi': '📶',
    'fa-sun': '☀️',
    'fa-dumbbell': '💪',
    'fa-glass-cheers': '🥂',
    'fa-dog': '🐕',
    'fa-laptop': '💻',
    'fa-car': '🚗',
    'fa-home': '🏠',
    'fa-building': '🏢',
    'fa-tree': '🌳',
    'fa-coffee': '☕',
    'fa-utensils': '🍽️',
    'fa-shopping-bag': '🛍️',
    'fa-bus': '🚌',
    'fa-train': '🚆'
  }
  
  return iconMap[iconClass] || '✨'
}







