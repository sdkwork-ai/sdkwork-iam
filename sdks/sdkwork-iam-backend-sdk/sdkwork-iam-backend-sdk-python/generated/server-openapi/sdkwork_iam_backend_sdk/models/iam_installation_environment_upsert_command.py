from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class IamInstallationEnvironmentUpsertCommand:
    """Idempotent registration of one environment. The path environmentKey is authoritative; an explicit body value must match it. Omitted status keeps the stored status on update and defaults to pending on insert."""
    environment_key: Optional[str] = None
    primary_domain: Optional[str] = None
    domain_config: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
