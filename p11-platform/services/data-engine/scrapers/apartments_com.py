"""
Apartments.com Scraper
Scrapes apartment listings from Apartments.com
"""

import re
import json
import logging
from typing import List, Optional, Dict, Any
from urllib.parse import urlencode, quote

from .base import BaseScraper, ScrapedProperty, ScrapedUnit

logger = logging.getLogger(__name__)


class ApartmentsComScraper(BaseScraper):
    """
    Scraper for Apartments.com
    
    Note: Apartments.com uses dynamic JavaScript rendering for much of its content.
    This scraper extracts data from the initial HTML and embedded JSON-LD.
    For production use, consider using Playwright for full JavaScript rendering.
    """
    
    BASE_URL = "https://www.apartments.com"
    
    def __init__(self, proxy_url: Optional[str] = None):
        super().__init__(proxy_url)
        self.source = "apartments_com"
    
    def _build_search_url(
        self, 
        location: str, 
        page: int = 1,
        sort: str = "default"
    ) -> str:
        """Build search URL for Apartments.com"""
        # Apartments.com uses slug-based URLs
        location_slug = location.lower().replace(' ', '-').replace(',', '')
        
        url = f"{self.BASE_URL}/{location_slug}/"
        
        if page > 1:
            url += f"{page}/"
        
        return url
    
    def _extract_json_ld(self, soup) -> List[Dict[str, Any]]:
        """Extract JSON-LD structured data from page"""
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        results = []
        
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    results.extend(data)
                else:
                    results.append(data)
            except (json.JSONDecodeError, TypeError):
                continue
        
        return results
    
    def _parse_search_results(self, html: str) -> List[Dict[str, Any]]:
        """Parse search results page and extract property URLs"""
        soup = self._parse_html(html)
        results = []
        
        # Find property cards
        property_cards = soup.find_all('article', class_='placard')
        
        for card in property_cards:
            try:
                # Get listing URL
                link = card.find('a', class_='property-link')
                if not link or not link.get('href'):
                    continue
                
                url = link.get('href')
                if not url.startswith('http'):
                    url = self.BASE_URL + url
                
                # Get basic info from card
                name_elem = card.find('span', class_='js-placardTitle')
                name = self._clean_text(name_elem.text) if name_elem else None
                
                address_elem = card.find('div', class_='property-address')
                address = self._clean_text(address_elem.text) if address_elem else None
                
                # Get price range
                price_elem = card.find('p', class_='property-pricing')
                price_text = self._clean_text(price_elem.text) if price_elem else None
                
                # Get bed/bath info
                beds_elem = card.find('p', class_='property-beds')
                beds_text = self._clean_text(beds_elem.text) if beds_elem else None
                
                results.append({
                    'url': url,
                    'name': name,
                    'address': address,
                    'price_text': price_text,
                    'beds_text': beds_text
                })
                
            except Exception as e:
                logger.warning(f"Error parsing property card: {e}")
                continue
        
        return results
    
    def _parse_property_page(self, html: str, url: str) -> Optional[ScrapedProperty]:
        """Parse a single property page"""
        soup = self._parse_html(html)
        
        try:
            # Extract JSON-LD data (most reliable)
            json_ld_data = self._extract_json_ld(soup)
            apartment_data = None
            
            for item in json_ld_data:
                if item.get('@type') == 'ApartmentComplex':
                    apartment_data = item
                    break
            
            if not apartment_data:
                # Fallback to HTML parsing
                return self._parse_property_html(soup, url)
            
            # Parse from JSON-LD
            name = apartment_data.get('name', '')
            
            # Address
            address_data = apartment_data.get('address', {})
            street = address_data.get('streetAddress', '')
            city = address_data.get('addressLocality', '')
            state = address_data.get('addressRegion', '')
            zip_code = address_data.get('postalCode', '')
            
            # Coordinates
            geo = apartment_data.get('geo', {})
            lat = geo.get('latitude')
            lng = geo.get('longitude')
            
            # Contact
            phone = apartment_data.get('telephone')
            website = apartment_data.get('url')
            
            # Photos
            photos = []
            photo_data = apartment_data.get('photo', [])
            if isinstance(photo_data, list):
                for p in photo_data[:10]:
                    if isinstance(p, dict):
                        photos.append(p.get('contentUrl', ''))
                    elif isinstance(p, str):
                        photos.append(p)
            
            # Parse units from HTML (not usually in JSON-LD)
            units = self._parse_units(soup)
            
            # Parse amenities
            amenities = self._parse_amenities(soup)
            
            # Year built and unit count
            year_built = None
            units_count = None
            
            details_section = soup.find('div', class_='propertyFeatures')
            if details_section:
                year_match = re.search(r'Built in (\d{4})', details_section.text)
                if year_match:
                    year_built = int(year_match.group(1))
                
                units_match = re.search(r'(\d+)\s*(?:Units?|Apartments?)', details_section.text, re.I)
                if units_match:
                    units_count = int(units_match.group(1))
            
            return ScrapedProperty(
                name=name,
                address=street,
                city=city,
                state=state,
                zip_code=zip_code,
                latitude=lat,
                longitude=lng,
                website_url=website,
                phone=phone,
                units_count=units_count,
                year_built=year_built,
                amenities=amenities,
                photos=photos,
                units=units,
                source=self.source,
                source_url=url
            )
            
        except Exception as e:
            logger.error(f"Error parsing property page {url}: {e}")
            return None
    
    def _parse_property_html(self, soup, url: str) -> Optional[ScrapedProperty]:
        """Fallback HTML parsing when JSON-LD is not available"""
        try:
            # Property name
            name_elem = soup.find('h1', class_='propertyName')
            name = self._clean_text(name_elem.text) if name_elem else "Unknown Property"
            
            # Address
            address_elem = soup.find('div', class_='propertyAddressContainer')
            full_address = self._clean_text(address_elem.text) if address_elem else ""
            
            # Parse address components
            address_parts = full_address.split(',')
            street = address_parts[0].strip() if len(address_parts) > 0 else ""
            city = address_parts[1].strip() if len(address_parts) > 1 else ""
            state_zip = address_parts[2].strip() if len(address_parts) > 2 else ""
            
            state = ""
            zip_code = ""
            state_zip_match = re.match(r'([A-Z]{2})\s*(\d{5})?', state_zip)
            if state_zip_match:
                state = state_zip_match.group(1)
                zip_code = state_zip_match.group(2) or ""
            
            # Phone
            phone_elem = soup.find('a', class_='phoneNumber')
            phone = self._clean_text(phone_elem.text) if phone_elem else None
            
            # Units and amenities
            units = self._parse_units(soup)
            amenities = self._parse_amenities(soup)
            
            return ScrapedProperty(
                name=name,
                address=street,
                city=city,
                state=state,
                zip_code=zip_code,
                phone=phone,
                amenities=amenities,
                units=units,
                source=self.source,
                source_url=url
            )
            
        except Exception as e:
            logger.error(f"Error in HTML fallback parsing: {e}")
            return None
    
    def _parse_units(self, soup) -> List[ScrapedUnit]:
        """Parse unit/floor plan information"""
        units = []
        
        # Look for pricing grid or floor plan section
        pricing_section = soup.find('section', {'id': 'pricingView'}) or \
                         soup.find('div', class_='pricingGridContainer')
        
        if not pricing_section:
            return units
        
        # Find all unit rows
        unit_rows = pricing_section.find_all(['div', 'tr'], class_=re.compile(r'pricingGridItem|availableRow'))
        
        for row in unit_rows:
            try:
                # Bedrooms
                bed_elem = row.find(class_=re.compile(r'bedRange|beds'))
                bed_text = self._clean_text(bed_elem.text) if bed_elem else ""
                
                if 'studio' in bed_text.lower():
                    bedrooms = 0
                else:
                    bed_match = re.search(r'(\d+)', bed_text)
                    bedrooms = int(bed_match.group(1)) if bed_match else 1
                
                # Bathrooms
                bath_elem = row.find(class_=re.compile(r'bathRange|baths'))
                bath_text = self._clean_text(bath_elem.text) if bath_elem else "1"
                bath_match = re.search(r'(\d+(?:\.\d+)?)', bath_text)
                bathrooms = float(bath_match.group(1)) if bath_match else 1.0
                
                # Square footage
                sqft_elem = row.find(class_=re.compile(r'sqftColumn|sqft'))
                sqft_text = self._clean_text(sqft_elem.text) if sqft_elem else ""
                
                sqft_range = re.findall(r'(\d+,?\d*)', sqft_text.replace(',', ''))
                sqft_min = int(sqft_range[0]) if sqft_range else None
                sqft_max = int(sqft_range[-1]) if sqft_range else sqft_min
                
                # Price
                price_elem = row.find(class_=re.compile(r'pricingColumn|rentLabel|rent'))
                price_text = self._clean_text(price_elem.text) if price_elem else ""
                
                price_range = re.findall(r'\$?([\d,]+)', price_text)
                rent_min = self._parse_price(price_range[0]) if price_range else None
                rent_max = self._parse_price(price_range[-1]) if len(price_range) > 1 else rent_min
                
                # Availability count
                avail_elem = row.find(class_=re.compile(r'availableNow|available'))
                avail_text = self._clean_text(avail_elem.text) if avail_elem else ""
                avail_match = re.search(r'(\d+)', avail_text)
                available = int(avail_match.group(1)) if avail_match else 1 if 'available' in avail_text.lower() else 0
                
                # Specials
                special_elem = row.find(class_=re.compile(r'special|promo'))
                special = self._clean_text(special_elem.text) if special_elem else None
                
                units.append(ScrapedUnit(
                    unit_type=self._normalize_unit_type(bedrooms),
                    bedrooms=bedrooms,
                    bathrooms=bathrooms,
                    sqft_min=sqft_min,
                    sqft_max=sqft_max,
                    rent_min=rent_min,
                    rent_max=rent_max,
                    available_count=available,
                    move_in_specials=special
                ))
                
            except Exception as e:
                logger.warning(f"Error parsing unit row: {e}")
                continue
        
        return units
    
    def _parse_amenities(self, soup) -> List[str]:
        """Parse amenities list"""
        amenities = []
        
        # Look for amenities section
        amenities_section = soup.find('section', {'id': 'amenitiesSection'}) or \
                           soup.find('div', class_='amenitiesSection')
        
        if not amenities_section:
            return amenities
        
        # Find all amenity items
        amenity_items = amenities_section.find_all('span', class_='amenityLabel') or \
                       amenities_section.find_all('li')
        
        for item in amenity_items:
            text = self._clean_text(item.text)
            if text and len(text) < 50:  # Filter out long descriptions
                amenities.append(text)
        
        return list(set(amenities))[:30]  # Dedupe and limit
    
    def search_by_location(
        self, 
        city: str, 
        state: str, 
        radius_miles: int = 5,
        max_results: int = 50
    ) -> List[ScrapedProperty]:
        """Search for properties by city/state"""
        location = f"{city}-{state}"
        properties = []
        page = 1
        
        while len(properties) < max_results:
            try:
                url = self._build_search_url(location, page)
                html = self._fetch(url)
                
                results = self._parse_search_results(html)
                
                if not results:
                    break
                
                for result in results:
                    if len(properties) >= max_results:
                        break
                    
                    # Scrape individual property
                    property_data = self.scrape_property(result['url'])
                    if property_data:
                        properties.append(property_data)
                
                page += 1
                
                # Safety limit
                if page > 10:
                    break
                    
            except Exception as e:
                logger.error(f"Error in search page {page}: {e}")
                break
        
        return properties
    
    def search_by_coordinates(
        self,
        lat: float,
        lng: float,
        radius_miles: int = 5,
        max_results: int = 50
    ) -> List[ScrapedProperty]:
        """
        Search for properties near coordinates
        
        Apartments.com doesn't directly support coordinate search,
        so we use their bounding box API endpoint.
        """
        # Approximate bounding box (rough calculation)
        lat_delta = radius_miles / 69.0  # ~69 miles per degree latitude
        lng_delta = radius_miles / (69.0 * abs(lat) / 90.0 + 1)  # Adjust for longitude
        
        # Build API-style URL with bbox
        # Note: This is a simplified approach - production might need Playwright
        bbox_url = (
            f"{self.BASE_URL}/services/search/?"
            f"minLat={lat - lat_delta}&maxLat={lat + lat_delta}"
            f"&minLng={lng - lng_delta}&maxLng={lng + lng_delta}"
        )
        
        # For now, fall back to reverse geocoding and city search
        # This would require geopy integration
        logger.warning("Coordinate search falling back to city search")
        
        # This is a placeholder - in production, use reverse geocoding
        return []
    
    def scrape_property(self, url: str) -> Optional[ScrapedProperty]:
        """Scrape a single property listing"""
        try:
            html = self._fetch(url)
            return self._parse_property_page(html, url)
        except Exception as e:
            logger.error(f"Error scraping property {url}: {e}")
            return None

