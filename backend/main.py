from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.action_proposer import deterministic_fallback
from backend.database import get_connection
from backend.detector import detect_degradation
from backend.evaluation import evaluate_comparison
from backend.metrics import calculate_metrics
from backend.recovery_pipeline import run_pipeline
from backend.reset import reset_database


app = FastAPI(title="Recovery Sentinel API")


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "status": "ok"
    }


# ---------------------------------------------------------
# Incident
# ---------------------------------------------------------

@app.get("/api/incident")
def get_incident():
    conn = get_connection()

    incident = conn.execute(
        """
        SELECT *
        FROM incidents
        WHERE status = 'open'
        LIMIT 1
        """
    ).fetchone()

    if not incident:
        incident = conn.execute(
            """
            SELECT *
            FROM incidents
            ORDER BY rowid DESC
            LIMIT 1
            """
        ).fetchone()

    if not incident:
        conn.close()

        return {
            "incident": None,
            "affected_transactions": 0,
            "revenue_at_risk": 0,
        }

    affected = conn.execute(
        """
        SELECT
            COUNT(*) AS count,
            COALESCE(SUM(amount), 0) AS revenue_at_risk
        FROM transactions
        WHERE incident_id = ?
        """,
        (incident["id"],),
    ).fetchone()

    conn.close()

    return {
        "incident": dict(incident),
        "affected_transactions": affected["count"],
        "revenue_at_risk": affected["revenue_at_risk"],
    }


# ---------------------------------------------------------
# Metrics
# ---------------------------------------------------------

@app.get("/api/metrics")
def get_metrics():
    return calculate_metrics()


# ---------------------------------------------------------
# Evaluation
# ---------------------------------------------------------

@app.get("/api/evaluation")
def get_evaluation():
    return evaluate_comparison()


# ---------------------------------------------------------
# Transactions
# ---------------------------------------------------------

@app.get("/api/transactions")
def get_transactions():
    conn = get_connection()

    # Select only the most recent recovery action for each
    # transaction. This prevents multiple retry attempts from
    # producing duplicate rows in the dashboard.
    rows = conn.execute(
        """
        SELECT
            t.*,
            ra.action AS executed_action,
            ra.validated AS action_validated,
            ra.outcome AS action_outcome,
            ra.executed_at AS action_executed_at
        FROM transactions t
        LEFT JOIN recovery_actions ra
            ON ra.id = (
                SELECT r2.id
                FROM recovery_actions r2
                WHERE r2.transaction_id = t.id
                ORDER BY r2.executed_at DESC, r2.id DESC
                LIMIT 1
            )
        WHERE t.incident_id IS NOT NULL
        ORDER BY t.created_at ASC
        """
    ).fetchall()

    conn.close()

    transactions = []

    for row in rows:
        item = dict(row)

        failure_code = (
            item.get("decline_reason")
            or "unknown"
        )

        # -----------------------------------------------------
        # Explainability
        # -----------------------------------------------------
        # Use the SAME deterministic category policy as the
        # actual recovery pipeline. Gemini may provide
        # contextual reasoning, but it does not control the
        # executable category action.
        # -----------------------------------------------------

        proposal = deterministic_fallback(
            failure_code
        )

        item["ai_action"] = proposal.action

        item["ai_reason"] = (
            proposal.reason
        )

        item["recovery_probability"] = (
            proposal.recovery_probability
        )

        # -----------------------------------------------------
        # Expected-value estimate
        # -----------------------------------------------------

        item["expected_value"] = (
            item["amount"]
            * item["recovery_probability"]
        ) - 50

        # -----------------------------------------------------
        # Human-readable outcome
        # -----------------------------------------------------

        if item.get("status") == "recovered":

            item["outcome_label"] = (
                "RECOVERED"
            )

        elif item.get("status") == "stopped":

            item["outcome_label"] = (
                "STOPPED"
            )

        elif item.get("executed_action"):

            item["outcome_label"] = (
                item.get("action_outcome")
                or "EXECUTED"
            )

        else:

            item["outcome_label"] = (
                "ESCALATED"
            )

        transactions.append(item)

    return {
        "transactions": transactions
    }


