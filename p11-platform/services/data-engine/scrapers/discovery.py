"""
Competitor Discovery Service
Automatically find and scrape competitor properties near a given address
"""

import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from .base import ScrapedProperty
from .apartments_com import ApartmentsComScraper
from ..utils.geocoding import GeocodingService, GeocodedLocation

logger = logging.getLogger(__name__)


@dataclass
class DiscoveryConfig:
    """Configuration for competitor discovery"""
    radius_miles: float = 3.0
    max_competitors: int = 20
    include_sources: List[str] = None  # ['apartments_com', 'zillow']
    min_units: Optional[int] = None  # Minimum units to include
    exclude_keywords: List[str] = None  # Keywords to exclude from names
    
    def __post_init__(self):
        if self.include_sources is None:
            self.include_sources = ['apartments_com']
        if self.exclude_keywords is None:
            self.exclude_keywords = ['senior', '55+', 'assisted', 'student']


class CompetitorDiscovery:
    """
    Service to automatically discover competitor properties
    near a given property address
    """
    
    def __init__(
        self, 
        proxy_url: Optional[str] = None,
        config: Optional[DiscoveryConfig] = None
    ):
        """
        Initialize discovery service
        
        Args:
            proxy_url: Optional proxy URL for scraping
            config: Discovery configuration
        """
        self.proxy_url = proxy_url
        self.config = config or DiscoveryConfig()
        self.geocoder = GeocodingService()
        
        # Initialize scrapers
        self.scrapers = {}
        if 'apartments_com' in self.config.include_sources:
            self.scrapers['apartments_com'] = ApartmentsComScraper(proxy_url)
    
    def discover_from_address(
        self, 
        address: str,
        city: Optional[str] = None,
        state: Optional[str] = None
    ) -> List[ScrapedProperty]:
        """
        Discover competitors near an address
        
        Args:
            address: Property address (can be full or partial)
            city: City name (optional, helps with geocoding)
            state: State code (optional, helps with geocoding)
            
        Returns:
            List of discovered competitor properties
        """
        # Build full address for geocoding
        full_address = address
        if city:
            full_address += f", {city}"
        if state:
            full_address += f", {state}"
        
        # Geocode the address
        logger.info(f"Geocoding address: {full_address}")
        location = self.geocoder.geocode_address(full_address)
        
        if not location:
            logger.error(f"Could not geocode address: {full_address}")
            # Fall back to city/state search if available
            if city and state:
                return self.discover_from_city(city, state)
            return []
        
        logger.info(f"Found location: {location.city}, {location.state} ({location.latitude}, {location.longitude})")
        
        # Discover by coordinates
        return self.discover_from_coordinates(
            location.latitude,
            location.longitude,
            city=location.city,
            state=location.state
        )
    
    def discover_from_coordinates(
        self,
        lat: float,
        lng: float,
        city: Optional[str] = None,
        state: Optional[str] = None
    ) -> List[ScrapedProperty]:
        """
        Discover competitors near coordinates
        
        Args:
            lat: Latitude
            lng: Longitude
            city: City name (used for search if coordinate search not supported)
            state: State code
            
        Returns:
            List of discovered competitor properties
        """
        all_properties = []
        
        for source, scraper in self.scrapers.items():
            try:
                logger.info(f"Searching {source} for competitors...")
                
                # Try coordinate search first
                properties = scraper.search_by_coordinates(
                    lat, lng,
                    radius_miles=int(self.config.radius_miles),
                    max_results=self.config.max_competitors
                )
                
                # Fall back to city search if coordinate search didn't work
                if not properties and city and state:
                    logger.info(f"Falling back to city search: {city}, {state}")
                    properties = scraper.search_by_location(
                        city, state,
                        radius_miles=int(self.config.radius_miles),
                        max_results=self.config.max_competitors
                    )
                
                # Filter properties
                filtered = self._filter_properties(properties, lat, lng)
                all_properties.extend(filtered)
                
                logger.info(f"Found {len(filtered)} competitors from {source}")
                
            except Exception as e:
                logger.error(f"Error searching {source}: {e}")
                continue
        
        # Deduplicate by name
        seen_names = set()
        unique_properties = []
        for prop in all_properties:
            if prop.name.lower() not in seen_names:
                seen_names.add(prop.name.lower())
                unique_properties.append(prop)
        
        # Limit results
        return unique_properties[:self.config.max_competitors]
    
    def discover_from_city(
        self,
        city: str,
        state: str
    ) -> List[ScrapedProperty]:
        """
        Discover competitors in a city
        
        Args:
            city: City name
            state: State code
            
        Returns:
            List of discovered competitor properties
        """
        all_properties = []
        
        for source, scraper in self.scrapers.items():
            try:
                logger.info(f"Searching {source} in {city}, {state}...")
                
                properties = scraper.search_by_location(
                    city, state,
                    radius_miles=int(self.config.radius_miles),
                    max_results=self.config.max_competitors
                )
                
                # Filter (no distance filter without coordinates)
                filtered = self._filter_properties(properties)
                all_properties.extend(filtered)
                
                logger.info(f"Found {len(filtered)} competitors from {source}")
                
            except Exception as e:
                logger.error(f"Error searching {source}: {e}")
                continue
        
        # Deduplicate and limit
        seen_names = set()
        unique_properties = []
        for prop in all_properties:
            if prop.name.lower() not in seen_names:
                seen_names.add(prop.name.lower())
                unique_properties.append(prop)
        
        return unique_properties[:self.config.max_competitors]
    
    def _filter_properties(
        self, 
        properties: List[ScrapedProperty],
        center_lat: Optional[float] = None,
        center_lng: Optional[float] = None
    ) -> List[ScrapedProperty]:
        """
        Filter properties based on configuration
        
        Args:
            properties: List of properties to filter
            center_lat: Center latitude for distance filtering
            center_lng: Center longitude for distance filtering
            
        Returns:
            Filtered list of properties
        """
        filtered = []
        
        for prop in properties:
            # Skip if name contains excluded keywords
            name_lower = prop.name.lower()
            if any(kw in name_lower for kw in self.config.exclude_keywords):
                logger.debug(f"Excluding {prop.name} - contains excluded keyword")
                continue
            
            # Skip if too few units
            if self.config.min_units and prop.units_count:
                if prop.units_count < self.config.min_units:
                    logger.debug(f"Excluding {prop.name} - only {prop.units_count} units")
                    continue
            
            # Skip if outside radius (when coordinates available)
            if center_lat and center_lng and prop.latitude and prop.longitude:
                if not self.geocoder.is_within_radius(
                    center_lat, center_lng,
                    prop.latitude, prop.longitude,
                    self.config.radius_miles
                ):
                    logger.debug(f"Excluding {prop.name} - outside radius")
                    continue
            
            filtered.append(prop)
        
        return filtered
    
    def refresh_competitor(
        self, 
        competitor_url: str,
        source: str = 'apartments_com'
    ) -> Optional[ScrapedProperty]:
        """
        Refresh data for a single competitor
        
        Args:
            competitor_url: URL of the competitor listing
            source: Source identifier
            
        Returns:
            Updated property data or None
        """
        scraper = self.scrapers.get(source)
        if not scraper:
            logger.error(f"No scraper available for source: {source}")
            return None
        
        try:
            return scraper.scrape_property(competitor_url)
        except Exception as e:
            logger.error(f"Error refreshing competitor {competitor_url}: {e}")
            return None

