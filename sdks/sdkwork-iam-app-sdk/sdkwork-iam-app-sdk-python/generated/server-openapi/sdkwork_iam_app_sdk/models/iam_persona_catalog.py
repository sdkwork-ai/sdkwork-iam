from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .iam_persona_interest import IamPersonaInterest
    from .iam_persona_role import IamPersonaRole


@dataclass
class IamPersonaCatalog:
    """The selectable persona taxonomy with every active locale."""
    version: str
    roles: List[IamPersonaRole]
    interests: List[IamPersonaInterest]
