from backend.database import get_connection
from backend.diagnosis import diagnose_incident
from backend.action_proposer import get_category_action
from backend.value_gate import calculate_expected_value
from backend.policy import validate_action
from backend.executor import execute_recovery
from backend.verifier import verify_recovery
from backend.audit import log_event
from backend.route_protection import evaluate_route_shift


INTERVENTION_COST = 50


def add_escalation(transaction, incident_id, reason):
    conn = get_connection()

    conn.execute(
        """
        INSERT INTO escalation_queue (
            transaction_id,
            reason,
            amount,
            created_at,
            resolved
        )
        VALUES (?, ?, ?, datetime('now'), 0)
        """,
        (
            transaction["id"],
            reason,
            transaction["amount"],
        ),
    )

    conn.commit()
    conn.close()

    log_event(
        event="ESCALATED",
        actor="validator",
        transaction_id=transaction["id"],
        incident_id=incident_id,
        details=reason,
    )


def stop_transaction(transaction, incident_id, reason):
    conn = get_connection()

    conn.execute(
        """
        UPDATE transactions
        SET status = 'stopped'
        WHERE id = ?
        """,
        (transaction["id"],),
    )

    conn.commit()
    conn.close()

    log_event(
        event="STOPPED",
        actor="validator",
        transaction_id=transaction["id"],
        incident_id=incident_id,
        details=reason,
    )


