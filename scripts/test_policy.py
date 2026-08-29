from backend.database import get_connection
from backend.policy import validate_action


conn = get_connection()

transaction = conn.execute(
    """
    SELECT *
    FROM transactions
    WHERE incident_id IS NOT NULL
    AND status = 'failed'
    LIMIT 1
    """
).fetchone()

print("TRANSACTION:")
print(dict(transaction))

print("\nTEST 1 — Normal retry:")
print(
    validate_action(
        transaction,
        "RETRY",
        recovery_probability=0.85,
        intervention_cost=50,
    )
)

print("\nTEST 2 — Invalid action:")
print(
    validate_action(
        transaction,
        "REFUND_ALL",
        recovery_probability=0.85,
        intervention_cost=50,
    )
)

print("\nTEST 3 — Retry limit:")
retry_limit_tx = dict(transaction)
retry_limit_tx["retry_count"] = 2

print(
    validate_action(
        retry_limit_tx,
        "RETRY",
        recovery_probability=0.85,
        intervention_cost=50,
    )
)

print("\nTEST 4 — High value:")
high_value_tx = dict(transaction)
high_value_tx["amount"] = 60_000

print(
    validate_action(
        high_value_tx,
        "RETRY",
        recovery_probability=0.85,
        intervention_cost=50,
    )
)

print("\nTEST 5 — Negative expected value:")
print(
    validate_action(
        transaction,
        "RETRY",
        recovery_probability=0.01,
        intervention_cost=50,
    )
)

conn.close()
