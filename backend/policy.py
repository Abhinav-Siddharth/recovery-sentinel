from backend.value_gate import calculate_expected_value


ALLOWED_ACTIONS = {
    "RETRY",
    "PAYMENT_LINK",
    "STOP",
    "ESCALATE",
}

MAX_RETRIES = 2
HIGH_VALUE_THRESHOLD = 50_000

ACTION_COSTS = {
    "RETRY": 50,
    "PAYMENT_LINK": 10,
    "STOP": 0,
    "ESCALATE": 0,
}


def validate_action(
    transaction,
    proposed_action,
    recovery_probability,
    intervention_cost=None,
):
    amount = transaction["amount"]
    retry_count = transaction["retry_count"]
    status = transaction["status"]
    recoverable = transaction["recoverable"]

    if proposed_action not in ALLOWED_ACTIONS:
        return {
            "decision": "BLOCK",
            "final_action": "ESCALATE",
            "reason": "Action is outside the approved action space.",
        }

    if status == "success":
        return {
            "decision": "STOP",
            "final_action": "STOP",
            "reason": "Payment already succeeded.",
        }

    if recoverable == 0 and proposed_action in {
        "RETRY",
        "PAYMENT_LINK",
    }:
        return {
            "decision": "BLOCK",
            "final_action": "STOP",
            "reason": "Transaction is marked non-recoverable.",
        }

    if proposed_action == "RETRY" and retry_count >= MAX_RETRIES:
        return {
            "decision": "BLOCK",
            "final_action": "ESCALATE",
            "reason": "Maximum retry limit reached.",
        }

    if (
        amount >= HIGH_VALUE_THRESHOLD
        and proposed_action in {
            "RETRY",
            "PAYMENT_LINK",
        }
    ):
        return {
            "decision": "ESCALATE",
            "final_action": "ESCALATE",
            "reason": (
                "High-value transaction requires human review "
                "before autonomous recovery."
            ),
        }

    probability = max(
        0.0,
        min(1.0, float(recovery_probability)),
    )

    cost = ACTION_COSTS.get(
        proposed_action,
        intervention_cost if intervention_cost is not None else 50,
    )

    expected_value = calculate_expected_value(
        amount,
        probability,
        cost,
    )

    if expected_value <= 0:
        return {
            "decision": "STOP",
            "final_action": "STOP",
            "reason": (
                "Expected recovery value does not justify intervention."
            ),
            "expected_value": expected_value,
        }

    return {
        "decision": "ALLOW",
        "final_action": proposed_action,
        "reason": "All deterministic policy checks passed.",
        "expected_value": expected_value,
    }
