from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .iam_organization_member import IamOrganizationMember
    from .page_info import PageInfo


@dataclass
class IamOrganizationMemberListResponse:
    code: int
    data: Any
    trace_id: str
