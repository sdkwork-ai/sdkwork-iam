from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DesktopSessionsCreateRequest:
    """Native-app exchange of a deep-link authorization code for a dual-token session."""
    client_id: str
    authorization_code: str
    code_verifier: str
    redirect_uri: str
    client_secret: Optional[str] = None
    device_id: Optional[str] = None
