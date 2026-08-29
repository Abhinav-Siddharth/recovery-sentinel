from backend.database import get_connection
from backend.policy import validate_action


def get_transaction():
    conn = get_connection()

    tx = conn.execute(
        """
        SELECT *
        FROM transactions
        WHERE incident_id IS NOT NULL
        LIMIT 1
        """
    ).fetchone()

    conn.close()

    return dict(tx) if tx else None


def scenario_normal(tx):
    print("=" * 70)
    print("SCENARIO 1 — NORMAL RECOVERY")
    print("=" * 70)

    result = validate_action(
        tx,
        proposed_action="RETRY",
        recovery_probability=0.85,
        intervention_cost=50,
    )

    print("AI proposal: RETRY")
    print("Policy:", result["decision"])
    print("Final action:", result["final_action"])
    print("Expected value:", result.get("expected_value"))
    print()


def scenario_unsafe(tx):
    print("=" * 70)
    print("SCENARIO 2 — UNSAFE ACTION BLOCKED")
    print("=" * 70)

    unsafe_tx = dict(tx)
    unsafe_tx["recoverable"] = 0

    result = validate_action(
        unsafe_tx,
        proposed_action="RETRY",
        recovery_probability=0.95,
        intervention_cost=50,
    )

    print("AI proposal: RETRY")
    print("Transaction: NON-RECOVERABLE")
    print("Policy:", result["decision"])
    print("Final action:", result["final_action"])
    print("Reason:", result["reason"])
    print()


def scenario_high_value(tx):
    print("=" * 70)
    print("SCENARIO 3 — HIGH VALUE ESCALATION")
    print("=" * 70)

    high_value_tx = dict(tx)
    high_value_tx["amount"] = 100_000

    result = validate_action(
        high_value_tx,
        proposed_action="RETRY",
        recovery_probability=0.95,
        intervention_cost=50,
    )

    print("AI proposal: RETRY")
    print("Transaction amount: ₹100,000")
    print("Policy:", result["decision"])
    print("Final action:", result["final_action"])
    print("Reason:", result["reason"])
    print()


def main():
    tx = get_transaction()

    if not tx:
        print("No incident transaction found.")
        return

    scenario_normal(tx)
    scenario_unsafe(tx)
    scenario_high_value(tx)

    print("=" * 70)
    print("DEMO SCENARIOS COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
