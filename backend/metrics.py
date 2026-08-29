from backend.database import get_connection


def calculate_metrics():
    conn = get_connection()

    revenue_at_risk = conn.execute(
        """
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM transactions
        WHERE incident_id IS NOT NULL
        """
    ).fetchone()["total"]

    revenue_recovered = conn.execute(
        """
        SELECT COALESCE(SUM(t.amount), 0) AS total
        FROM transactions t
        WHERE t.status = 'recovered'
          AND t.incident_id IS NOT NULL
        """
    ).fetchone()["total"]

    affected = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM transactions
        WHERE incident_id IS NOT NULL
        """
    ).fetchone()["total"]

    recovered_count = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM transactions
        WHERE status = 'recovered'
          AND incident_id IS NOT NULL
        """
    ).fetchone()["total"]

    stopped_count = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM transactions
        WHERE status = 'stopped'
          AND incident_id IS NOT NULL
        """
    ).fetchone()["total"]

    escalated_count = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM escalation_queue
        """
    ).fetchone()["total"]

    action_count = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM recovery_actions
        """
    ).fetchone()["total"]

    recovery_rate = (
        revenue_recovered / revenue_at_risk
        if revenue_at_risk
        else 0
    )

    conn.close()

    return {
        "revenue_at_risk": revenue_at_risk,
        "revenue_recovered": revenue_recovered,
        "recovery_rate": recovery_rate,
        "affected_transactions": affected,
        "successful_recoveries": recovered_count,
        "stopped": stopped_count,
        "escalated": escalated_count,
        "actions_executed": action_count,
    }
