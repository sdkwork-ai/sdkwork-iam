from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamTenantApplicationManagementProvisionCommand:
    """Provision a tenant installation from the deploy application it serves plus explicit attributes, through an authenticated operator workflow. Application templates are retired, so no template reference is accepted."""
    organization_id: str
    instance_key: str
    display_name: str
    environment: str
    application_type: str
    primary_domain: Optional[str] = None
    access_permissions: Optional[List[str]] = None
    runtime_config: Optional[Dict[str, Any]] = None
    deploy_application_id: Optional[str] = None
    ownership_scope: Optional[str] = None
    owner_user_id: Optional[str] = None
    provisioning_idempotency_key: Optional[str] = None
