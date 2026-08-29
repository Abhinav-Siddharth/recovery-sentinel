from backend.value_gate import (
    calculate_expected_value,
    should_intervene,
)


tests = [
    {
        "amount": 5000,
        "probability": 0.70,
        "cost": 100,
    },
    {
        "amount": 50,
        "probability": 0.30,
        "cost": 30,
    },
    {
        "amount": 1000,
        "probability": 0.0,
        "cost": 10,
    },
]


for test in tests:
    ev = calculate_expected_value(
        test["amount"],
        test["probability"],
        test["cost"],
    )

    decision = should_intervene(
        test["amount"],
        test["probability"],
        test["cost"],
    )

    print(
        f"Amount ₹{test['amount']:,} | "
        f"Probability {test['probability']:.0%} | "
        f"Cost ₹{test['cost']} | "
        f"EV ₹{ev:,.2f} | "
        f"ACT={decision}"
    )
