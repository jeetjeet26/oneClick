"""
Property Classification & Matching System
Determines property class/tier and matches competitors by similarity
"""

import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class PropertyClass(Enum):
    """Property class tiers (A, B, C classification)"""
    CLASS_A = "A"       # Luxury, newest, premium amenities
    CLASS_B = "B"       # Mid-range, good condition
    CLASS_C = "C"       # Workforce, older, basic amenities
    UNKNOWN = "Unknown"


@dataclass
class PropertyProfile:
    """Profile of a property for comparison"""
    name: str
    property_class: PropertyClass
    year_built: Optional[int] = None
    units_count: Optional[int] = None
    avg_rent: Optional[float] = None  # Average rent across unit types
    amenity_score: float = 0.0  # 0-100 based on amenities
    rating: Optional[float] = None  # Google rating if available
    review_count: Optional[int] = None
    
    # Derived scores
    class_score: float = 50.0  # 0-100, higher = more luxurious


# Premium amenities that indicate Class A
LUXURY_AMENITIES = [
    'concierge', 'valet', 'rooftop', 'sky lounge', 'infinity pool',
    'wine cellar', 'private theater', 'spa', 'sauna', 'steam room',
    'golf simulator', 'pet spa', 'package lockers', 'electric car charging',
    'co-working', 'conference room', 'demonstration kitchen',
    'controlled access', 'gated', 'doorman', 'porter'
]

# Standard amenities (Class B)
STANDARD_AMENITIES = [
    'pool', 'gym', 'fitness', 'clubhouse', 'business center',
    'laundry', 'parking', 'garage', 'playground', 'dog park',
    'bbq', 'grill', 'patio', 'balcony', 'storage'
]

# Basic amenities (Class C often has just these)
BASIC_AMENITIES = [
    'laundry', 'parking', 'air conditioning', 'heating'
]


def classify_by_year(year_built: Optional[int]) -> float:
    """
    Score property based on year built
    
    Returns score 0-100 (higher = newer/better)
    """
    if not year_built:
        return 50.0  # Unknown, assume average
    
    current_year = 2025
    age = current_year - year_built
    
    if age <= 5:
        return 95.0  # Brand new
    elif age <= 10:
        return 85.0  # Very new
    elif age <= 15:
        return 70.0  # Modern
    elif age <= 25:
        return 55.0  # Established
    elif age <= 40:
        return 40.0  # Older
    else:
        return 25.0  # Very old


def classify_by_rent(avg_rent: Optional[float], city: str = "") -> float:
    """
    Score property based on average rent
    
    This is market-relative, but we use general thresholds
    Returns score 0-100
    """
    if not avg_rent:
        return 50.0  # Unknown
    
    # General US apartment rent thresholds (2025)
    # These would ideally be market-specific
    if avg_rent >= 3500:
        return 95.0  # Ultra luxury
    elif avg_rent >= 2500:
        return 85.0  # Luxury
    elif avg_rent >= 1800:
        return 70.0  # Upper mid-range
    elif avg_rent >= 1400:
        return 55.0  # Mid-range
    elif avg_rent >= 1000:
        return 40.0  # Affordable
    else:
        return 25.0  # Budget


def classify_by_amenities(amenities: List[str]) -> float:
    """
    Score property based on amenities
    
    Returns score 0-100
    """
    if not amenities:
        return 30.0  # No amenities listed
    
    amenities_lower = [a.lower() for a in amenities]
    amenities_text = ' '.join(amenities_lower)
    
    luxury_count = sum(1 for a in LUXURY_AMENITIES if a in amenities_text)
    standard_count = sum(1 for a in STANDARD_AMENITIES if a in amenities_text)
    
    # Weight luxury amenities more
    score = (luxury_count * 8) + (standard_count * 3)
    
    # Cap at 100
    return min(score, 100.0)


def classify_by_google_signals(
    rating: Optional[float],
    review_count: Optional[int]
) -> float:
    """
    Score property based on Google Places signals
    
    Higher ratings and more reviews often correlate with 
    better-managed, higher-class properties
    
    Returns score 0-100
    """
    score = 50.0  # Base score
    
    if rating:
        # Rating contribution (4.5+ is excellent)
        if rating >= 4.5:
            score += 25
        elif rating >= 4.0:
            score += 15
        elif rating >= 3.5:
            score += 5
        elif rating < 3.0:
            score -= 15
    
    if review_count:
        # Review count contribution (established properties have more)
        if review_count >= 500:
            score += 15
        elif review_count >= 200:
            score += 10
        elif review_count >= 50:
            score += 5
        elif review_count < 10:
            score -= 5
    
    return max(0, min(100, score))


