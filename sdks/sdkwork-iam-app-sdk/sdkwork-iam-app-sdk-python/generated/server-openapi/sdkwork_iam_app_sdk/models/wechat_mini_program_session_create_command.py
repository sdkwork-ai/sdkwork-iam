from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class WechatMiniProgramSessionCreateCommand:
    """One-time WeChat Mini Program login-code exchange command."""
    js_code: str
    phone_code: Optional[str] = None
    provider_code: Optional[str] = None
    surface_code: Optional[str] = None
    device_id: Optional[str] = None
