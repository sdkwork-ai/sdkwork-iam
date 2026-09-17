from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamOauthClientCreateCommand:
    """Tenant-scoped OAuth provider client registration command."""
    integration_id: str
    provider_code: str
    client_code: str
    display_name: str
    provider_client_id: str
    provider_tenant_id: Optional[str] = None
