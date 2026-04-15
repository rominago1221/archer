"""Attorney case access audit log. Required for attorney-client privilege trail."""
from datetime import datetime, timezone
from typing import Any
from db import db


async def log_attorney_access(
    attorney_id: str,
    assignment_id: str,
    action: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Log an attorney interaction with a case assignment.

    Actions used: viewed | accepted | declined | downloaded_doc | uploaded_letter
    Never raise — audit failure should not break user-facing flow, just log.
    """
    try:
        await db.attorney_case_access_log.insert_one({
            "attorney_id": attorney_id,
            "assignment_id": assignment_id,
            "action": action,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        import logging
        logging.getLogger(__name__).exception("audit log insert failed")
