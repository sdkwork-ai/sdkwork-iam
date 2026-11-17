from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .iam_user_persona import IamUserPersona


@dataclass
class IamUserPersonaResponse:
    code: int
    data: Any
    trace_id: str
