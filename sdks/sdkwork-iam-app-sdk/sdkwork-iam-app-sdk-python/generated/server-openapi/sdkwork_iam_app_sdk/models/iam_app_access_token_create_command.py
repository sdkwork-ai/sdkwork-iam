from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamAppAccessTokenCreateCommand:
    """Selectors for the application whose access credential is requested. Supply at least one; the tenant and the organization are derived from the authenticated session and the installation, never from this body."""
    app_id: Optional[str] = None
    installation_id: Optional[str] = None
    instance_key: Optional[str] = None
    environment: Optional[str] = None
    ownership_scope: Optional[str] = None
