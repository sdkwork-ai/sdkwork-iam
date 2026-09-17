from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ServiceAccountTokenExchangeCommand:
    """Exchange a workload client credential for short-lived tenant-bound dual tokens."""
    client_id: str
    client_secret: str
