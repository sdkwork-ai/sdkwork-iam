from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .iam_installation_environment import IamInstallationEnvironment
    from .page_info import PageInfo


@dataclass
class IamInstallationEnvironmentListResponse:
    code: int
    data: Any
    trace_id: str
