from backend.database import get_connection
from backend.executor import execute_recovery
from backend.policy import validate_action


def main():
    conn = get_connection()

    # Create a recoverable transaction whose correct action is
    # PAYMENT_LINK. We deliberately attempt RETRY so the execution
    # fails and the retry counter can be exercised.
    conn.execute(
        """
        INSERT OR REPLACE INTO transactions (
            id,
            amount,
            method,
            route,
            created_at,
            status,
            decline_reason,
            recoverable,
            ground_truth_action,
            retry_count
        )
        VALUES (
            'TEST_RETRY_CAP',
            2000,
            'UPI',
            'ROUTE_B',
            datetime('now'),
            'failed',
            'bank_technical_error',
            1,
            'PAYMENT_LINK',
            0
        )
        """
    )

    conn.commit()
    conn.close()

    tx = {
        "id": "TEST_RETRY_CAP",
        "amount": 2000,
        "method": "UPI",
        "route": "ROUTE_B",
        "status": "failed",
        "decline_reason": "bank_technical_error",
        "recoverable": 1,
        "ground_truth_action": "PAYMENT_LINK",
        "retry_count": 0,
    }

    # ---------------------------------------------------------
    # Attempt 1
    # ---------------------------------------------------------

    first = execute_recovery(
        tx,
        "RETRY",
    )

    assert first["status"] == "EXECUTED"
    assert first["outcome"] == "FAILURE"

    conn = get_connection()

    retry_count = conn.execute(
        """
        SELECT retry_count
        FROM transactions
        WHERE id = 'TEST_RETRY_CAP'
        """
    ).fetchone()[0]

    conn.close()

    assert retry_count == 1

    print(
        "PASS  live failure increments retry_count"
    )

    # ---------------------------------------------------------
    # Attempt 2
    # ---------------------------------------------------------

    tx["retry_count"] = 1

    second = execute_recovery(
        tx,
        "RETRY",
    )

    assert second["status"] == "EXECUTED"
    assert second["outcome"] == "FAILURE"

    conn = get_connection()

    retry_count = conn.execute(
        """
        SELECT retry_count
        FROM transactions
        WHERE id = 'TEST_RETRY_CAP'
        """
    ).fetchone()[0]

    conn.close()

    assert retry_count == 2

    print(
        "PASS  second failure reaches retry_count=2"
    )

    # ---------------------------------------------------------
    # Attempt 3
    # ---------------------------------------------------------
    # The executor has already consumed the two allowed attempts.
    # The deterministic policy must now reject another RETRY.

    tx["retry_count"] = 2

    policy = validate_action(
        tx,
        "RETRY",
        0.85,
    )

    assert policy["decision"] == "BLOCK"
    assert policy["final_action"] == "ESCALATE"

    print(
        "PASS  third retry is blocked by policy"
    )

    # ---------------------------------------------------------
    # Cleanup
    # ---------------------------------------------------------

    conn = get_connection()

    conn.execute(
        """
        DELETE FROM recovery_actions
        WHERE transaction_id = 'TEST_RETRY_CAP'
        """
    )

    conn.execute(
        """
        DELETE FROM transactions
        WHERE id = 'TEST_RETRY_CAP'
        """
    )

    conn.commit()
    conn.close()

    print(
        "ALL RETRY CAP TESTS PASSED"
    )


if __name__ == "__main__":
    main()
