from backend.action_proposer import deterministic_fallback
from backend.database import get_connection
from backend.executor import execute_recovery
from backend.policy import validate_action


def make_transaction(
    *,
    tx_id="TEST_TXN",
    amount=2_000,
    retry_count=0,
    status="failed",
    recoverable=1,
    ground_truth_action="RETRY",
):
    return {
        "id": tx_id,
        "amount": amount,
        "method": "UPI",
        "route": "ROUTE_B",
        "created_at": "2026-08-30T00:00:00",
        "status": status,
        "decline_reason": "bank_technical_error",
        "incident_id": "INC-TEST",
        "retry_count": retry_count,
        "recoverable": recoverable,
        "ground_truth_action": ground_truth_action,
    }


def test_invalid_action():
    tx = make_transaction()

    result = validate_action(
        tx,
        "HACK",
        0.85,
    )

    assert result["decision"] == "BLOCK"
    assert result["final_action"] == "ESCALATE"

    print("PASS  invalid action → BLOCK → ESCALATE")


def test_already_paid():
    tx = make_transaction(
        status="success",
    )

    result = validate_action(
        tx,
        "RETRY",
        0.85,
    )

    assert result["decision"] == "STOP"
    assert result["final_action"] == "STOP"

    print("PASS  already paid → STOP")


def test_retry_limit():
    tx = make_transaction(
        retry_count=2,
    )

    result = validate_action(
        tx,
        "RETRY",
        0.85,
    )

    assert result["decision"] == "BLOCK"
    assert result["final_action"] == "ESCALATE"

    print("PASS  retry limit → BLOCK → ESCALATE")


def test_non_recoverable():
    tx = make_transaction(
        recoverable=0,
    )

    result = validate_action(
        tx,
        "RETRY",
        0.85,
    )

    assert result["decision"] == "BLOCK"
    assert result["final_action"] == "STOP"

    print("PASS  non-recoverable → BLOCK → STOP")


def test_high_value():
    tx = make_transaction(
        amount=100_000,
    )

    result = validate_action(
        tx,
        "RETRY",
        0.85,
    )

    assert result["decision"] == "ESCALATE"
    assert result["final_action"] == "ESCALATE"

    print("PASS  high-value → ESCALATE")


def test_negative_expected_value():
    tx = make_transaction(
        amount=10,
    )

    result = validate_action(
        tx,
        "RETRY",
        0.0,
    )

    assert result["decision"] == "STOP"
    assert result["final_action"] == "STOP"

    print("PASS  negative EV → STOP")


def test_unknown_failure_fallback():
    result = deterministic_fallback(
        "something_unknown",
    )

    assert result.action == "ESCALATE"
    assert result.recovery_probability == 0.0

    print("PASS  unknown failure → ESCALATE")


def test_gemini_failure_fallback():
    result = deterministic_fallback(
        "network_timeout",
    )

    assert result.action == "RETRY"
    assert result.recovery_probability == 0.85

    print("PASS  Gemini/API failure fallback → RETRY")


def test_duplicate_idempotency():
    tx = make_transaction(
        tx_id="TEST_DUPLICATE",
        retry_count=0,
        ground_truth_action="RETRY",
    )

    conn = get_connection()

    conn.execute(
        "DELETE FROM recovery_actions WHERE transaction_id = ?",
        (tx["id"],),
    )

    conn.execute(
        """
        DELETE FROM transactions
        WHERE id = ?
        """,
        (tx["id"],),
    )

    conn.execute(
        """
        INSERT INTO transactions (
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            tx["id"],
            tx["amount"],
            tx["method"],
            tx["route"],
            tx["created_at"],
            tx["status"],
            tx["decline_reason"],
            tx["recoverable"],
            tx["ground_truth_action"],
            tx["retry_count"],
        ),
    )

    conn.commit()
    conn.close()

    first = execute_recovery(
        tx,
        "RETRY",
    )

    second = execute_recovery(
        tx,
        "RETRY",
    )

    assert first["status"] == "EXECUTED"
    assert second["status"] == "BLOCKED"
    assert second["outcome"] == "DUPLICATE"

    conn = get_connection()

    conn.execute(
        "DELETE FROM recovery_actions WHERE transaction_id = ?",
        (tx["id"],),
    )

    conn.execute(
        "DELETE FROM transactions WHERE id = ?",
        (tx["id"],),
    )

    conn.commit()
    conn.close()

    print("PASS  duplicate attempt → BLOCKED")


def main():
    print("=" * 60)
    print("RECOVERY SENTINEL — SAFETY EDGE CASES")
    print("=" * 60)

    test_invalid_action()
    test_already_paid()
    test_retry_limit()
    test_non_recoverable()
    test_high_value()
    test_negative_expected_value()
    test_unknown_failure_fallback()
    test_gemini_failure_fallback()
    test_duplicate_idempotency()

    print()
    print("ALL SAFETY EDGE CASES PASSED")


if __name__ == "__main__":
    main()
