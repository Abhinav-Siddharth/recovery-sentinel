from backend.database import initialize_database, get_connection
from backend.detector import detect_degradation
from scripts.import_data import import_transactions


def main():
    print("=" * 50)
    print("RECOVERY SENTINEL — DEMO SETUP")
    print("=" * 50)

    initialize_database()

    print("\nImporting synthetic transactions...")
    import_transactions()

    print("\nRunning degradation detector...")

    incident_id = detect_degradation()

    if incident_id:
        print(
            f"DEGRADATION DETECTED: {incident_id}"
        )
    else:
        print(
            "No degradation detected."
        )

    conn = get_connection()

    count = conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM transactions
        """
    ).fetchone()["count"]

    conn.close()

    print(
        f"\nTransactions loaded: {count}"
    )

    print("\nDemo setup complete.")


if __name__ == "__main__":
    main()
