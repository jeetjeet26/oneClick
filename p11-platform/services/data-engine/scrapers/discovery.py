"""
Competitor Discovery Service
Automatically find and scrape competitor properties near a given address
Uses multiple sources: Google Places API, Apartments.com (future)
Includes smart matching to find relevant competitors based on property class
"""

import logging
import os
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field

from scrapers.base import ScrapedProperty
from scrapers.apartments_com import ApartmentsComScraper
from utils.geocoding import GeocodingService, GeocodedLocation
from utils.property_classifier import (
    PropertyProfile, PropertyClass,
    create_property_profile, calculate_similarity, filter_by_similarity
)

logger = logging.getLogger(__name__)

# Conditionally import Google Places (might not have API key)
try:
    from scrapers.google_places import GooglePlacesScraper
    GOOGLE_PLACES_AVAILABLE = bool(os.environ.get('GOOGLE_MAPS_API_KEY'))
except ImportError:
    GOOGLE_PLACES_AVAILABLE = False
    GooglePlacesScraper = None


@dataclass
class DiscoveryConfig:
    """Configuration for competitor discovery"""
    radius_miles: float = 3.0
    max_competitors: int = 20
    include_sources: List[str] = None  # ['google_places', 'apartments_com']
    min_units: Optional[int] = None  # Minimum units to include
    exclude_keywords: List[str] = None  # Keywords to exclude from names
    min_similarity: float = 50.0  # Minimum similarity score (0-100) to include
    use_smart_matching: bool = True  # Enable property class matching
    
    def __post_init__(self):
        if self.include_sources is None:
            # Default to Google Places (more reliable), then apartments_com
            self.include_sources = ['google_places', 'apartments_com']
        if self.exclude_keywords is None:
            self.exclude_keywords = ['senior', '55+', 'assisted', 'student', 'storage']


@dataclass
class SubjectPropertyInfo:
    """Information about the subject property for matching"""
    name: str
    year_built: Optional[int] = None
    units_count: Optional[int] = None
    avg_rent: Optional[float] = None
    amenities: List[str] = field(default_factory=list)
    city: str = ""


