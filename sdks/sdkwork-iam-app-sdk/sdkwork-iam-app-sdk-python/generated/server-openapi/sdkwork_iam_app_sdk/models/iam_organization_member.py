from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamOrganizationMember:
    """One member of an organization roster as IAM publishes it."""
    user_id: str
    membership_id: str
    membership_kind: str
    status: str
    is_primary: bool
    display_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
