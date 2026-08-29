from backend.database import get_connection
from backend.diagnosis import diagnose_incident


conn = get_connection()

incident = conn.execute(
    "SELECT * FROM incidents LIMIT 1"
).fetchone()

transactions = conn.execute(
    """
    SELECT *
    FROM transactions
    WHERE incident_id = ?
    """,
    (incident["id"],),
).fetchall()

result = diagnose_incident(incident, transactions)

print("\nDIAGNOSIS:")
print(result)

conn.close()

