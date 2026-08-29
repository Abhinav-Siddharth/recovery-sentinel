from backend.database import get_connection


def reset_database():
    conn = get_connection()

    conn.execute("DELETE FROM recovery_actions")
    conn.execute("DELETE FROM audit_logs")
    conn.execute("DELETE FROM escalation_queue")

    conn.execute(
        """
        UPDATE transactions
        SET incident_id = NULL
        """
    )

    conn.execute("DELETE FROM incidents")

    conn.execute(
        """
        UPDATE transactions
        SET
            status = CASE
                WHEN decline_reason IS NULL OR decline_reason = ''
                THEN 'success'
                ELSE 'failed'
            END,
            retry_count = 0
        """
    )

    conn.commit()
    conn.close()
