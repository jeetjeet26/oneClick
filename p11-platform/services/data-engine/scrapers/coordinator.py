"""
Scraping Coordinator
Manages scraping jobs, syncs with Supabase, handles updates
Includes brand intelligence extraction for competitor analysis
"""

import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import hashlib

from scrapers.base import ScrapedProperty
from scrapers.discovery import CompetitorDiscovery, DiscoveryConfig, SubjectPropertyInfo
from scrapers.brand_intelligence import (
    BrandIntelligenceExtractor,
    CompetitorBatchProcessor,
    SemanticSearchService
)
from utils.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class ScrapingCoordinator:
    """
    Coordinates scraping operations and syncs with database
    """
    
    def __init__(self, proxy_url: Optional[str] = None):
        """
        Initialize coordinator
        
        Args:
            proxy_url: Optional proxy URL for scrapers
        """
        self.proxy_url = proxy_url
        self.supabase = get_supabase_client()
    
    def discover_competitors_for_property(
        self,
        property_id: str,
        radius_miles: float = 3.0,
        max_competitors: int = 20,
        auto_add: bool = True
    ) -> Dict[str, Any]:
        """
        Discover competitors near a property and optionally add them
        
        Args:
            property_id: Supabase property ID
            radius_miles: Search radius in miles
            max_competitors: Maximum competitors to find
            auto_add: Automatically add discovered competitors
            
        Returns:
            Dict with discovered competitors and status
        """
        # Get property details (including info for smart matching)
        property_result = self.supabase.table('properties').select(
            'id, name, address, year_built, unit_count, amenities'
        ).eq('id', property_id).single().execute()
        
        if not property_result.data:
            return {'success': False, 'error': 'Property not found'}
        
        property_data = property_result.data
        address_json = property_data.get('address') or {}
        
        # Build address string
        address_parts = [
            address_json.get('street', ''),
            address_json.get('city', ''),
            address_json.get('state', ''),
            address_json.get('zip', '')
        ]
        full_address = ', '.join(p for p in address_parts if p)
        
        if not full_address:
            return {'success': False, 'error': 'Property has no address'}
        
        logger.info(f"Discovering competitors for: {property_data['name']} at {full_address}")
        
        # Try to get average rent from property units for classification
        avg_rent = None
        try:
            units_result = self.supabase.table('property_units').select(
                'rent_min, rent_max'
            ).eq('property_id', property_id).execute()
            
            if units_result.data:
                rents = [u.get('rent_min') or u.get('rent_max') for u in units_result.data if u.get('rent_min') or u.get('rent_max')]
                if rents:
                    avg_rent = sum(rents) / len(rents)
        except Exception as e:
            logger.debug(f"Could not fetch units for avg rent: {e}")
        
        # Create subject property info for smart matching
        subject_info = SubjectPropertyInfo(
            name=property_data['name'],
            year_built=property_data.get('year_built'),
            units_count=property_data.get('unit_count'),
            avg_rent=avg_rent,
            amenities=property_data.get('amenities') or [],
            city=address_json.get('city', '')
        )
        
        # Configure and run discovery
        config = DiscoveryConfig(
            radius_miles=radius_miles,
            max_competitors=max_competitors,
            min_similarity=50.0,  # Only return competitors with 50%+ similarity
            use_smart_matching=True
        )
        
        discovery = CompetitorDiscovery(
            proxy_url=self.proxy_url,
            config=config,
            subject_info=subject_info
        )
        
        # Discover competitors
        discovered = discovery.discover_from_address(
            full_address,
            city=address_json.get('city'),
            state=address_json.get('state')
        )
        
        logger.info(f"Discovered {len(discovered)} potential competitors")
        
        # Get existing competitors to avoid duplicates
        existing_result = self.supabase.table('competitors').select(
            'name, address'
        ).eq('property_id', property_id).execute()
        
        existing_names = {c['name'].lower() for c in (existing_result.data or [])}
        
        # Filter out existing
        new_competitors = [
            d for d in discovered 
            if d.name.lower() not in existing_names
        ]
        
        added = []
        if auto_add and new_competitors:
            added = self._add_competitors(property_id, new_competitors)
        
        return {
            'success': True,
            'property_name': property_data['name'],
            'discovered_count': len(discovered),
            'new_count': len(new_competitors),
            'added_count': len(added),
            'competitors': [d.to_dict() for d in new_competitors] if not auto_add else added
        }
    
    def refresh_all_competitors(self, property_id: str) -> Dict[str, Any]:
        """
        Refresh pricing data for all competitors of a property
        
        Args:
            property_id: Supabase property ID
            
        Returns:
            Dict with refresh results
        """
        # Get all competitors with ILS listings
        competitors_result = self.supabase.table('competitors').select(
            'id, name, ils_listings'
        ).eq('property_id', property_id).eq('is_active', True).execute()
        
        competitors = competitors_result.data or []
        
        if not competitors:
            return {'success': True, 'updated_count': 0, 'message': 'No competitors to refresh'}
        
        discovery = CompetitorDiscovery(proxy_url=self.proxy_url)
        
        updated = 0
        errors = []
        
        for competitor in competitors:
            ils_listings = competitor.get('ils_listings', {})
            
            # Try to refresh from each source
            for source, url in ils_listings.items():
                if not url:
                    continue
                
                try:
                    refreshed = discovery.refresh_competitor(url, source)
                    
                    if refreshed:
                        # Update competitor and units
                        self._update_competitor(competitor['id'], refreshed)
                        updated += 1
                        logger.info(f"Refreshed: {competitor['name']}")
                    
                    break  # Only need one successful source
                    
                except Exception as e:
                    logger.error(f"Error refreshing {competitor['name']}: {e}")
                    errors.append({
                        'competitor': competitor['name'],
                        'error': str(e)
                    })
        
        # Update last scraped timestamp
        self.supabase.table('scrape_config').update({
            'last_run_at': datetime.now(timezone.utc).isoformat(),
            'error_count': len(errors)
        }).eq('property_id', property_id).execute()
        
        return {
            'success': True,
            'total_competitors': len(competitors),
            'updated_count': updated,
            'error_count': len(errors),
            'errors': errors[:5]  # Limit errors returned
        }
    
    def _add_competitors(
        self, 
        property_id: str, 
        properties: List[ScrapedProperty]
    ) -> List[Dict[str, Any]]:
        """Add discovered competitors to database"""
        added = []
        
        for prop in properties:
            try:
                # Insert competitor
                competitor_data = {
                    'property_id': property_id,
                    'name': prop.name,
                    'address': f"{prop.address}, {prop.city}, {prop.state} {prop.zip_code}",
                    'address_json': {
                        'street': prop.address,
                        'city': prop.city,
                        'state': prop.state,
                        'zip': prop.zip_code,
                        'lat': prop.latitude,
                        'lng': prop.longitude
                    },
                    'website_url': prop.website_url,
                    'phone': prop.phone,
                    'units_count': prop.units_count,
                    'year_built': prop.year_built,
                    'property_type': prop.property_type,
                    'amenities': prop.amenities,
                    'photos': prop.photos[:10],
                    'ils_listings': {prop.source: prop.source_url},
                    'last_scraped_at': datetime.now(timezone.utc).isoformat()
                }
                
                result = self.supabase.table('competitors').insert(
                    competitor_data
                ).execute()
                
                if result.data:
                    competitor_id = result.data[0]['id']
                    
                    # Add units
                    if prop.units:
                        self._add_units(competitor_id, prop.units)
                    
                    added.append({
                        'id': competitor_id,
                        'name': prop.name,
                        'units_count': len(prop.units)
                    })
                    
                    # Create "new competitor" alert
                    self.supabase.table('market_alerts').insert({
                        'property_id': property_id,
                        'competitor_id': competitor_id,
                        'alert_type': 'new_competitor',
                        'severity': 'info',
                        'title': f'New competitor discovered: {prop.name}',
                        'description': f'Auto-discovered via {prop.source}',
                        'data': {
                            'source': prop.source,
                            'units_tracked': len(prop.units)
                        }
                    }).execute()
                    
            except Exception as e:
                logger.error(f"Error adding competitor {prop.name}: {e}")
                continue
        
        return added
    
    def _add_units(self, competitor_id: str, units: List) -> None:
        """Add units and initial price history"""
        for unit in units:
            try:
                unit_data = {
                    'competitor_id': competitor_id,
                    'unit_type': unit.unit_type,
                    'bedrooms': unit.bedrooms,
                    'bathrooms': unit.bathrooms,
                    'sqft_min': unit.sqft_min,
                    'sqft_max': unit.sqft_max,
                    'rent_min': unit.rent_min,
                    'rent_max': unit.rent_max,
                    'deposit': unit.deposit,
                    'available_count': unit.available_count,
                    'move_in_specials': unit.move_in_specials
                }
                
                result = self.supabase.table('competitor_units').insert(
                    unit_data
                ).execute()
                
                # Add initial price history
                if result.data and (unit.rent_min or unit.rent_max):
                    self.supabase.table('competitor_price_history').insert({
                        'competitor_unit_id': result.data[0]['id'],
                        'rent_min': unit.rent_min,
                        'rent_max': unit.rent_max,
                        'available_count': unit.available_count,
                        'source': 'scraper'
                    }).execute()
                    
            except Exception as e:
                logger.error(f"Error adding unit: {e}")
    
    def _update_competitor(
        self, 
        competitor_id: str, 
        refreshed: ScrapedProperty
    ) -> None:
        """Update competitor with refreshed data"""
        try:
            # Update competitor info
            self.supabase.table('competitors').update({
                'phone': refreshed.phone,
                'amenities': refreshed.amenities,
                'photos': refreshed.photos[:10],
                'last_scraped_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', competitor_id).execute()
            
            # Get existing units
            existing_units = self.supabase.table('competitor_units').select(
                'id, unit_type, rent_min, rent_max, available_count'
            ).eq('competitor_id', competitor_id).execute()
            
            existing_map = {u['unit_type']: u for u in (existing_units.data or [])}
            
            # Update or add units
            for unit in refreshed.units:
                existing = existing_map.get(unit.unit_type)
                
                if existing:
                    # Check if price changed
                    price_changed = (
                        existing['rent_min'] != unit.rent_min or
                        existing['rent_max'] != unit.rent_max
                    )
                    
                    # Update unit
                    self.supabase.table('competitor_units').update({
                        'rent_min': unit.rent_min,
                        'rent_max': unit.rent_max,
                        'sqft_min': unit.sqft_min,
                        'sqft_max': unit.sqft_max,
                        'available_count': unit.available_count,
                        'move_in_specials': unit.move_in_specials,
                        'last_updated_at': datetime.now(timezone.utc).isoformat()
                    }).eq('id', existing['id']).execute()
                    
                    # Add price history if changed (triggers alert automatically)
                    if price_changed or existing['available_count'] != unit.available_count:
                        self.supabase.table('competitor_price_history').insert({
                            'competitor_unit_id': existing['id'],
                            'rent_min': unit.rent_min,
                            'rent_max': unit.rent_max,
                            'available_count': unit.available_count,
                            'source': 'scraper'
                        }).execute()
                else:
                    # Add new unit
                    self._add_units(competitor_id, [unit])
                    
        except Exception as e:
            logger.error(f"Error updating competitor {competitor_id}: {e}")
            raise
    
    # =========================================================================
    # BRAND INTELLIGENCE METHODS
    # =========================================================================
    
    def discover_and_analyze_competitors(
        self,
        property_id: str,
        radius_miles: float = 3.0,
        max_competitors: int = 20,
        auto_add: bool = True,
        extract_brand_intelligence: bool = True
    ) -> Dict[str, Any]:
        """
        Enhanced discovery that also triggers brand intelligence extraction
        
        Args:
            property_id: Supabase property ID
            radius_miles: Search radius in miles
            max_competitors: Maximum competitors to find
            auto_add: Automatically add discovered competitors
            extract_brand_intelligence: Trigger brand intelligence extraction
            
        Returns:
            Dict with discovery results and optional brand intel job ID
        """
        # Run standard discovery
        discovery_result = self.discover_competitors_for_property(
            property_id=property_id,
            radius_miles=radius_miles,
            max_competitors=max_competitors,
            auto_add=auto_add
        )
        
        if not discovery_result.get('success'):
            return discovery_result
        
        # If brand intelligence requested and we added competitors
        brand_intel_job_id = None
        if extract_brand_intelligence and discovery_result.get('added_count', 0) > 0:
            # Get IDs of newly added competitors with website URLs
            added_competitors = discovery_result.get('competitors', [])
            competitor_ids = [c['id'] for c in added_competitors if c.get('id')]
            
            if competitor_ids:
                # Create brand intelligence job
                brand_intel_job_id = self.trigger_brand_intelligence_extraction(
                    property_id=property_id,
                    competitor_ids=competitor_ids
                )
        
        discovery_result['brand_intelligence_job_id'] = brand_intel_job_id
        return discovery_result
    
    def trigger_brand_intelligence_extraction(
        self,
        property_id: str,
        competitor_ids: Optional[List[str]] = None,
        force_refresh: bool = False
    ) -> str:
        """
        Start brand intelligence extraction job for competitors
        
        Args:
            property_id: Property UUID
            competitor_ids: Specific competitor IDs (None = all with websites)
            force_refresh: Re-analyze even if recent data exists
            
        Returns:
            Job UUID for status polling
        """
        # Get competitors with website URLs
        query = self.supabase.table('competitors').select(
            'id, name, website_url'
        ).eq('property_id', property_id).eq('is_active', True).not_.is_('website_url', 'null')
        
        if competitor_ids:
            query = query.in_('id', competitor_ids)
        
        result = query.execute()
        competitors = result.data or []
        
        if not competitors:
            logger.warning(f"No competitors with website URLs found for property {property_id}")
            # Return a completed job with 0 competitors
            job_result = self.supabase.table('competitor_scrape_jobs').insert({
                'property_id': property_id,
                'job_type': 'brand_intelligence',
                'status': 'completed',
                'total_competitors': 0,
                'processed_count': 0,
                'failed_count': 0,
                'error_message': 'No competitors with website URLs'
            }).execute()
            return job_result.data[0]['id']
        
        # Create batch processor and job
        processor = CompetitorBatchProcessor()
        competitor_ids_to_process = [c['id'] for c in competitors]
        
        job_id = processor.create_job(property_id, competitor_ids_to_process)
        
        # Run job in background
        def run_job():
            asyncio.run(processor.process_job(job_id, force_refresh))
        
        import threading
        thread = threading.Thread(target=run_job, daemon=True)
        thread.start()
        
        logger.info(f"Started brand intelligence job {job_id} for {len(competitors)} competitors")
        
        return job_id
    
    def get_brand_intelligence_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get status of a brand intelligence extraction job
        
        Args:
            job_id: Job UUID
            
        Returns:
            Job status details
        """
        processor = CompetitorBatchProcessor()
        return processor.get_job_status(job_id)
    
    def get_competitor_brand_intelligence(
        self,
        competitor_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get brand intelligence for a specific competitor
        
        Args:
            competitor_id: Competitor UUID
            
        Returns:
            Brand intelligence data or None
        """
        result = self.supabase.table('competitor_brand_intelligence').select(
            '*'
        ).eq('competitor_id', competitor_id).single().execute()
        
        return result.data if result.data else None
    
    def get_all_brand_intelligence(
        self,
        property_id: str,
        include_raw: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get brand intelligence for all competitors of a property
        
        Args:
            property_id: Property UUID
            include_raw: Include raw extraction data
            
        Returns:
            List of brand intelligence data with competitor names
        """
        # Join with competitors table
        result = self.supabase.table('competitor_brand_intelligence').select(
            '*, competitors!inner(id, name, website_url, property_id)'
        ).eq('competitors.property_id', property_id).execute()
        
        if not result.data:
            return []
        
        intelligence_list = []
        for item in result.data:
            competitor = item.pop('competitors', {})
            
            if not include_raw:
                item.pop('raw_extraction', None)
            
            intelligence_list.append({
                'competitor_id': competitor.get('id'),
                'competitor_name': competitor.get('name'),
                'website_url': competitor.get('website_url'),
                **item
            })
        
        return intelligence_list
    
    def semantic_search_competitors(
        self,
        query: str,
        property_id: Optional[str] = None,
        competitor_ids: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Semantic search across competitor content
        
        Args:
            query: Natural language search query
            property_id: Filter to property's competitors
            competitor_ids: Filter to specific competitors
            limit: Max results
            
        Returns:
            Matching content chunks with metadata
        """
        search_service = SemanticSearchService()
        
        # Run async search
        results = asyncio.run(search_service.search(
            query=query,
            property_id=property_id,
            competitor_ids=competitor_ids,
            limit=limit
        ))
        
        return results
    
    def generate_competitor_embeddings(
        self,
        competitor_id: str
    ) -> int:
        """
        Generate embeddings for a competitor's content chunks
        
        Args:
            competitor_id: Competitor UUID
            
        Returns:
            Number of embeddings generated
        """
        search_service = SemanticSearchService()
        return asyncio.run(search_service.generate_embeddings_for_competitor(competitor_id))

