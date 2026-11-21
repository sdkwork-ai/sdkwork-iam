from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamAppAccessToken:
    """Signed application access credential. It is a session-class credential: it expires after one hour and can be revoked like any other IAM session."""
    access_token: str
    auth_token: str
    expires_at: str
    app_id: str
    installation_id: str
    ownership_scope: str
    organization_id: Optional[str] = None
    session_id: Optional[str] = None
    environment: Optional[str] = None
