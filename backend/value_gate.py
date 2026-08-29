def calculate_expected_value(
    amount: float,
    recovery_probability: float,
    intervention_cost: float,
) -> float:
    return (amount * recovery_probability) - intervention_cost


def should_intervene(
    amount: float,
    recovery_probability: float,
    intervention_cost: float,
) -> bool:
    expected_value = calculate_expected_value(
        amount,
        recovery_probability,
        intervention_cost,
    )

    return expected_value > 0
