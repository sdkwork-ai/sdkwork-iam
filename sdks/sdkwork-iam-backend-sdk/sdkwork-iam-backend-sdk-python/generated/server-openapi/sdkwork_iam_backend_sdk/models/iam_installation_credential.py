from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamInstallationCredential:
    """OAuth client metadata of one installation environment. The secret is write-only and is returned only by create/rotate."""
    credential_id: str
    tenant_id: str
    installation_environment_id: str
    environment_key: str
    client_id: str
    redirect_uris: List[str]
    granted_scopes: List[str]
    status: str
    created_at: str
    updated_at: str
    rotated_at: Optional[str] = None
    retired_at: Optional[str] = None
