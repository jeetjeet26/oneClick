"""
MarketVision 360 - Web Scraping Module
Automated competitor data collection from ILS sites
Community website intelligence extraction
"""

from scrapers.base import BaseScraper, ScrapedProperty, ScrapedUnit
from scrapers.apartments_com import ApartmentsComScraper
from scrapers.discovery import CompetitorDiscovery, DiscoveryConfig, SubjectPropertyInfo

# Conditionally import Google Places (requires API key)
try:
    from scrapers.google_places import GooglePlacesScraper, PlaceResult
except ImportError:
    GooglePlacesScraper = None
    PlaceResult = None

from scrapers.website_intelligence import (
    CommunityWebsiteScraper,
    CommunityKnowledge,
    ExtractedContent,
    scrape_community_website
)

__all__ = [
    'BaseScraper',
    'ScrapedProperty',
    'ScrapedUnit',
    'ApartmentsComScraper',
    'CompetitorDiscovery',
    'DiscoveryConfig',
    'SubjectPropertyInfo',
    'GooglePlacesScraper',
    'PlaceResult',
    'CommunityWebsiteScraper',
    'CommunityKnowledge',
    'ExtractedContent',
    'scrape_community_website'
]

