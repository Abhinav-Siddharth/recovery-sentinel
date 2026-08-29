from datetime import datetime, timedelta


MAX_SHIFT_MINUTES = 15


def evaluate_route_shift(
    route: str,
    observed_success_rate: float,
    minimum_success_rate: float = 0.80,
):
    """
    Deterministic route-protection policy.

    No LLM is allowed to decide routing.
    """

    if observed_success_rate >= minimum_success_rate:
        return {
            "allowed": False,
            "action": "NO_CHANGE",
            "reason": "Route is operating within safety threshold.",
        }

    if route == "ROUTE_B":
        expires_at = datetime.utcnow() + timedelta(
            minutes=MAX_SHIFT_MINUTES
        )

        return {
            "allowed": True,
            "action": "SHIFT_ROUTE",
            "from_route": "ROUTE_B",
            "to_route": "ROUTE_C",
            "duration_minutes": MAX_SHIFT_MINUTES,
            "expires_at": expires_at.isoformat(),
            "reason": (
                "Observed success rate is below the minimum "
                "safe routing threshold."
            ),
        }

    return {
        "allowed": False,
        "action": "ESCALATE",
        "reason": "No approved backup route configured.",
    }
