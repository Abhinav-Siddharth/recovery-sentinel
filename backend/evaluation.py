from backend.database import get_connection


def evaluate_incident():
    conn = get_connection()

    total_affected = conn.execute(
        """
        SELECT COUNT(*)
        FROM transactions
        WHERE incident_id IS NOT NULL
        """
    ).fetchone()[0]

    total_at_risk = conn.execute(
        """
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE incident_id IS NOT NULL
        """
    ).fetchone()[0]

    recovered_amount = conn.execute(
        """
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE incident_id IS NOT NULL
          AND status = 'recovered'
        """
    ).fetchone()[0]

    recovered_count = conn.execute(
        """
        SELECT COUNT(*)
        FROM transactions
        WHERE incident_id IS NOT NULL
          AND status = 'recovered'
        """
    ).fetchone()[0]

    stopped_count = conn.execute(
        """
        SELECT COUNT(*)
        FROM transactions
        WHERE incident_id IS NOT NULL
          AND status = 'stopped'
        """
    ).fetchone()[0]

    escalated_count = conn.execute(
        """
        SELECT COUNT(*)
        FROM escalation_queue
        """
    ).fetchone()[0]

    actions_executed = conn.execute(
        """
        SELECT COUNT(*)
        FROM recovery_actions
        """
    ).fetchone()[0]

    # A recovery is counted only after verification changed
    # the transaction state to "recovered".
    verified_recoveries = conn.execute(
        """
        SELECT COUNT(*)
        FROM audit_logs
        WHERE event = 'REVENUE_RECOVERED'
        """
    ).fetchone()[0]

    recovery_rate = (
        recovered_amount / total_at_risk
        if total_at_risk
        else 0
    )

    unsafe_executions = conn.execute(
        """
        SELECT COUNT(*)
        FROM recovery_actions
        WHERE action NOT IN ('RETRY', 'PAYMENT_LINK')
        """
    ).fetchone()[0]

    conn.close()

    return {
        "affected_transactions": total_affected,
        "revenue_at_risk": total_at_risk,
        "revenue_recovered": recovered_amount,
        "recovery_rate": recovery_rate,
        "successful_recoveries": recovered_count,
        "verified_recoveries": verified_recoveries,
        "stopped": stopped_count,
        "escalated": escalated_count,
        "actions_executed": actions_executed,
        "unsafe_executions": unsafe_executions,
    }
