from backend.database import get_connection


def execute_recovery(transaction, action):
    """
    Simulates a recovery action.

    In this prototype, no real money is moved.
    The outcome is determined by the synthetic ground truth.
    """

    transaction_id = transaction["id"]

    # Each execution attempt gets a unique transaction + attempt key.
    attempt_number = transaction["retry_count"] + 1
    idempotency_key = (
        f"{transaction_id}:{attempt_number}"
    )

    conn = get_connection()

    existing = conn.execute(
        """
        SELECT id
        FROM recovery_actions
        WHERE idempotency_key = ?
        """,
        (idempotency_key,),
    ).fetchone()

    if existing:
        conn.close()

        return {
            "status": "BLOCKED",
            "outcome": "DUPLICATE",
            "reason": "Action already executed.",
        }

    # Simulated outcome based on synthetic ground truth.
    if action == transaction["ground_truth_action"]:
        outcome = "SUCCESS"
        recovered_amount = transaction["amount"]
    else:
        outcome = "FAILURE"
        recovered_amount = 0

    action_id = (
        f"ACT-{transaction_id}-{attempt_number}"
    )

    conn.execute(
        """
        INSERT INTO recovery_actions (
            id,
            transaction_id,
            action,
            validated,
            idempotency_key,
            executed_at,
            outcome
        )
        VALUES (
            ?, ?, ?, ?, ?, datetime('now'), ?
        )
        """,
        (
            action_id,
            transaction_id,
            action,
            1,
            idempotency_key,
            outcome,
        ),
    )

    # IMPORTANT:
    # Every actual execution attempt increments retry_count,
    # including failed attempts. This makes the retry cap
    # reachable through the real recovery pipeline.
    if outcome == "SUCCESS":
        conn.execute(
            """
            UPDATE transactions
            SET status = 'recovered',
                retry_count = retry_count + 1
            WHERE id = ?
            """,
            (transaction_id,),
        )

    else:
        conn.execute(
            """
            UPDATE transactions
            SET retry_count = retry_count + 1
            WHERE id = ?
            """,
            (transaction_id,),
        )

    conn.commit()
    conn.close()

    return {
        "status": "EXECUTED",
        "outcome": outcome,
        "recovered_amount": recovered_amount,
        "action_id": action_id,
        "attempt_number": attempt_number,
    }
