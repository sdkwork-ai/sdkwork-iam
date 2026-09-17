from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamTenantApplicationManagementUpdateCommand:
    """Update operator-managed tenant application domain and access permissions."""
    primary_domain: Optional[str] = None
    access_permissions: Optional[List[str]] = None
