from datetime import datetime

from backend.database import get_connection


def log_event(
    event: str,
    actor: str,
    transaction_id: str | None = None,
    incident_id: str | None = None,
    details: str | None = None,
):
    conn = get_connection()

    conn.execute(
        """
        INSERT INTO audit_logs (
            timestamp,
            transaction_id,
            incident_id,
            event,
            actor,
            details
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.utcnow().isoformat(),
            transaction_id,
            incident_id,
            event,
            actor,
            details,
        ),
    )

    conn.commit()
    conn.close()
