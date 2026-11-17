from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .iam_installation_credential_with_secret import IamInstallationCredentialWithSecret


@dataclass
class IamInstallationCredentialResponse:
    code: int
    data: Any
    trace_id: str
