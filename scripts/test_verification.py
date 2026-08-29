from backend.database import get_connection
from backend.verifier import verify_recovery
from backend.audit import log_event


transaction_id = "TXN_0282"

log_event(
    event="RECOVERY_EXECUTED",
    actor="executor",
    transaction_id=transaction_id,
    incident_id="INC-001",
    details="Retry executed successfully.",
)

result = verify_recovery(transaction_id)

print("VERIFICATION:")
print(result)

conn = get_connection()

logs = conn.execute(
    """
    SELECT *
    FROM audit_logs
    WHERE transaction_id = ?
    ORDER BY id
    """,
    (transaction_id,),
).fetchall()

print("\nAUDIT LOG:")
for log in logs:
    print(dict(log))

conn.close()
