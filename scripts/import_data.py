import pandas as pd

from backend.database import get_connection, initialize_database


CSV_PATH = "data/transactions.csv"


def import_transactions():
    initialize_database()

    df = pd.read_csv(CSV_PATH)

    conn = get_connection()

    # Clear existing demo data so re-running is safe.
    conn.execute("DELETE FROM recovery_actions")
    conn.execute("DELETE FROM audit_logs")
    conn.execute("DELETE FROM escalation_queue")
    conn.execute("DELETE FROM transactions")
    conn.execute("DELETE FROM incidents")

    for _, row in df.iterrows():
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
                row["transaction_id"],
                int(row["amount"]),
                row["payment_method"],
                row["route"],
                row["timestamp"],
                row["status"],
                row["failure_code"] if pd.notna(row["failure_code"]) else None,
                int(row["recoverable"]),
                row["ground_truth_action"]
                if pd.notna(row["ground_truth_action"])
                else None,
                int(row["attempt_count"]),
            ),
        )

    conn.commit()

    count = conn.execute(
        "SELECT COUNT(*) AS count FROM transactions"
    ).fetchone()["count"]

    conn.close()

    print(f"Imported {count} transactions.")


if __name__ == "__main__":
    import_transactions()
