from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamPersonaRole:
    """One selectable persona role."""
    code: str
    sort_order: int
    labels: Dict[str, str]
    descriptions: Dict[str, str]
    iam_role_code: Optional[str] = None
