import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "recovery_sentinel.db"


def get_connection():
    DB_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    conn.execute(
        "PRAGMA foreign_keys = ON"
    )

    initialize_database(conn)

    return conn


def initialize_database(conn=None):
    owns_connection = conn is None

    if owns_connection:
        DB_PATH.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row

        conn.execute(
            "PRAGMA foreign_keys = ON"
        )

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            route TEXT NOT NULL,
            detected_at TEXT NOT NULL,
            baseline_success_rate REAL NOT NULL,
            observed_success_rate REAL NOT NULL,
            diagnosis TEXT,
            status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            amount INTEGER NOT NULL,
            method TEXT NOT NULL,
            route TEXT NOT NULL,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL,
            decline_reason TEXT,
            incident_id TEXT,
            retry_count INTEGER DEFAULT 0,
            recoverable INTEGER DEFAULT 0,
            ground_truth_action TEXT,
            FOREIGN KEY (incident_id)
                REFERENCES incidents(id)
        );

        CREATE TABLE IF NOT EXISTS recovery_actions (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            action TEXT NOT NULL,
            validated INTEGER NOT NULL DEFAULT 0,
            idempotency_key TEXT UNIQUE NOT NULL,
            executed_at TEXT,
            outcome TEXT,
            FOREIGN KEY (transaction_id)
                REFERENCES transactions(id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            transaction_id TEXT,
            incident_id TEXT,
            event TEXT NOT NULL,
            actor TEXT NOT NULL,
            details TEXT
        );

        CREATE TABLE IF NOT EXISTS escalation_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            amount INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            resolved INTEGER DEFAULT 0,
            FOREIGN KEY (transaction_id)
                REFERENCES transactions(id)
        );
        """
    )

    conn.commit()

    if owns_connection:
        conn.close()


if __name__ == "__main__":
    initialize_database()
    print(f"Database created at: {DB_PATH}")
