from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ServiceAccountCredentialCreateCommand:
    """Create a one-time-returned workload credential bound to a service account and tenant application."""
    tenant_application_id: str
    expires_at: Optional[str] = None
