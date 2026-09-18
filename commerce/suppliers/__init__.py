"""
commerce/suppliers/__init__.py

Registry of available supplier adapters. Add a new supplier by writing
its adapter module (see artek.py -- Artek's official path is a manual
grid check, not this optional local CSV reader) and registering it here.
"""

from .artek import ArtekAdapter
from .base import NormalizedProduct, SupplierAdapter

ADAPTERS: dict[str, type[SupplierAdapter]] = {
    "artek": ArtekAdapter,
    # 'amazon': AmazonAdapter,          -- not built: no confirmed integration path yet
    # 'invertersrus': InvertersRUsAdapter,  -- not built: no dealer terms confirmed yet
}

__all__ = ["ADAPTERS", "NormalizedProduct", "SupplierAdapter", "ArtekAdapter"]
