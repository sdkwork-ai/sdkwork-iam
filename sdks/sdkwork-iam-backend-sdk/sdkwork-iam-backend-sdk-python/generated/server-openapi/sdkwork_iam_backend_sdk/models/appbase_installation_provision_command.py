from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AppbaseInstallationProvisionCommand:
    """Provision a tenant installation from the deploy application it serves plus explicit attributes. Application templates are retired, so no template reference is accepted."""
    tenant_id: str
    organization_id: str
    instance_key: str
    display_name: str
    environment: str
    application_type: str
    auth_token: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    primary_domain: Optional[str] = None
    access_permissions: Optional[List[str]] = None
    runtime_config: Optional[Dict[str, Any]] = None
    deploy_application_id: Optional[str] = None
    ownership_scope: Optional[str] = None
    owner_user_id: Optional[str] = None
    provisioning_idempotency_key: Optional[str] = None