class CompetitorDiscovery:
    """
    Service to automatically discover competitor properties
    near a given property address.
    
    Uses multiple data sources and smart matching to find
    relevant competitors based on property class/tier.
    """
    
    def __init__(
        self, 
        proxy_url: Optional[str] = None,
        config: Optional[DiscoveryConfig] = None,
        subject_info: Optional[SubjectPropertyInfo] = None
    ):
        """
        Initialize discovery service
        
        Args:
            proxy_url: Optional proxy URL for scraping
            config: Discovery configuration
            subject_info: Information about the subject property for matching
        """
        self.proxy_url = proxy_url
        self.config = config or DiscoveryConfig()
        self.geocoder = GeocodingService()
        self.subject_info = subject_info
        self.subject_profile: Optional[PropertyProfile] = None
        
        # Create subject property profile if info provided
        if subject_info:
            self.subject_profile = create_property_profile(
                name=subject_info.name,
                year_built=subject_info.year_built,
                units_count=subject_info.units_count,
                avg_rent=subject_info.avg_rent,
                amenities=subject_info.amenities,
                city=subject_info.city
            )
            logger.info(
                f"Subject property: {subject_info.name} - "
                f"Class {self.subject_profile.property_class.value} "
                f"(score: {self.subject_profile.class_score})"
            )
        
        # Initialize scrapers based on config and availability
        self.scrapers = {}
        
        # Google Places (preferred - no bot blocking)
        if 'google_places' in self.config.include_sources:
            if GOOGLE_PLACES_AVAILABLE and GooglePlacesScraper:
                try:
                    self.scrapers['google_places'] = GooglePlacesScraper()
                    logger.info("Google Places scraper initialized")
                except Exception as e:
                    logger.warning(f"Could not initialize Google Places: {e}")
            else:
                logger.warning("Google Places not available (missing API key)")
        
        # Apartments.com (may be blocked without proxy)
        if 'apartments_com' in self.config.include_sources:
            self.scrapers['apartments_com'] = ApartmentsComScraper(proxy_url)
            logger.info("Apartments.com scraper initialized")
    
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
        
        # Try Google Places first (most reliable)
        if 'google_places' in self.scrapers:
            try:
                logger.info("Searching Google Places for competitors...")
                google_scraper = self.scrapers['google_places']
                
                properties = google_scraper.discover_competitors(
                    lat=lat,
                    lng=lng,
                    radius_miles=self.config.radius_miles,
                    max_results=self.config.max_competitors,
                    include_details=True
                )
                
                logger.info(f"Found {len(properties)} competitors from Google Places")
                all_properties.extend(properties)
                
            except Exception as e:
                logger.error(f"Error searching Google Places: {e}")
        
        # Try Apartments.com (may fail due to blocking)
        if 'apartments_com' in self.scrapers and len(all_properties) < self.config.max_competitors:
            try:
                logger.info("Searching Apartments.com for competitors...")
                apt_scraper = self.scrapers['apartments_com']
                
                # Try coordinate search first
                properties = apt_scraper.search_by_coordinates(
                    lat, lng,
                    radius_miles=int(self.config.radius_miles),
                    max_results=self.config.max_competitors - len(all_properties)
                )
                
                # Fall back to city search if needed
                if not properties and city and state:
                    logger.info(f"Falling back to city search: {city}, {state}")
                    properties = apt_scraper.search_by_location(
                        city, state,
                        radius_miles=int(self.config.radius_miles),
                        max_results=self.config.max_competitors - len(all_properties)
                    )
                
                logger.info(f"Found {len(properties)} competitors from Apartments.com")
                all_properties.extend(properties)
                
            except Exception as e:
                logger.error(f"Error searching Apartments.com: {e}")
        
        # Filter properties
        filtered = self._filter_properties(all_properties, lat, lng)
        
        # Apply smart matching if enabled and we have subject info
        if self.config.use_smart_matching and self.subject_profile:
            filtered = self._apply_smart_matching(filtered)
        
        # Deduplicate by name
        seen_names = set()
        unique_properties = []
        for prop in filtered:
            name_lower = prop.name.lower()
            if name_lower not in seen_names:
                seen_names.add(name_lower)
                unique_properties.append(prop)
        
        logger.info(f"Final result: {len(unique_properties)} unique competitors")
        
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
        
        # Get city center coordinates for Google Places
        location = self.geocoder.geocode_address(f"{city}, {state}")
        if location and 'google_places' in self.scrapers:
            try:
                google_scraper = self.scrapers['google_places']
                properties = google_scraper.discover_competitors(
                    lat=location.latitude,
                    lng=location.longitude,
                    radius_miles=self.config.radius_miles,
                    max_results=self.config.max_competitors
                )
                all_properties.extend(properties)
            except Exception as e:
                logger.error(f"Error searching Google Places: {e}")
        
        # Try Apartments.com
        if 'apartments_com' in self.scrapers:
            try:
                logger.info(f"Searching Apartments.com in {city}, {state}...")
                apt_scraper = self.scrapers['apartments_com']
                
                properties = apt_scraper.search_by_location(
                    city, state,
                    radius_miles=int(self.config.radius_miles),
                    max_results=self.config.max_competitors
                )
                
                all_properties.extend(properties)
                logger.info(f"Found {len(properties)} competitors from Apartments.com")
                
            except Exception as e:
                logger.error(f"Error searching Apartments.com: {e}")
        
        # Filter
        filtered = self._filter_properties(all_properties)
        
        # Apply smart matching
        if self.config.use_smart_matching and self.subject_profile:
            filtered = self._apply_smart_matching(filtered)
        
        # Deduplicate and limit
        seen_names = set()
        unique_properties = []
        for prop in filtered:
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
    
    def _apply_smart_matching(
        self,
        properties: List[ScrapedProperty]
    ) -> List[ScrapedProperty]:
        """
        Apply smart matching to filter properties by similarity to subject
        
        Args:
            properties: List of properties to filter
            
        Returns:
            Filtered list sorted by relevance
        """
        if not self.subject_profile:
            return properties
        
        logger.info(f"Applying smart matching (min similarity: {self.config.min_similarity}%)")
        
        # Create profiles for each competitor
        competitor_profiles = []
        property_map = {}  # Map profile to original property
        
        for prop in properties:
            # Estimate avg rent from units if available
            avg_rent = None
            if prop.units:
                rents = [u.rent_min for u in prop.units if u.rent_min]
                if rents:
                    avg_rent = sum(rents) / len(rents)
            
            profile = create_property_profile(
                name=prop.name,
                year_built=prop.year_built,
                units_count=prop.units_count,
                avg_rent=avg_rent,
                amenities=prop.amenities,
                city=prop.city
            )
            
            competitor_profiles.append(profile)
            property_map[profile.name] = prop
            
            logger.debug(
                f"  {prop.name}: Class {profile.property_class.value} "
                f"(score: {profile.class_score})"
            )
        
        # Filter by similarity
        matched = filter_by_similarity(
            self.subject_profile,
            competitor_profiles,
            min_similarity=self.config.min_similarity
        )
        
        # Map back to properties, maintaining similarity order
        result = []
        for profile, similarity in matched:
            prop = property_map.get(profile.name)
            if prop:
                result.append(prop)
                logger.info(f"  ✓ {prop.name} - {similarity}% similar")
        
        logger.info(f"Smart matching kept {len(result)}/{len(properties)} competitors")
        
        return result
    
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
