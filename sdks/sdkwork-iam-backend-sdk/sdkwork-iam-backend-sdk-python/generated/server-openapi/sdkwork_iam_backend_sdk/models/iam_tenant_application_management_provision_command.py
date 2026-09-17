from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamTenantApplicationManagementProvisionCommand:
    """Provision a registered application template for a tenant through an authenticated operator workflow."""
    organization_id: str
    instance_key: str
    display_name: str
    environment: str
    template_id: Optional[str] = None
    app_key: Optional[str] = None
    application_type: Optional[str] = None
    primary_domain: Optional[str] = None
    access_permissions: Optional[List[str]] = None
