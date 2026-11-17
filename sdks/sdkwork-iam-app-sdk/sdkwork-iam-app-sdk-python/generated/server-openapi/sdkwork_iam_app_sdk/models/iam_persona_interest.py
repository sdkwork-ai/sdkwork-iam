from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamPersonaInterest:
    """One selectable interest direction."""
    code: str
    sort_order: int
    labels: Dict[str, str]
