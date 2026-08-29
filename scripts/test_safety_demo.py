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

conn.close()

print("TRANSACTION:")
print(dict(transaction))

print("\nAI PROPOSAL:")
print("RETRY")

print("\nPOLICY DECISION:")

result = validate_action(
    transaction,
    proposed_action="RETRY",
    recovery_probability=0.90,
    intervention_cost=50,
)

print(result)

print("\nUNSAFE SCENARIO:")

unsafe_transaction = dict(transaction)
unsafe_transaction["recoverable"] = 0

unsafe_result = validate_action(
    unsafe_transaction,
    proposed_action="RETRY",
    recovery_probability=0.95,
    intervention_cost=50,
)

print(unsafe_result)

