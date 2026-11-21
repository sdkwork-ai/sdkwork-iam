from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .iam_app_access_token import IamAppAccessToken


@dataclass
class IamAppAccessTokenResponse:
    code: int
    data: Any
    trace_id: str
