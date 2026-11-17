from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamUserPersonaUpdateCommand:
    """Full persona replacement; omitted interests mean an empty list."""
    role: Optional[str] = None
    interests: Optional[List[str]] = None
    prompt_dismissed: Optional[bool] = None
