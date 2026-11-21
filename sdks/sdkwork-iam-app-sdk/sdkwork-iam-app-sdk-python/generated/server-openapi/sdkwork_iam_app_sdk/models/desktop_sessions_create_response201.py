from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DesktopSessionsCreateResponse201:
    code: int
    trace_id: str
    data: Dict[str, Any]
