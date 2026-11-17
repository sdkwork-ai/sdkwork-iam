from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamInstallationCredentialCreateCommand:
    """Creates the OAuth client of one environment. Omitted clientId is generated."""
    environment_key: str
    client_id: Optional[str] = None
    redirect_uris: Optional[List[str]] = None
    granted_scopes: Optional[List[str]] = None
