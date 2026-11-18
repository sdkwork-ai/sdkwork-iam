from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamInstallationCredentialRotateCommand:
    """Rotates the active credential: the replacement becomes active with a new client id and secret, and the predecessor is kept as rotated history."""
    client_id: Optional[str] = None
