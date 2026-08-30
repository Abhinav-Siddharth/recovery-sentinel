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


def blind_retry_baseline():
    """
    Counterfactual baseline over the same affected transactions.

    Every affected transaction receives one blind retry attempt,
    with no diagnosis, value gate, policy validation, or escalation.
    Ground-truth labels determine whether that retry would recover.
    """

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            id,
            amount,
            recoverable,
            ground_truth_action
        FROM transactions
        WHERE incident_id IS NOT NULL
        ORDER BY created_at ASC
        """
    ).fetchall()

    conn.close()

    total = len(rows)

    revenue_at_risk = sum(
        row["amount"]
        for row in rows
    )

    successful = [
        row
        for row in rows
        if row["recoverable"] == 1
        and row["ground_truth_action"] == "RETRY"
    ]

    recovered_revenue = sum(
        row["amount"]
        for row in successful
    )

    unnecessary_attempts = total - len(successful)

    recovery_rate = (
        recovered_revenue / revenue_at_risk
        if revenue_at_risk
        else 0
    )

    return {
        "strategy": "BLIND_RETRY",
        "affected_transactions": total,
        "revenue_at_risk": revenue_at_risk,
        "revenue_recovered": recovered_revenue,
        "recovery_rate": recovery_rate,
        "attempts": total,
        "successful_recoveries": len(successful),
        "unnecessary_attempts": unnecessary_attempts,
    }


def evaluate_comparison():
    sentinel = evaluate_incident()
    baseline = blind_retry_baseline()

    sentinel_actions = sentinel["actions_executed"]
    baseline_attempts = baseline["attempts"]

    intervention_reduction = (
        (baseline_attempts - sentinel_actions)
        / baseline_attempts
        if baseline_attempts
        else 0
    )

    return {
        "sentinel": sentinel,
        "blind_retry": baseline,
        "revenue_advantage": (
            sentinel["revenue_recovered"]
            - baseline["revenue_recovered"]
        ),
        "intervention_reduction": intervention_reduction,
        "unnecessary_attempts_avoided": (
            baseline["unnecessary_attempts"]
        ),
    }
