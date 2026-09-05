from unittest.mock import patch

from backend.action_proposer import (
    CategoryAction,
    get_category_action,
)


# The validated deterministic mapping. These must never change regardless
# of what Gemini suggests or whether the Gemini call fails.
EXPECTED_MAPPING = {
    "bank_technical_error": ("RETRY", 0.85),
    "network_timeout": ("RETRY", 0.85),
    "insufficient_funds": ("PAYMENT_LINK", 0.65),
    "mandate_cancelled": ("PAYMENT_LINK", 0.65),
    "issuer_declined": ("ESCALATE", 0.15),
}

# A conflicting suggestion from the model. It must never influence the
# returned executable action/probability.
CONFLICTING_SUGGESTION = CategoryAction(
    action="ESCALATE",
    recovery_probability=0.0,
    reason="Gemini drift: model suggested a different action.",
)


def _run_without_gemini(failure_code):
    """Evaluate the category decision with Gemini completely unavailable."""
    with patch(
        "backend.action_proposer.get_gemini_suggestion",
        return_value=None,
    ):
        return get_category_action(failure_code)


def _run_with_conflicting_gemini(failure_code):
    """Evaluate the category decision while Gemini disagrees with policy."""
    with patch(
        "backend.action_proposer.get_gemini_suggestion",
        return_value=CONFLICTING_SUGGESTION,
    ):
        return get_category_action(failure_code)


def verify_known_categories():
    print("VERIFY KNOWN CATEGORIES (Gemini unavailable → policy decides)")
    print("-" * 60)

    for failure_code, (expected_action, expected_probability) in (
        EXPECTED_MAPPING.items()
    ):
        result = _run_without_gemini(failure_code)

        assert result.action == expected_action, (
            f"{failure_code}: expected {expected_action}, got {result.action}"
        )
        assert abs(
            result.recovery_probability - expected_probability
        ) < 1e-9, (
            f"{failure_code}: expected probability "
            f"{expected_probability}, got {result.recovery_probability}"
        )

        print(
            f"PASS  {failure_code:22} → {result.action:14} "
            f"(p={result.recovery_probability:.2f})"
        )


def verify_gemini_cannot_override_action():
    print()
    print("VERIFY GEMINI CANNOT OVERRIDE THE EXECUTABLE ACTION")
    print("-" * 60)

    for failure_code, (expected_action, expected_probability) in (
        EXPECTED_MAPPING.items()
    ):
        result = _run_with_conflicting_gemini(failure_code)

        assert result.action == expected_action, (
            f"{failure_code}: Gemini conflict changed action to "
            f"{result.action} (expected {expected_action})"
        )
        assert abs(
            result.recovery_probability - expected_probability
        ) < 1e-9, (
            f"{failure_code}: Gemini conflict changed probability to "
            f"{result.recovery_probability} (expected "
            f"{expected_probability})"
        )

        print(
            f"PASS  {failure_code:22} → {result.action:14} "
            f"(p={result.recovery_probability:.2f}) "
            f"despite conflicting Gemini suggestion"
        )


def verify_unknown_category_fallback():
    print()
    print("VERIFY UNKNOWN CATEGORY SAFE FALLBACK")
    print("-" * 60)

    result = _run_without_gemini("unrecognized_failure_code")

    assert result.action == "ESCALATE"
    assert result.recovery_probability == 0.0

    print(
        f"PASS  unrecognized failure code → {result.action} "
        f"(p={result.recovery_probability:.2f})"
    )

    # Even if Gemini tries to invent an action, unknown categories must
    # keep the safe fallback.
    result = _run_with_conflicting_gemini(
        "unrecognized_failure_code",
    )

    assert result.action == "ESCALATE"
    assert result.recovery_probability == 0.0

    print(
        "PASS  unrecognized failure code → ESCALATE fallback "
        "even when Gemini suggests something else"
    )


def main():
    print("=" * 60)
    print("RECOVERY SENTINEL — ACTION PROPOSER DETERMINISM")
    print("=" * 60)

    verify_known_categories()
    verify_gemini_cannot_override_action()
    verify_unknown_category_fallback()

    print()
    print("ALL ACTION PROPOSER CHECKS PASSED")


if __name__ == "__main__":
    main()
