from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OauthPhoneBindingSessionCreateCommand:
    """Completes a pending OAuth account association after the person proved ownership of the phone. Answered with the standard session payload, or with the `LOGIN_CONTEXT_SELECTION` challenge for an account that belongs to several organizations."""
    continuation_token: str
    phone: str
    verification_code: str
    surface_code: Optional[str] = None
    device_id: Optional[str] = None
