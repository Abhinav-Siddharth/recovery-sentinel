from backend.action_proposer import get_category_action


failure_codes = [
    "bank_technical_error",
    "network_timeout",
    "card_expired",
    "insufficient_funds",
    "risk_block",
    "issuer_declined",
]

for code in failure_codes:
    result = get_category_action(code)

    print(f"\n{code}")
    print(result)
