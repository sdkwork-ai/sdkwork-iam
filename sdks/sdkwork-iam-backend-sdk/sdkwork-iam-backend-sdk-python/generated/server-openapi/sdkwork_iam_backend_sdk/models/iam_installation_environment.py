from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamInstallationEnvironment:
    """One lifecycle environment registered for an installation."""
    environment_id: str
    tenant_id: str
    installation_id: str
    environment_key: str
    status: str
    created_at: str
    updated_at: str
    organization_id: Optional[str] = None
    primary_domain: Optional[str] = None
    domain_config: Optional[Dict[str, Any]] = None
