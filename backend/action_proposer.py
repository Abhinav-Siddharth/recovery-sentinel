import json
import os
from typing import Literal

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel


load_dotenv()


class CategoryAction(BaseModel):
    action: Literal[
        "RETRY",
        "PAYMENT_LINK",
        "STOP",
        "ESCALATE",
    ]
    recovery_probability: float
    reason: str


# ---------------------------------------------------------
# Deterministic category policy
# ---------------------------------------------------------
# Gemini can provide diagnosis/contextual reasoning, but
# executable recovery behavior remains deterministic.
# This prevents model drift from changing financial behavior.
# ---------------------------------------------------------

CATEGORY_POLICY = {
    "bank_technical_error": {
        "action": "RETRY",
        "probability": 0.85,
        "reason": (
            "Temporary bank technical failure is typically "
            "recoverable with a bounded retry."
        ),
    },

    "network_timeout": {
        "action": "RETRY",
        "probability": 0.85,
        "reason": (
            "A network timeout is treated as a transient "
            "failure and is eligible for a bounded retry."
        ),
    },

    "card_expired": {
        "action": "PAYMENT_LINK",
        "probability": 0.65,
        "reason": (
            "The existing payment instrument is invalid; "
            "a payment link allows the customer to use another method."
        ),
    },

    "mandate_cancelled": {
        "action": "PAYMENT_LINK",
        "probability": 0.65,
        "reason": (
            "The mandate is unavailable, so customer-directed "
            "payment recovery is safer than retrying."
        ),
    },

    "insufficient_funds": {
        "action": "PAYMENT_LINK",
        "probability": 0.65,
        "reason": (
            "Insufficient funds require customer action or "
            "an alternative payment method."
        ),
    },

    "risk_block": {
        "action": "STOP",
        "probability": 0.0,
        "reason": (
            "Risk-related failures must not be autonomously retried."
        ),
    },

    "issuer_declined": {
        "action": "ESCALATE",
        "probability": 0.15,
        "reason": (
            "Issuer declines are uncertain and are routed "
            "to human review rather than aggressive automation."
        ),
    },
}


def deterministic_fallback(
    failure_code: str,
) -> CategoryAction:

    policy = CATEGORY_POLICY.get(
        failure_code
    )

    if policy:
        return CategoryAction(
            action=policy["action"],
            recovery_probability=policy["probability"],
            reason=policy["reason"],
        )

    return CategoryAction(
        action="ESCALATE",
        recovery_probability=0.0,
        reason="Unknown or ambiguous failure type.",
    )


def get_gemini_suggestion(
    failure_code: str,
    incident=None,
) -> CategoryAction | None:

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return None

    incident_context = {}

    if incident:
        incident_context = {
            "route": incident["route"],
            "observed_success_rate": incident[
                "observed_success_rate"
            ],
            "baseline_success_rate": incident[
                "baseline_success_rate"
            ],
        }

    prompt = f"""
You are a payment recovery strategy assistant.

Failure category:
{failure_code}

Incident context:
{json.dumps(incident_context, indent=2)}

Suggest the safest recovery action.

Allowed actions only:
RETRY
PAYMENT_LINK
STOP
ESCALATE

Return:
- action
- recovery_probability from 0 to 1
- short reason

You are ONLY providing a recommendation.
You do NOT control execution.
"""

    try:
        client = genai.Client(
            api_key=api_key
        )

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CategoryAction,
                temperature=0,
            ),
        )

        return CategoryAction.model_validate_json(
            response.text
        )

    except Exception:
        return None


def get_category_action(
    failure_code: str,
    incident=None,
) -> CategoryAction:
    """
    Deterministic category decision.

    The executable action and recovery probability ALWAYS come from the
    CATEGORY_POLICY mapping. Gemini may optionally contribute a human
    readable reason string for display/audit context, but it can NEVER
    change the action or probability of a known failure category —
    even if the model returns a different suggestion.

    Unknown/unrecognized categories fall through to the safe ESCALATE
    fallback; the model is never allowed to invent an action for them.
    """

    policy_result = deterministic_fallback(
        failure_code
    )

    gemini_result = get_gemini_suggestion(
        failure_code,
        incident,
    )

    reason = policy_result.reason

    # Gemini context is used only when it agrees with the deterministic
    # category policy. Disagreements are discarded — the policy wins.
    if gemini_result:
        if gemini_result.action == policy_result.action:
            reason = gemini_result.reason

    return CategoryAction(
        action=policy_result.action,
        recovery_probability=(
            policy_result.recovery_probability
        ),
        reason=reason,
    )
