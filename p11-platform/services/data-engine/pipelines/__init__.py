"""
P11 Data Engine - Marketing Data Pipelines

Available pipelines:
- meta_ads: Facebook/Instagram advertising data
- google_ads: Google Ads campaign data
- ga4: Google Analytics 4 website analytics
"""

from pipelines.meta_ads import run_pipeline as run_meta
from pipelines.google_ads import run_pipeline as run_google
from pipelines.ga4 import run_pipeline as run_ga4

__all__ = ['run_meta', 'run_google', 'run_ga4']

