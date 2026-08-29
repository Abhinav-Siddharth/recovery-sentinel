from backend.database import get_connection


def verify_recovery(transaction_id: str):
    conn = get_connection()

    transaction = conn.execute(
        """
        SELECT *
        FROM transactions
        WHERE id = ?
        """,
        (transaction_id,),
    ).fetchone()

    if not transaction:
        conn.close()
        return {
            "verified": False,
            "reason": "Transaction not found.",
        }

    verified = transaction["status"] == "recovered"

    result = {
        "verified": verified,
        "transaction_id": transaction_id,
        "status": transaction["status"],
        "recovered_amount": (
            transaction["amount"] if verified else 0
        ),
    }

    conn.close()
    return result

