"""
Community Website Intelligence Scraper
Crawls community websites and extracts structured knowledge for AI training
"""

import re
import json
import logging
import asyncio
from typing import List, Optional, Dict, Any, Set
from urllib.parse import urljoin, urlparse
from dataclasses import dataclass, field
from datetime import datetime

import httpx
from bs4 import BeautifulSoup
from fake_useragent import UserAgent

# Playwright for fallback on bot-protected sites
try:
    from playwright.async_api import async_playwright, Browser, Page
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.warning("Playwright not available - some websites may be inaccessible")

logger = logging.getLogger(__name__)


@dataclass
class ExtractedContent:
    """Content extracted from a single page"""
    url: str
    title: str
    content: str
    page_type: str  # 'home', 'amenities', 'floor_plans', 'contact', 'pet_policy', etc.
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CommunityKnowledge:
    """Structured knowledge extracted from a community website"""
    website_url: str
    property_name: Optional[str] = None
    amenities: List[str] = field(default_factory=list)
    pet_policy: Optional[Dict[str, Any]] = None
    parking_info: Optional[Dict[str, Any]] = None
    unit_types: List[str] = field(default_factory=list)
    specials: List[str] = field(default_factory=list)
    contact_info: Optional[Dict[str, Any]] = None
    office_hours: Optional[str] = None
    neighborhood_info: Optional[str] = None
    brand_voice: Optional[str] = None
    target_audience: Optional[str] = None
    raw_chunks: List[str] = field(default_factory=list)
    pages_scraped: int = 0
    scraped_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "website_url": self.website_url,
            "property_name": self.property_name,
            "amenities": self.amenities,
            "pet_policy": self.pet_policy,
            "parking_info": self.parking_info,
            "unit_types": self.unit_types,
            "specials": self.specials,
            "contact_info": self.contact_info,
            "office_hours": self.office_hours,
            "neighborhood_info": self.neighborhood_info,
            "brand_voice": self.brand_voice,
            "target_audience": self.target_audience,
            "raw_chunks": self.raw_chunks,
            "pages_scraped": self.pages_scraped,
            "scraped_at": self.scraped_at,
        }


