from backend.database import get_connection
from backend.executor import execute_recovery


conn = get_connection()

transaction = conn.execute(
    """
    SELECT *
    FROM transactions
    WHERE incident_id IS NOT NULL
      AND status = 'failed'
      AND ground_truth_action = 'RETRY'
    LIMIT 1
    """
).fetchone()

print("TRANSACTION:")
print(dict(transaction))

result = execute_recovery(transaction, "RETRY")

print("\nEXECUTION RESULT:")
print(result)

updated = conn.execute(
    """
    SELECT status, retry_count
    FROM transactions
    WHERE id = ?
    """,
    (transaction["id"],),
).fetchone()

print("\nUPDATED TRANSACTION:")
print(dict(updated))

conn.close()
