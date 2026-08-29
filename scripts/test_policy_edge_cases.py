from backend.database import get_connection
from backend.policy import validate_action


conn = get_connection()

base = conn.execute(
    """
    SELECT *
    FROM transactions
    WHERE incident_id IS NOT NULL
      AND status = 'failed'
    LIMIT 1
    """
).fetchone()

conn.close()

tx = dict(base)

print("=" * 60)
print("POLICY EDGE-CASE TESTS")
print("=" * 60)

# 1. Too many retries
retry_tx = dict(tx)
retry_tx["retry_count"] = 2

result = validate_action(
    retry_tx,
    "RETRY",
    0.90,
)

print("\n1. RETRY LIMIT")
print(result)

# 2. Non-recoverable transaction
unsafe_tx = dict(tx)
unsafe_tx["recoverable"] = 0

result = validate_action(
    unsafe_tx,
    "RETRY",
    0.95,
)

print("\n2. NON-RECOVERABLE")
print(result)

# 3. High-value transaction
high_value_tx = dict(tx)
high_value_tx["amount"] = 100_000

result = validate_action(
    high_value_tx,
    "RETRY",
    0.95,
)

print("\n3. HIGH VALUE")
print(result)
