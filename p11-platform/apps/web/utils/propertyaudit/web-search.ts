/**
 * Web Search Utility for GEO Audits
 * Integrates with SerpAPI for real-time web search
 */

export interface SearchResult {
  title: string
  link: string
  snippet: string
  domain: string
}

export interface SearchResponse {
  results: SearchResult[]
  searchQuery: string
}

/**
 * Perform web search using SerpAPI
 */
export async function performWebSearch(query: string): Promise<SearchResponse> {
  const serpApiKey = process.env.SERPAPI_API_KEY

  if (!serpApiKey) {
    console.warn('[web-search] SERPAPI_API_KEY not configured, skipping search')
    return { results: [], searchQuery: query }
  }

  try {
    const url = `https://serpapi.com/search.json?` + new URLSearchParams({
      q: query,
      api_key: serpApiKey,
      num: '10',
      engine: 'google'
    }).toString()

    console.log(`[web-search] Searching: "${query}"`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.statusText}`)
    }

    const data = await response.json()

    // Extract organic results
    const results: SearchResult[] = (data.organic_results || [])
      .slice(0, 10)
      .map((r: any) => ({
        title: r.title || '',
        link: r.link || '',
        snippet: r.snippet || '',
        domain: extractDomain(r.link || '')
      }))
      .filter((r: SearchResult) => r.link && r.title)

    console.log(`[web-search] Found ${results.length} results`)

    return {
      results,
      searchQuery: query
    }
  } catch (error) {
    console.error('[web-search] Search failed:', error)
    return { results: [], searchQuery: query }
  }
}

/**
 * Format search results for LLM consumption
 */
export function formatSearchResultsForLLM(searchResponse: SearchResponse): string {
  if (searchResponse.results.length === 0) {
    return 'No search results found.'
  }

  const formatted = searchResponse.results.map((result, idx) => {
    return [
      `Result ${idx + 1}:`,
      `Title: ${result.title}`,
      `URL: ${result.link}`,
      `Snippet: ${result.snippet}`,
      ``
    ].join('\n')
  }).join('\n')

  return `Web search results for "${searchResponse.searchQuery}":\n\n${formatted}`
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
