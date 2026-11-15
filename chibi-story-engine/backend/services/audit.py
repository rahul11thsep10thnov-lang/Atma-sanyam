from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

from ..models import AuditLog

log = logging.getLogger("csae.audit")


def record(session: Session, user_id: uuid.UUID | None, action: str, entity_type: str, entity_id: Any, **details: Any) -> None:
    session.add(AuditLog(user_id=user_id, action=action, entity_type=entity_type, entity_id=str(entity_id), details=details))
    log.info(action, extra={"entity_type": entity_type, "entity_id": str(entity_id), "user_id": str(user_id) if user_id else None})
