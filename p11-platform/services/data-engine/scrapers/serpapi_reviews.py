"""
SerpAPI Google Maps Reviews Integration

Gets ALL reviews from Google Maps using SerpAPI's reliable API.
Unlike the native Google Places API (5 reviews max), SerpAPI can fetch
all reviews with proper pagination.

Documentation: https://serpapi.com/google-maps-reviews-api
"""

import os
import logging
import requests
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

SERPAPI_BASE_URL = "https://serpapi.com/search.json"


@dataclass
class SerpApiReview:
    """Review from SerpAPI"""
    platform_review_id: str
    reviewer_name: str
    reviewer_avatar_url: Optional[str]
    rating: int
    review_text: str
    review_date: str
    relative_time: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'platform_review_id': self.platform_review_id,
            'reviewer_name': self.reviewer_name,
            'reviewer_avatar_url': self.reviewer_avatar_url,
            'rating': self.rating,
            'review_text': self.review_text,
            'review_date': self.review_date,
            'relative_time': self.relative_time,
            'platform': 'google'
        }


class SerpApiReviewsScraper:
    """
    Fetches ALL Google Maps reviews using SerpAPI.
    
    SerpAPI provides:
    - All reviews (not just 5)
    - Proper pagination
    - Reliable uptime
    - Structured data
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get('SERPAPI_API_KEY')
        if not self.api_key:
            raise ValueError("SerpAPI key required. Set SERPAPI_API_KEY env var.")
    
    def get_reviews(
        self, 
        place_id: str, 
        max_reviews: int = 100,
        sort_by: str = "newestFirst"
    ) -> Dict[str, Any]:
        """
        Fetch all reviews for a Google Place ID
        
        Args:
            place_id: Google Place ID (e.g., ChIJN1t_tDeuEmsRUsoyG83frY4)
            max_reviews: Maximum number of reviews to fetch
            sort_by: Sort order - "newestFirst", "highestRating", "lowestRating", "mostRelevant"
            
        Returns:
            Dict with reviews and metadata
        """
        reviews = []
        next_page_token = None
        place_info = {}
        
        logger.info(f"[SerpAPI] Fetching reviews for place: {place_id}")
        
        try:
            while len(reviews) < max_reviews:
                # Build request params
                params = {
                    "engine": "google_maps_reviews",
                    "place_id": place_id,
                    "api_key": self.api_key,
                    "hl": "en",  # Language
                    "sort_by": sort_by,
                }
                
                if next_page_token:
                    params["next_page_token"] = next_page_token
                
                # Make request
                response = requests.get(SERPAPI_BASE_URL, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                # Check for errors
                if "error" in data:
                    logger.error(f"[SerpAPI] Error: {data['error']}")
                    break
                
                # Extract place info (first page only)
                if not place_info and "place_info" in data:
                    place_info = data["place_info"]
                    logger.info(f"[SerpAPI] Place: {place_info.get('title', 'Unknown')} - {place_info.get('reviews', 0)} total reviews")
                
                # Extract reviews
                page_reviews = data.get("reviews", [])
                if not page_reviews:
                    logger.info("[SerpAPI] No more reviews found")
                    break
                
                for review_data in page_reviews:
                    if len(reviews) >= max_reviews:
                        break
                    
                    review = self._parse_review(review_data, place_id)
                    if review:
                        reviews.append(review)
                
                logger.info(f"[SerpAPI] Fetched {len(reviews)} reviews so far...")
                
                # Check for next page
                next_page_token = data.get("serpapi_pagination", {}).get("next_page_token")
                if not next_page_token:
                    logger.info("[SerpAPI] No more pages")
                    break
                    
        except requests.exceptions.RequestException as e:
            logger.error(f"[SerpAPI] Request error: {e}")
            return {
                'success': False,
                'error': str(e),
                'reviews': [r.to_dict() for r in reviews]
            }
        except Exception as e:
            logger.error(f"[SerpAPI] Error: {e}")
            return {
                'success': False,
                'error': str(e),
                'reviews': [r.to_dict() for r in reviews]
            }
        
        return {
            'success': True,
            'place_id': place_id,
            'place_name': place_info.get('title'),
            'place_address': place_info.get('address'),
            'place_rating': place_info.get('rating'),
            'total_reviews_on_google': place_info.get('reviews', 0),
            'reviews': [r.to_dict() for r in reviews],
            'reviews_fetched': len(reviews),
            'method': 'serpapi',
            'note': f'Retrieved {len(reviews)} reviews via SerpAPI'
        }
    
    def _parse_review(self, data: Dict[str, Any], place_id: str) -> Optional[SerpApiReview]:
        """Parse a review from SerpAPI response"""
        try:
            # Generate unique ID
            review_id = data.get('review_id') or f"serp-{place_id}-{hash(str(data))}"
            
            # Get user info
            user = data.get('user', {})
            reviewer_name = user.get('name', 'Anonymous')
            avatar_url = user.get('thumbnail')
            
            # Get rating
            rating = data.get('rating', 0)
            
            # Get review text (snippet or full)
            review_text = data.get('snippet', '') or data.get('extracted_snippet', {}).get('original', '')
            
            # Get date
            review_date = data.get('iso_date') or data.get('date', '')
            if not review_date:
                review_date = datetime.utcnow().isoformat()
            
            relative_time = data.get('date')  # e.g., "2 weeks ago"
            
            return SerpApiReview(
                platform_review_id=str(review_id),
                reviewer_name=reviewer_name,
                reviewer_avatar_url=avatar_url,
                rating=rating,
                review_text=review_text,
                review_date=review_date,
                relative_time=relative_time
            )
        except Exception as e:
            logger.debug(f"[SerpAPI] Error parsing review: {e}")
            return None


def is_serpapi_configured() -> bool:
    """Check if SerpAPI is configured"""
    return bool(os.environ.get('SERPAPI_API_KEY'))