def calculate_class_score(
    year_built: Optional[int] = None,
    avg_rent: Optional[float] = None,
    amenities: Optional[List[str]] = None,
    rating: Optional[float] = None,
    review_count: Optional[int] = None,
    city: str = ""
) -> float:
    """
    Calculate overall class score for a property
    
    Returns weighted average score 0-100
    """
    scores = []
    weights = []
    
    # Year built (weight: 25%)
    year_score = classify_by_year(year_built)
    scores.append(year_score)
    weights.append(0.25 if year_built else 0.1)
    
    # Rent (weight: 30%)
    rent_score = classify_by_rent(avg_rent, city)
    scores.append(rent_score)
    weights.append(0.30 if avg_rent else 0.1)
    
    # Amenities (weight: 25%)
    amenity_score = classify_by_amenities(amenities or [])
    scores.append(amenity_score)
    weights.append(0.25 if amenities else 0.1)
    
    # Google signals (weight: 20%)
    google_score = classify_by_google_signals(rating, review_count)
    scores.append(google_score)
    weights.append(0.20 if rating else 0.1)
    
    # Normalize weights
    total_weight = sum(weights)
    normalized_weights = [w / total_weight for w in weights]
    
    # Weighted average
    final_score = sum(s * w for s, w in zip(scores, normalized_weights))
    
    return round(final_score, 1)


def score_to_class(score: float) -> PropertyClass:
    """Convert numeric score to property class"""
    if score >= 70:
        return PropertyClass.CLASS_A
    elif score >= 45:
        return PropertyClass.CLASS_B
    else:
        return PropertyClass.CLASS_C


def create_property_profile(
    name: str,
    year_built: Optional[int] = None,
    units_count: Optional[int] = None,
    avg_rent: Optional[float] = None,
    amenities: Optional[List[str]] = None,
    rating: Optional[float] = None,
    review_count: Optional[int] = None,
    city: str = ""
) -> PropertyProfile:
    """
    Create a property profile with classification
    
    Args:
        name: Property name
        year_built: Year the property was built
        units_count: Number of units
        avg_rent: Average rent across unit types
        amenities: List of amenities
        rating: Google rating (1-5)
        review_count: Number of Google reviews
        city: City name (for market-relative scoring)
        
    Returns:
        PropertyProfile with classification
    """
    class_score = calculate_class_score(
        year_built=year_built,
        avg_rent=avg_rent,
        amenities=amenities,
        rating=rating,
        review_count=review_count,
        city=city
    )
    
    property_class = score_to_class(class_score)
    amenity_score = classify_by_amenities(amenities or [])
    
    return PropertyProfile(
        name=name,
        property_class=property_class,
        year_built=year_built,
        units_count=units_count,
        avg_rent=avg_rent,
        amenity_score=amenity_score,
        rating=rating,
        review_count=review_count,
        class_score=class_score
    )


def calculate_similarity(
    subject: PropertyProfile,
    competitor: PropertyProfile
) -> float:
    """
    Calculate similarity score between two properties
    
    Returns score 0-100 (higher = more similar)
    """
    scores = []
    
    # Class score similarity (most important)
    class_diff = abs(subject.class_score - competitor.class_score)
    class_similarity = max(0, 100 - class_diff * 2)  # 50 point diff = 0% similarity
    scores.append(('class', class_similarity, 0.40))
    
    # Year built similarity
    if subject.year_built and competitor.year_built:
        year_diff = abs(subject.year_built - competitor.year_built)
        year_similarity = max(0, 100 - year_diff * 3)  # 33 year diff = 0%
        scores.append(('year', year_similarity, 0.20))
    
    # Units count similarity (size matters for competition)
    if subject.units_count and competitor.units_count:
        larger = max(subject.units_count, competitor.units_count)
        smaller = min(subject.units_count, competitor.units_count)
        size_ratio = smaller / larger
        size_similarity = size_ratio * 100
        scores.append(('size', size_similarity, 0.15))
    
    # Rating similarity
    if subject.rating and competitor.rating:
        rating_diff = abs(subject.rating - competitor.rating)
        rating_similarity = max(0, 100 - rating_diff * 40)  # 2.5 diff = 0%
        scores.append(('rating', rating_similarity, 0.15))
    
    # Amenity score similarity
    amenity_diff = abs(subject.amenity_score - competitor.amenity_score)
    amenity_similarity = max(0, 100 - amenity_diff)
    scores.append(('amenity', amenity_similarity, 0.10))
    
    # Calculate weighted average
    total_weight = sum(weight for _, _, weight in scores)
    similarity = sum(score * weight for _, score, weight in scores) / total_weight
    
    logger.debug(
        f"Similarity {subject.name} vs {competitor.name}: "
        f"{similarity:.1f}% - {[(n, f'{s:.0f}') for n, s, _ in scores]}"
    )
    
    return round(similarity, 1)


def filter_by_similarity(
    subject: PropertyProfile,
    competitors: List[PropertyProfile],
    min_similarity: float = 50.0
) -> List[tuple]:
    """
    Filter competitors by similarity to subject property
    
    Args:
        subject: The subject property profile
        competitors: List of competitor profiles
        min_similarity: Minimum similarity score (0-100) to include
        
    Returns:
        List of (competitor, similarity_score) tuples, sorted by similarity
    """
    results = []
    
    for competitor in competitors:
        similarity = calculate_similarity(subject, competitor)
        
        if similarity >= min_similarity:
            results.append((competitor, similarity))
        else:
            logger.info(
                f"Filtered out {competitor.name} - similarity {similarity:.1f}% "
                f"(below {min_similarity}% threshold)"
            )
    
    # Sort by similarity descending
    results.sort(key=lambda x: x[1], reverse=True)
    
    return results

