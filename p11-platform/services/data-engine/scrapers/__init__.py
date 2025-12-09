"""
MarketVision 360 - Web Scraping Module
Automated competitor data collection from ILS sites
"""

from .base import BaseScraper, ScrapedProperty, ScrapedUnit
from .apartments_com import ApartmentsComScraper
from .discovery import CompetitorDiscovery

__all__ = [
    'BaseScraper',
    'ScrapedProperty',
    'ScrapedUnit',
    'ApartmentsComScraper',
    'CompetitorDiscovery'
]

