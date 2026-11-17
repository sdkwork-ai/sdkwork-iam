from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamUserPersona:
    """The caller persona. role is null until a role is chosen."""
    role: Optional[str]
    interests: List[str]
    prompt_dismissed: bool
    has_selection: bool
    catalog_version: Optional[str]
    updated_at: Optional[str]