def run_pipeline():
    conn = get_connection()

    # ---------------------------------------------------------
    # 1. Find active incident
    # ---------------------------------------------------------

    incident = conn.execute(
        """
        SELECT *
        FROM incidents
        WHERE status = 'open'
        LIMIT 1
        """
    ).fetchone()

    if not incident:
        conn.close()
        print("No open incident found.")
        return

    # ---------------------------------------------------------
    # 2. Get affected failed transactions
    # ---------------------------------------------------------

    transactions = conn.execute(
        """
        SELECT *
        FROM transactions
        WHERE incident_id = ?
          AND status = 'failed'
        ORDER BY created_at ASC
        """,
        (incident["id"],),
    ).fetchall()

    conn.close()

    print("=" * 60)
    print("RECOVERY SENTINEL PIPELINE")
    print("=" * 60)
    print(f"Incident: {incident['id']}")
    print(f"Route: {incident['route']}")
    print(f"Affected transactions: {len(transactions)}")
    print()

    # ---------------------------------------------------------
    # 3. Protect future traffic
    # ---------------------------------------------------------

    route_protection = evaluate_route_shift(
        incident["route"],
        incident["observed_success_rate"],
    )

    print("ROUTE PROTECTION:")
    print(route_protection)
    print()

    if route_protection["action"] == "SHIFT_ROUTE":
        log_event(
            event="ROUTE_SHIFT",
            actor="route_guardian",
            incident_id=incident["id"],
            details=(
                f"{route_protection['from_route']} → "
                f"{route_protection['to_route']} "
                f"for {route_protection['duration_minutes']} min"
            ),
        )

        print(
            f"Future traffic protected: "
            f"{route_protection['from_route']} → "
            f"{route_protection['to_route']}"
        )

    elif route_protection["action"] == "ESCALATE":
        log_event(
            event="ROUTE_PROTECTION_ESCALATED",
            actor="route_guardian",
            incident_id=incident["id"],
            details=route_protection["reason"],
        )

        print(
            f"Route protection escalated: "
            f"{route_protection['reason']}"
        )

    # ---------------------------------------------------------
    # 4. Diagnose incident once
    # ---------------------------------------------------------

    diagnosis = diagnose_incident(
        incident,
        transactions,
    )

    print("INCIDENT DIAGNOSIS:")
    print(diagnosis)
    print()

    log_event(
        event="INCIDENT_DIAGNOSED",
        actor="llm",
        incident_id=incident["id"],
        details=str(diagnosis),
    )

    # ---------------------------------------------------------
    # 5. Ask Gemini once per failure category
    # ---------------------------------------------------------

    category_actions = {}

    unique_failure_codes = sorted(
        {
            transaction["decline_reason"]
            for transaction in transactions
            if transaction["decline_reason"]
        }
    )

    print("CATEGORY DECISIONS:")

    for failure_code in unique_failure_codes:
        proposal = get_category_action(
            failure_code,
            incident,
        )

        category_actions[failure_code] = proposal

        print(
            f"{failure_code:25} → "
            f"{proposal.action:14} "
            f"(p={proposal.recovery_probability:.2f})"
        )

    print()

    # ---------------------------------------------------------
    # 6. Process affected transactions
    # ---------------------------------------------------------

    recovered_total = 0
    processed = 0
    stopped = 0
    escalated = 0
    executed = 0
    successful = 0

    for transaction in transactions:

        print("-" * 60)

        print(
            f"{transaction['id']} | "
            f"₹{transaction['amount']:,} | "
            f"{transaction['decline_reason']}"
        )

        failure_code = (
            transaction["decline_reason"]
            or "unknown"
        )

        proposal = category_actions.get(failure_code)

        # Safety fallback for an unexpected category.
        if proposal is None:
            proposal = get_category_action(
                failure_code,
                incident,
            )

        print(
            f"AI proposal: {proposal.action} "
            f"(probability={proposal.recovery_probability:.2f})"
        )

        # -----------------------------------------------------
        # 6A. Expected value
        # -----------------------------------------------------

        expected_value = calculate_expected_value(
            transaction["amount"],
            proposal.recovery_probability,
            INTERVENTION_COST,
        )

        print(
            f"Expected value: ₹{expected_value:,.2f}"
        )

        # -----------------------------------------------------
        # 6B. Deterministic policy
        # -----------------------------------------------------

        policy_result = validate_action(
            transaction,
            proposal.action,
            proposal.recovery_probability,
            INTERVENTION_COST,
        )

        print(
            f"Policy: {policy_result['decision']} "
            f"→ {policy_result['final_action']}"
        )

        log_event(
            event="ACTION_VALIDATED",
            actor="validator",
            transaction_id=transaction["id"],
            incident_id=incident["id"],
            details=str(policy_result),
        )

        final_action = policy_result["final_action"]

        # -----------------------------------------------------
        # 6C. STOP
        # -----------------------------------------------------

        if final_action == "STOP":

            stop_transaction(
                transaction,
                incident["id"],
                policy_result["reason"],
            )

            stopped += 1
            processed += 1
            continue

        # -----------------------------------------------------
        # 6D. ESCALATE
        # -----------------------------------------------------

        if final_action == "ESCALATE":

            add_escalation(
                transaction,
                incident["id"],
                policy_result["reason"],
            )

            escalated += 1
            processed += 1
            continue

        # -----------------------------------------------------
        # 6E. Execute allowed recovery action
        # -----------------------------------------------------

        if final_action in {
            "RETRY",
            "PAYMENT_LINK",
        }:

            result = execute_recovery(
                transaction,
                final_action,
            )

            executed += 1

            print(
                f"Execution: {result['outcome']}"
            )

            # -------------------------------------------------
            # 6F. Verify
            # -------------------------------------------------

            verification = verify_recovery(
                transaction["id"]
            )

            print(
                f"Verified: {verification['verified']}"
            )

            if verification["verified"]:

                successful += 1

                recovered_total += (
                    verification["recovered_amount"]
                )

                log_event(
                    event="REVENUE_RECOVERED",
                    actor="verifier",
                    transaction_id=transaction["id"],
                    incident_id=incident["id"],
                    details=(
                        f"₹{verification['recovered_amount']:,} recovered"
                    ),
                )

            else:

                log_event(
                    event="RECOVERY_FAILED",
                    actor="verifier",
                    transaction_id=transaction["id"],
                    incident_id=incident["id"],
                    details=(
                        "Recovery action did not result "
                        "in verified payment."
                    ),
                )

            processed += 1
            continue

        # -----------------------------------------------------
        # 6G. Absolute safety fallback
        # -----------------------------------------------------

        add_escalation(
            transaction,
            incident["id"],
            "Unhandled action reached execution layer.",
        )

        escalated += 1
        processed += 1

    # ---------------------------------------------------------
    # 7. Final summary
    # ---------------------------------------------------------

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)

    print(f"Processed: {processed}")
    print(f"Actions executed: {executed}")
    print(f"Successful recoveries: {successful}")
    print(f"Stopped: {stopped}")
    print(f"Escalated: {escalated}")
    print(f"Revenue recovered: ₹{recovered_total:,}")


if __name__ == "__main__":
    run_pipeline()