# ---------------------------------------------------------
# Audit
# ---------------------------------------------------------

@app.get("/api/audit")
def get_audit():
    conn = get_connection()

    rows = conn.execute(
        """
        SELECT *
        FROM audit_logs
        ORDER BY id DESC
        LIMIT 100
        """
    ).fetchall()

    conn.close()

    return {
        "audit": [
            dict(row)
            for row in rows
        ]
    }


# ---------------------------------------------------------
# Detection
# ---------------------------------------------------------

@app.post("/api/detect")
def run_detection():
    incident_id = detect_degradation()

    return {
        "incident_id": incident_id,
        "detected": incident_id is not None,
    }


# ---------------------------------------------------------
# Reset / Replay
# ---------------------------------------------------------

@app.post("/api/reset")
def reset_demo():
    reset_database()

    incident_id = detect_degradation()

    conn = get_connection()

    incident = None

    affected = {
        "count": 0,
        "revenue_at_risk": 0,
    }

    if incident_id:

        incident = conn.execute(
            """
            SELECT *
            FROM incidents
            WHERE id = ?
            """,
            (incident_id,),
        ).fetchone()

        affected = conn.execute(
            """
            SELECT
                COUNT(*) AS count,
                COALESCE(SUM(amount), 0)
                    AS revenue_at_risk
            FROM transactions
            WHERE incident_id = ?
            """,
            (incident_id,),
        ).fetchone()

    conn.close()

    return {
        "incident_id": incident_id,
        "detected": incident_id is not None,
        "incident": (
            dict(incident)
            if incident
            else None
        ),
        "affected_transactions": (
            affected["count"]
            if affected
            else 0
        ),
        "revenue_at_risk": (
            affected["revenue_at_risk"]
            if affected
            else 0
        ),
    }


# ---------------------------------------------------------
# Recover
# ---------------------------------------------------------

@app.post("/api/recover")
def recover():
    run_pipeline()

    conn = get_connection()

    incident = conn.execute(
        """
        SELECT *
        FROM incidents
        ORDER BY rowid DESC
        LIMIT 1
        """
    ).fetchone()

    conn.close()

    metrics = calculate_metrics()

    return {
        "ok": True,
        "incident_id": (
            incident["id"]
            if incident
            else None
        ),
        "incident_status": (
            incident["status"]
            if incident
            else None
        ),
        "incident": (
            dict(incident)
            if incident
            else None
        ),
        "processed": (
            metrics["affected_transactions"]
        ),
        "actions_executed": (
            metrics["actions_executed"]
        ),
        "successful_recoveries": (
            metrics["successful_recoveries"]
        ),
        "stopped": (
            metrics["stopped"]
        ),
        "escalated": (
            metrics["escalated"]
        ),
        "revenue_recovered": (
            metrics["revenue_recovered"]
        ),
        "metrics": metrics,
    }


# ---------------------------------------------------------
# Safety demo
# ---------------------------------------------------------

@app.get("/api/safety-demo")
def safety_demo():
    return {
        "scenarios": [
            {
                "name": "invalid_action",
                "proposal": "INVALID",
                "policy": "BLOCK",
                "final_action": "ESCALATE",
            },
            {
                "name": "already_paid",
                "proposal": "RETRY",
                "policy": "STOP",
                "final_action": "STOP",
            },
            {
                "name": "retry_limit",
                "proposal": "RETRY",
                "policy": "BLOCK",
                "final_action": "ESCALATE",
            },
            {
                "name": "non_recoverable",
                "proposal": "RETRY",
                "policy": "BLOCK",
                "final_action": "STOP",
            },
            {
                "name": "high_value",
                "proposal": "RETRY",
                "policy": "ESCALATE",
                "final_action": "ESCALATE",
            },
            {
                "name": "negative_expected_value",
                "proposal": "RETRY",
                "policy": "STOP",
                "final_action": "STOP",
            },
            {
                "name": "unknown_failure",
                "proposal": "UNKNOWN",
                "policy": "ESCALATE",
                "final_action": "ESCALATE",
            },
            {
                "name": "duplicate_action",
                "first_execution": "EXECUTED",
                "second_execution": "BLOCKED",
            },
        ]
    }