class CommunityWebsiteScraper:
    """
    Crawls community websites and extracts structured knowledge
    for use in AI training and RAG systems.
    """
    
    # Common paths to check on apartment websites
    PAGES_TO_SCRAPE = [
        '/',
        '/amenities',
        '/amenities/',
        '/floor-plans',
        '/floor-plans/',
        '/floorplans',
        '/floorplans/',
        '/gallery',
        '/gallery/',
        '/photos',
        '/photos/',
        '/contact',
        '/contact/',
        '/contact-us',
        '/contact-us/',
        '/pet-policy',
        '/pet-policy/',
        '/pets',
        '/pets/',
        '/neighborhood',
        '/neighborhood/',
        '/location',
        '/location/',
        '/about',
        '/about/',
        '/about-us',
        '/about-us/',
        '/specials',
        '/specials/',
        '/deals',
        '/deals/',
        '/virtual-tour',
        '/virtual-tour/',
        '/faqs',
        '/faqs/',
        '/faq',
        '/faq/',
        '/residents',
        '/residents/',
        '/resident-resources',
        '/resident-resources/',
    ]
    
    # Keywords to identify page types
    PAGE_TYPE_KEYWORDS = {
        'amenities': ['amenity', 'amenities', 'feature', 'community features'],
        'floor_plans': ['floor plan', 'floorplan', 'apartment', 'unit', 'bedroom', 'studio'],
        'contact': ['contact', 'get in touch', 'reach us', 'office hours'],
        'pet_policy': ['pet', 'dog', 'cat', 'animal'],
        'specials': ['special', 'deal', 'promotion', 'offer', 'discount', 'move-in'],
        'neighborhood': ['neighborhood', 'location', 'nearby', 'area', 'community'],
        'about': ['about', 'our story', 'history', 'welcome'],
        'gallery': ['gallery', 'photo', 'image', 'tour', 'view'],
        'faq': ['faq', 'frequently asked', 'question'],
    }
    
    # Rate limiting
    MIN_DELAY = 1.0
    MAX_DELAY = 2.0
    TIMEOUT = 20.0
    MAX_PAGES = 15  # Maximum pages to scrape per site
    
    # Track failed domains for playwright fallback
    _blocked_domains: Set[str] = set()
    
    def __init__(self, openai_api_key: Optional[str] = None, use_playwright_fallback: bool = True):
        """
        Initialize scraper with optional OpenAI key for AI-powered extraction.
        
        Args:
            openai_api_key: Optional OpenAI API key for structured extraction
            use_playwright_fallback: Use Playwright browser for bot-protected sites
        """
        self.openai_api_key = openai_api_key
        self.use_playwright_fallback = use_playwright_fallback and PLAYWRIGHT_AVAILABLE
        self.ua = UserAgent()
        self._scraped_urls: Set[str] = set()
        self._failed_httpx_count: int = 0
    
    def _get_headers(self, referer: Optional[str] = None) -> Dict[str, str]:
        """Generate realistic browser headers that bypass bot detection"""
        # Use a consistent Chrome user agent for the session
        chrome_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        
        headers = {
            "User-Agent": chrome_ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "max-age=0",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            # Modern Chrome security headers
            "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none" if not referer else "same-origin",
            "Sec-Fetch-User": "?1",
        }
        
        if referer:
            headers["Referer"] = referer
            headers["Sec-Fetch-Site"] = "same-origin"
        
        return headers
    
    def _normalize_url(self, base_url: str, path: str) -> str:
        """Normalize and join URL components"""
        if path.startswith('http'):
            return path
        return urljoin(base_url, path)
    
    def _clean_text(self, text: Optional[str]) -> str:
        """Clean and normalize extracted text"""
        if not text:
            return ""
        # Remove extra whitespace
        text = ' '.join(text.split())
        # Remove common junk
        text = re.sub(r'\s*\|\s*', ' ', text)
        return text.strip()
    
    def _extract_text_from_html(self, soup: BeautifulSoup) -> str:
        """Extract readable text from HTML, excluding scripts and styles"""
        # Remove script and style elements
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 'noscript']):
            element.decompose()
        
        # Get text
        text = soup.get_text(separator='\n')
        
        # Clean up
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk and len(chunk) > 3)
        
        return text
    
    def _identify_page_type(self, url: str, title: str, content: str) -> str:
        """Identify the type of page based on URL and content"""
        url_lower = url.lower()
        title_lower = title.lower()
        content_lower = content[:2000].lower()  # Check first 2000 chars
        
        for page_type, keywords in self.PAGE_TYPE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in url_lower or keyword in title_lower:
                    return page_type
                if keyword in content_lower:
                    return page_type
        
        return 'general'
    
    def _extract_amenities(self, soup: BeautifulSoup, content: str) -> List[str]:
        """Extract amenities list from page content"""
        amenities = set()
        
        # Common amenity keywords
        amenity_keywords = [
            'pool', 'fitness', 'gym', 'dog park', 'pet park', 'clubhouse', 
            'business center', 'playground', 'tennis', 'basketball', 'volleyball',
            'bbq', 'grill', 'fire pit', 'rooftop', 'parking garage', 'ev charging',
            'package locker', 'concierge', 'theater', 'movie', 'game room',
            'spa', 'sauna', 'yoga', 'co-working', 'coworking', 'pet spa',
            'bike storage', 'storage unit', 'maintenance', 'gated', 'security',
            'laundry', 'washer', 'dryer', 'dishwasher', 'granite', 'stainless',
            'balcony', 'patio', 'view', 'fireplace', 'hardwood', 'carpet',
            'walk-in closet', 'ceiling fan', 'air conditioning', 'central heat'
        ]
        
        content_lower = content.lower()
        
        for keyword in amenity_keywords:
            if keyword in content_lower:
                # Capitalize nicely
                amenity = keyword.replace('-', ' ').title()
                amenities.add(amenity)
        
        # Also look for list items in amenity sections
        for section in soup.find_all(['ul', 'div'], class_=re.compile(r'amenity|feature', re.I)):
            for item in section.find_all(['li', 'span', 'p']):
                text = self._clean_text(item.get_text())
                if text and 3 < len(text) < 50:
                    amenities.add(text)
        
        return list(amenities)[:30]  # Limit to 30 amenities
    
    def _extract_pet_policy(self, content: str) -> Optional[Dict[str, Any]]:
        """Extract pet policy information from content"""
        content_lower = content.lower()
        
        if 'pet' not in content_lower and 'dog' not in content_lower:
            return None
        
        policy = {
            "pets_allowed": True,
            "details": []
        }
        
        # Check if pets are not allowed
        no_pet_phrases = ['no pets', 'pets not allowed', 'pet-free', 'no animals']
        for phrase in no_pet_phrases:
            if phrase in content_lower:
                policy["pets_allowed"] = False
                return policy
        
        # Extract deposit amounts
        deposit_match = re.search(r'\$(\d+)\s*(?:pet\s*)?deposit', content_lower)
        if deposit_match:
            policy["deposit"] = int(deposit_match.group(1))
        
        # Extract monthly pet rent
        rent_match = re.search(r'\$(\d+)\s*(?:monthly|month|/mo)?\s*pet\s*rent', content_lower)
        if rent_match:
            policy["monthly_rent"] = int(rent_match.group(1))
        
        # Extract weight limits
        weight_match = re.search(r'(\d+)\s*(?:lb|pound)s?\s*(?:limit|max|weight)', content_lower)
        if weight_match:
            policy["weight_limit_lbs"] = int(weight_match.group(1))
        
        # Extract pet limit
        limit_match = re.search(r'(\d+)\s*pet(?:s)?\s*(?:max|maximum|limit|allowed)', content_lower)
        if limit_match:
            policy["max_pets"] = int(limit_match.group(1))
        
        # Check for breed restrictions
        if 'breed restriction' in content_lower or 'restricted breed' in content_lower:
            policy["breed_restrictions"] = True
        
        return policy
    
    def _extract_contact_info(self, soup: BeautifulSoup, content: str) -> Optional[Dict[str, Any]]:
        """Extract contact information from page"""
        contact = {}
        
        # Phone numbers
        phone_match = re.search(r'(?:phone|tel|call)[:\s]*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})', content, re.I)
        if phone_match:
            contact["phone"] = phone_match.group(1)
        else:
            # Try to find any phone number
            phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', content)
            if phone_match:
                contact["phone"] = phone_match.group(0)
        
        # Email
        email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', content)
        if email_match:
            email = email_match.group(0)
            if not any(x in email.lower() for x in ['example', 'test', 'sample']):
                contact["email"] = email
        
        # Address
        address_match = re.search(
            r'(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Court|Ct|Circle|Cir)[,.\s]+[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5})',
            content
        )
        if address_match:
            contact["address"] = self._clean_text(address_match.group(1))
        
        # Office hours
        hours_match = re.search(
            r'(?:office\s*hours|hours)[:\s]*([^\n]{10,100})',
            content,
            re.I
        )
        if hours_match:
            contact["office_hours"] = self._clean_text(hours_match.group(1))
        
        return contact if contact else None
    
    def _extract_specials(self, content: str) -> List[str]:
        """Extract move-in specials and promotions"""
        specials = []
        
        # Common special patterns
        patterns = [
            r'(\$\d+\s*off[^.!]*[.!])',
            r'(\d+\s*(?:month|week)s?\s*free[^.!]*[.!])',
            r'(free\s*(?:month|rent|application)[^.!]*[.!])',
            r'(waived?\s*(?:fee|deposit|application)[^.!]*[.!])',
            r'(move.?in\s*special[^.!]*[.!])',
            r'(limited\s*time\s*offer[^.!]*[.!])',
        ]
        
        content_lower = content.lower()
        
        for pattern in patterns:
            matches = re.findall(pattern, content_lower, re.I)
            for match in matches:
                cleaned = self._clean_text(match)
                if cleaned and len(cleaned) > 10:
                    specials.append(cleaned.capitalize())
        
        return list(set(specials))[:5]  # Limit to 5 specials
    
    def _extract_unit_types(self, content: str) -> List[str]:
        """Extract available unit types"""
        unit_types = set()
        
        # Common unit type patterns
        patterns = [
            r'(studio)',
            r'(\d+)\s*(?:bed|br|bedroom)',
            r'(one|two|three|four)\s*bedroom',
        ]
        
        content_lower = content.lower()
        
        for pattern in patterns:
            matches = re.findall(pattern, content_lower, re.I)
            for match in matches:
                if match.lower() == 'studio':
                    unit_types.add('Studio')
                elif match.isdigit():
                    unit_types.add(f'{match} Bedroom')
                elif match.lower() in ['one', 'two', 'three', 'four']:
                    nums = {'one': '1', 'two': '2', 'three': '3', 'four': '4'}
                    unit_types.add(f'{nums[match.lower()]} Bedroom')
        
        return sorted(list(unit_types))
    
    def _chunk_content(self, content: str, max_size: int = 800, overlap: int = 100) -> List[str]:
        """Split content into chunks for RAG embedding"""
        chunks = []
        sentences = re.split(r'(?<=[.!?])\s+', content)
        
        current_chunk = ''
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) > max_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Keep overlap
                words = current_chunk.split()
                overlap_words = words[-overlap // 5:] if len(words) > overlap // 5 else []
                current_chunk = ' '.join(overlap_words) + ' ' + sentence
            else:
                current_chunk += (' ' if current_chunk else '') + sentence
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return [chunk for chunk in chunks if len(chunk) > 50]
    
    async def _fetch_page(self, client: httpx.AsyncClient, url: str, referer: Optional[str] = None, retry_count: int = 0) -> Optional[str]:
        """Fetch a single page with error handling and retry logic"""
        max_retries = 2
        
        try:
            headers = self._get_headers(referer=referer)
            response = await client.get(url, headers=headers, follow_redirects=True)
            
            if response.status_code == 200:
                return response.text
            elif response.status_code in [403, 521, 522, 523, 524]:
                # Bot detection or Cloudflare - try alternative approach
                if retry_count < max_retries:
                    # Wait longer and retry with different headers
                    await asyncio.sleep(2 + retry_count * 2)
                    
                    # Try with a simpler, mobile user agent
                    mobile_headers = {
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Accept-Encoding": "gzip, deflate, br",
                    }
                    
                    response = await client.get(url, headers=mobile_headers, follow_redirects=True)
                    if response.status_code == 200:
                        return response.text
                
                logger.warning(f"Got status {response.status_code} for {url} (bot protection likely)")
                return None
            else:
                logger.warning(f"Got status {response.status_code} for {url}")
                return None
        except Exception as e:
            logger.warning(f"Error fetching {url}: {e}")
            return None

    async def _scrape_with_playwright(self, base_url: str) -> List[ExtractedContent]:
        """
        Fallback scraper using Playwright for bot-protected websites.
        Uses a real browser to bypass Cloudflare and other protections.
        """
        if not PLAYWRIGHT_AVAILABLE:
            logger.warning("Playwright not available for fallback scraping")
            return []
        
        logger.info(f"Using Playwright browser for: {base_url}")
        all_content: List[ExtractedContent] = []
        
        try:
            async with async_playwright() as p:
                # Launch headless browser with stealth settings
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                    ]
                )
                
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    locale='en-US',
                )
                
                # Remove webdriver property to avoid detection
                await context.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                """)
                
                page = await context.new_page()
                
                # Pages to scrape
                paths_to_try = [''] + [p.strip('/') for p in self.PAGES_TO_SCRAPE[:8]]
                scraped_paths: Set[str] = set()
                
                for path in paths_to_try:
                    if path in scraped_paths:
                        continue
                    
                    url = f"{base_url.rstrip('/')}/{path}" if path else base_url
                    
                    try:
                        # Navigate with wait for network idle
                        await page.goto(url, wait_until='networkidle', timeout=15000)
                        await asyncio.sleep(1)  # Extra wait for JS rendering
                        
                        # Get page content
                        html = await page.content()
                        
                        if html and len(html) > 1000:
                            soup = BeautifulSoup(html, 'lxml')
                            
                            # Get title
                            title = ''
                            title_tag = soup.find('title')
                            if title_tag:
                                title = self._clean_text(title_tag.get_text())
                            
                            # Extract content
                            content = self._extract_text_from_html(soup)
                            
                            if len(content) > 100:
                                page_type = self._identify_page_type(url, title, content)
                                
                                extracted = ExtractedContent(
                                    url=url,
                                    title=title,
                                    content=content,
                                    page_type=page_type,
                                    metadata={
                                        'amenities': self._extract_amenities(soup, content),
                                        'pet_policy': self._extract_pet_policy(content),
                                        'contact': self._extract_contact_info(soup, content),
                                        'specials': self._extract_specials(content),
                                        'unit_types': self._extract_unit_types(content),
                                    }
                                )
                                all_content.append(extracted)
                                logger.info(f"Playwright scraped: {url} ({page_type})")
                        
                        scraped_paths.add(path)
                        await asyncio.sleep(self.MIN_DELAY)
                        
                    except Exception as e:
                        logger.warning(f"Playwright error for {url}: {e}")
                        continue
                
                await browser.close()
                
        except Exception as e:
            logger.error(f"Playwright fallback failed: {e}")
        
        return all_content

    async def _discover_pages(self, client: httpx.AsyncClient, base_url: str) -> List[str]:
        """Discover pages to scrape from the website"""
        discovered = [base_url]
        
        # Try common paths
        for path in self.PAGES_TO_SCRAPE:
            full_url = self._normalize_url(base_url, path)
            if full_url not in discovered:
                discovered.append(full_url)
        
        # Also extract links from home page
        html = await self._fetch_page(client, base_url)
        if html:
            soup = BeautifulSoup(html, 'lxml')
            for link in soup.find_all('a', href=True):
                href = link['href']
                full_url = self._normalize_url(base_url, href)
                
                # Only include links from same domain
                if urlparse(full_url).netloc == urlparse(base_url).netloc:
                    if full_url not in discovered:
                        discovered.append(full_url)
        
        return discovered[:self.MAX_PAGES]
    
    async def _scrape_page(self, client: httpx.AsyncClient, url: str, referer: Optional[str] = None) -> Optional[ExtractedContent]:
        """Scrape content from a single page"""
        if url in self._scraped_urls:
            return None
        
        self._scraped_urls.add(url)
        
        html = await self._fetch_page(client, url, referer=referer)
        if not html:
            return None
        
        soup = BeautifulSoup(html, 'lxml')
        
        # Get title
        title = ''
        title_tag = soup.find('title')
        if title_tag:
            title = self._clean_text(title_tag.get_text())
        
        # Extract main content
        content = self._extract_text_from_html(soup)
        
        if len(content) < 100:
            return None
        
        # Identify page type
        page_type = self._identify_page_type(url, title, content)
        
        return ExtractedContent(
            url=url,
            title=title,
            content=content,
            page_type=page_type,
            metadata={
                'amenities': self._extract_amenities(soup, content),
                'pet_policy': self._extract_pet_policy(content),
                'contact': self._extract_contact_info(soup, content),
                'specials': self._extract_specials(content),
                'unit_types': self._extract_unit_types(content),
            }
        )
    
    async def extract_community_knowledge(self, website_url: str) -> CommunityKnowledge:
        """
        Main entry point: scrapes website and returns structured knowledge
        
        Args:
            website_url: The community website URL to scrape
            
        Returns:
            CommunityKnowledge object with extracted data
        """
        # Normalize URL
        if not website_url.startswith('http'):
            website_url = 'https://' + website_url
        
        parsed = urlparse(website_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        
        logger.info(f"Starting website intelligence extraction for: {base_url}")
        
        self._scraped_urls = set()  # Reset for new scrape
        
        knowledge = CommunityKnowledge(website_url=base_url)
        all_content: List[ExtractedContent] = []
        
        # Use cookies and HTTP/2 for better compatibility
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(self.TIMEOUT, connect=10.0),
            http2=True,
            cookies=httpx.Cookies(),
            follow_redirects=True,
        ) as client:
            # Discover pages
            pages = await self._discover_pages(client, base_url)
            logger.info(f"Discovered {len(pages)} pages to scrape")
            
            # Scrape pages with delay and referer chain
            last_url = None
            for url in pages:
                # Random delay between requests to appear more human-like
                delay = self.MIN_DELAY + (hash(url) % 100) / 100 * (self.MAX_DELAY - self.MIN_DELAY)
                await asyncio.sleep(delay)
                
                content = await self._scrape_page(client, url, referer=last_url)
                if content:
                    all_content.append(content)
                    last_url = url
                    logger.info(f"Scraped: {url} ({content.page_type})")
        
        knowledge.pages_scraped = len(all_content)
        
        # If httpx failed (likely bot protection), try Playwright fallback
        if not all_content and self.use_playwright_fallback:
            logger.info(f"httpx failed for {base_url}, trying Playwright fallback...")
            all_content = await self._scrape_with_playwright(base_url)
            knowledge.pages_scraped = len(all_content)
        
        if not all_content:
            logger.warning(f"No content extracted from {base_url}")
            return knowledge
        
        # Aggregate extracted data
        all_amenities: Set[str] = set()
        all_specials: List[str] = []
        all_unit_types: Set[str] = set()
        
        for content in all_content:
            # Extract property name from home page title
            if content.page_type == 'general' and content.url == base_url:
                # Try to extract property name from title
                title = content.title
                # Remove common suffixes
                for suffix in ['| Apartments', '- Apartments', 'Apartments', '| Home', '- Home']:
                    title = title.replace(suffix, '')
                knowledge.property_name = self._clean_text(title)
            
            # Aggregate amenities
            if content.metadata.get('amenities'):
                all_amenities.update(content.metadata['amenities'])
            
            # Get pet policy (prefer dedicated pet page)
            if content.page_type == 'pet_policy' and content.metadata.get('pet_policy'):
                knowledge.pet_policy = content.metadata['pet_policy']
            elif not knowledge.pet_policy and content.metadata.get('pet_policy'):
                knowledge.pet_policy = content.metadata['pet_policy']
            
            # Get contact info
            if content.metadata.get('contact'):
                if not knowledge.contact_info:
                    knowledge.contact_info = content.metadata['contact']
                else:
                    # Merge contact info
                    for key, value in content.metadata['contact'].items():
                        if value and not knowledge.contact_info.get(key):
                            knowledge.contact_info[key] = value
            
            # Aggregate specials
            if content.metadata.get('specials'):
                all_specials.extend(content.metadata['specials'])
            
            # Aggregate unit types
            if content.metadata.get('unit_types'):
                all_unit_types.update(content.metadata['unit_types'])
            
            # Create chunks for RAG
            chunks = self._chunk_content(content.content)
            for chunk in chunks:
                # Add context to chunk
                chunk_with_context = f"[Source: {content.page_type} page]\n{chunk}"
                knowledge.raw_chunks.append(chunk_with_context)
        
        knowledge.amenities = list(all_amenities)
        knowledge.specials = list(set(all_specials))
        knowledge.unit_types = sorted(list(all_unit_types))
        
        # Extract office hours from contact info if present
        if knowledge.contact_info and knowledge.contact_info.get('office_hours'):
            knowledge.office_hours = knowledge.contact_info.pop('office_hours')
        
        logger.info(f"Extraction complete: {len(knowledge.raw_chunks)} chunks, {len(knowledge.amenities)} amenities")
        
        return knowledge
    
    async def extract_with_ai(self, website_url: str) -> CommunityKnowledge:
        """
        Enhanced extraction using AI to structure and summarize content.
        Requires OpenAI API key to be set.
        
        Args:
            website_url: The community website URL
            
        Returns:
            CommunityKnowledge with AI-enhanced extraction
        """
        if not self.openai_api_key:
            logger.warning("No OpenAI API key - falling back to basic extraction")
            return await self.extract_community_knowledge(website_url)
        
        try:
            import openai
        except ImportError:
            logger.warning("OpenAI package not installed - falling back to basic extraction")
            return await self.extract_community_knowledge(website_url)
        
        # First get basic extraction
        knowledge = await self.extract_community_knowledge(website_url)
        
        if not knowledge.raw_chunks:
            return knowledge
        
        # Use AI to enhance extraction
        client = openai.OpenAI(api_key=self.openai_api_key)
        
        # Combine some content for AI analysis
        sample_content = '\n\n'.join(knowledge.raw_chunks[:10])  # First 10 chunks
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert at analyzing apartment community websites.
                        Extract structured information from the content provided.
                        Return a JSON object with these fields (use null if not found):
                        - property_name: The name of the apartment community
                        - brand_voice: A brief description of the community's tone/personality (friendly, luxury, modern, etc.)
                        - target_audience: Who the community seems to target (young professionals, families, seniors, students, etc.)
                        - neighborhood_summary: A brief summary of the neighborhood/location benefits
                        - key_selling_points: Array of 3-5 main selling points
                        """
                    },
                    {
                        "role": "user",
                        "content": f"Analyze this apartment community website content:\n\n{sample_content[:8000]}"
                    }
                ],
                response_format={"type": "json_object"},
                max_tokens=1000
            )
            
            ai_data = json.loads(response.choices[0].message.content)
            
            # Enhance knowledge with AI extraction
            if ai_data.get('property_name') and not knowledge.property_name:
                knowledge.property_name = ai_data['property_name']
            
            knowledge.brand_voice = ai_data.get('brand_voice')
            knowledge.target_audience = ai_data.get('target_audience')
            knowledge.neighborhood_info = ai_data.get('neighborhood_summary')
            
            logger.info("AI enhancement completed successfully")
            
        except Exception as e:
            logger.error(f"AI enhancement failed: {e}")
        
        return knowledge


# Synchronous wrapper for non-async contexts
def scrape_community_website(website_url: str, openai_api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Synchronous wrapper to scrape a community website.
    
    Args:
        website_url: The community website URL
        openai_api_key: Optional OpenAI API key for AI-enhanced extraction
        
    Returns:
        Dictionary with extracted community knowledge
    """
    scraper = CommunityWebsiteScraper(openai_api_key=openai_api_key)
    
    if openai_api_key:
        knowledge = asyncio.run(scraper.extract_with_ai(website_url))
    else:
        knowledge = asyncio.run(scraper.extract_community_knowledge(website_url))
    
    return knowledge.to_dict()


# CLI for testing
if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) < 2:
        print("Usage: python website_intelligence.py <website_url>")
        sys.exit(1)
    
    url = sys.argv[1]
    result = scrape_community_website(url)
    
    print(json.dumps(result, indent=2))


