"""
Google Places Competitor Discovery
Uses Google Maps Places API to find nearby apartment communities
"""

import os
import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

import googlemaps
from scrapers.base import ScrapedProperty, ScrapedUnit

logger = logging.getLogger(__name__)


@dataclass
class PlaceResult:
    """Raw result from Google Places API"""
    place_id: str
    name: str
    address: str
    lat: float
    lng: float
    rating: Optional[float] = None
    user_ratings_total: Optional[int] = None
    price_level: Optional[int] = None  # 0-4, higher = more expensive
    types: List[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    photos: List[str] = None
    
    def __post_init__(self):
        if self.types is None:
            self.types = []
        if self.photos is None:
            self.photos = []


class GooglePlacesScraper:
    """
    Discovers competitor properties using Google Maps Places API
    
    Searches for apartment complexes, real estate agencies, and lodging
    near a given location to find potential competitors.
    """
    
    # Place types to search for apartment communities
    SEARCH_TYPES = [
        'real_estate_agency',  # Property management offices
        'lodging',             # Extended stay / apartments
    ]
    
    # Keywords to include in text search (targeting actual apartment communities)
    SEARCH_KEYWORDS = [
        'apartment community',
        'apartments for rent',
        'luxury apartment homes',
        'apartment living',
        'multifamily',
    ]
    
    # Keywords that indicate non-competitor (filter out)
    EXCLUDE_KEYWORDS = [
        'senior living',
        'assisted living',
        '55+',
        'student housing',
        'storage',
        'office',
        'commercial',
        'hotel',
        'motel',
        'hostel',
        'property management',
        'management company',
        'brokerage',
        'broker',
        'realty group',
        'real estate agent',
        'realtor',
        'investment',
        'consulting',
        'leasing office',
    ]
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Google Places scraper
        
        Args:
            api_key: Google Maps API key (defaults to GOOGLE_MAPS_API_KEY env var)
        """
        self.api_key = api_key or os.environ.get('GOOGLE_MAPS_API_KEY')
        if not self.api_key:
            raise ValueError("Google Maps API key required. Set GOOGLE_MAPS_API_KEY env var.")
        
        self.client = googlemaps.Client(key=self.api_key)
        self.source = "google_places"
    
    def search_nearby(
        self,
        lat: float,
        lng: float,
        radius_meters: int = 5000,
        max_results: int = 20
    ) -> List[PlaceResult]:
        """
        Search for apartment communities near coordinates
        
        Args:
            lat: Latitude
            lng: Longitude  
            radius_meters: Search radius in meters (max 50000)
            max_results: Maximum results to return
            
        Returns:
            List of PlaceResult objects
        """
        location = (lat, lng)
        all_results = []
        seen_place_ids = set()
        
        # Search using text search with apartment keywords (more effective)
        for keyword in self.SEARCH_KEYWORDS[:2]:  # Limit to avoid quota
            if len(all_results) >= max_results:
                break
                
            try:
                logger.info(f"Searching Google Places for: {keyword}")
                
                # Text search is better for finding apartments
                results = self.client.places_nearby(
                    location=location,
                    radius=radius_meters,
                    keyword=keyword,
                    type='real_estate_agency'
                )
                
                for place in results.get('results', []):
                    place_id = place.get('place_id')
                    if place_id and place_id not in seen_place_ids:
                        seen_place_ids.add(place_id)
                        
                        result = self._parse_place(place)
                        if result and self._is_valid_competitor(result):
                            all_results.append(result)
                            
                            if len(all_results) >= max_results:
                                break
                
                # Also try text search for better results
                text_results = self.client.places(
                    query=f"{keyword} near {lat},{lng}",
                    location=location,
                    radius=radius_meters
                )
                
                for place in text_results.get('results', []):
                    place_id = place.get('place_id')
                    if place_id and place_id not in seen_place_ids:
                        seen_place_ids.add(place_id)
                        
                        result = self._parse_place(place)
                        if result and self._is_valid_competitor(result):
                            all_results.append(result)
                            
                            if len(all_results) >= max_results:
                                break
                                
            except Exception as e:
                logger.error(f"Error in Google Places search: {e}")
                continue
        
        logger.info(f"Found {len(all_results)} potential competitors from Google Places")
        return all_results[:max_results]
    
    def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a place
        
        Args:
            place_id: Google Place ID
            
        Returns:
            Place details dict or None
        """
        try:
            result = self.client.place(
                place_id=place_id,
                fields=[
                    'name',
                    'formatted_address',
                    'formatted_phone_number',
                    'website',
                    'rating',
                    'user_ratings_total',
                    'price_level',
                    'photo',  # singular, not 'photos'
                    'geometry',
                    'type',   # singular, not 'types'
                    'review',
                    'opening_hours',
                    'url',    # Google Maps URL
                ]
            )
            return result.get('result')
        except Exception as e:
            logger.error(f"Error getting place details for {place_id}: {e}")
            return None
    
    def _parse_place(self, place: Dict[str, Any]) -> Optional[PlaceResult]:
        """Parse Google Places API result into PlaceResult"""
        try:
            geometry = place.get('geometry', {})
            location = geometry.get('location', {})
            
            # Extract photo references (we'll need to build URLs later)
            photos = []
            for photo in place.get('photos', [])[:5]:
                photo_ref = photo.get('photo_reference')
                if photo_ref:
                    # Build photo URL
                    photo_url = (
                        f"https://maps.googleapis.com/maps/api/place/photo"
                        f"?maxwidth=800&photo_reference={photo_ref}&key={self.api_key}"
                    )
                    photos.append(photo_url)
            
            return PlaceResult(
                place_id=place.get('place_id', ''),
                name=place.get('name', ''),
                address=place.get('vicinity') or place.get('formatted_address', ''),
                lat=location.get('lat', 0),
                lng=location.get('lng', 0),
                rating=place.get('rating'),
                user_ratings_total=place.get('user_ratings_total'),
                price_level=place.get('price_level'),
                types=place.get('types', []),
                photos=photos,
            )
        except Exception as e:
            logger.error(f"Error parsing place: {e}")
            return None
    
    def _is_valid_competitor(self, result: PlaceResult) -> bool:
        """
        Check if a place result is a valid apartment competitor
        
        Filters out non-apartment businesses like hotels, storage, etc.
        """
        name_lower = result.name.lower()
        address_lower = result.address.lower()
        types_str = ' '.join(result.types).lower()
        
        # Check for exclude keywords
        for keyword in self.EXCLUDE_KEYWORDS:
            if keyword in name_lower or keyword in types_str:
                logger.debug(f"Excluding {result.name} - matches exclude keyword: {keyword}")
                return False
        
        # Must have a name
        if not result.name or len(result.name) < 3:
            return False
        
        return True
    
    def to_scraped_property(
        self, 
        result: PlaceResult,
        include_details: bool = True
    ) -> ScrapedProperty:
        """
        Convert PlaceResult to ScrapedProperty format
        
        Args:
            result: PlaceResult from search
            include_details: Whether to fetch additional details (uses API quota)
            
        Returns:
            ScrapedProperty object
        """
        website = result.website
        phone = result.phone
        
        # Optionally get more details
        if include_details:
            details = self.get_place_details(result.place_id)
            if details:
                website = details.get('website') or website
                phone = details.get('formatted_phone_number') or phone
                
                logger.debug(f"Got details for {result.name}: website={website}, phone={phone}")
                
                # Get more photos (API returns as 'photo' not 'photos')
                photos_data = details.get('photo') or details.get('photos') or []
                if photos_data:
                    for photo in photos_data[:5]:
                        photo_ref = photo.get('photo_reference')
                        if photo_ref:
                            photo_url = (
                                f"https://maps.googleapis.com/maps/api/place/photo"
                                f"?maxwidth=800&photo_reference={photo_ref}&key={self.api_key}"
                            )
                            if photo_url not in result.photos:
                                result.photos.append(photo_url)
        
        # Parse address components
        address_parts = result.address.split(',')
        street = address_parts[0].strip() if address_parts else result.address
        city = address_parts[1].strip() if len(address_parts) > 1 else ""
        state_zip = address_parts[2].strip() if len(address_parts) > 2 else ""
        
        # Parse state and zip
        state = ""
        zip_code = ""
        if state_zip:
            parts = state_zip.split()
            if parts:
                state = parts[0] if len(parts[0]) == 2 else ""
                zip_code = parts[1] if len(parts) > 1 else ""
        
        return ScrapedProperty(
            name=result.name,
            address=street,
            city=city,
            state=state,
            zip_code=zip_code,
            latitude=result.lat,
            longitude=result.lng,
            website_url=website,
            phone=phone,
            amenities=[],  # Not available from Places API
            photos=result.photos[:10],
            units=[],  # Not available from Places API
            source=self.source,
            source_url=f"https://www.google.com/maps/place/?q=place_id:{result.place_id}"
        )
    
    def discover_competitors(
        self,
        lat: float,
        lng: float,
        radius_miles: float = 3.0,
        max_results: int = 20,
        include_details: bool = True
    ) -> List[ScrapedProperty]:
        """
        Main method: Discover competitor apartments near a location
        
        Args:
            lat: Latitude of subject property
            lng: Longitude of subject property
            radius_miles: Search radius in miles
            max_results: Maximum competitors to return
            include_details: Fetch detailed info (uses more API quota)
            
        Returns:
            List of ScrapedProperty objects
        """
        # Convert miles to meters
        radius_meters = int(radius_miles * 1609.34)
        
        # Cap at Google's limit
        radius_meters = min(radius_meters, 50000)
        
        # Search for places
        results = self.search_nearby(
            lat=lat,
            lng=lng,
            radius_meters=radius_meters,
            max_results=max_results
        )
        
        # Convert to ScrapedProperty format
        properties = []
        for result in results:
            try:
                prop = self.to_scraped_property(result, include_details=include_details)
                properties.append(prop)
            except Exception as e:
                logger.error(f"Error converting place {result.name}: {e}")
                continue
        
        return properties

