from backend.evaluation import (
    evaluate_incident,
    blind_retry_baseline,
)


print("=" * 60)
print("RECOVERY SENTINEL — EVALUATION")
print("=" * 60)

result = evaluate_incident()

for key, value in result.items():
    if "revenue" in key:
        print(f"{key}: ₹{value:,.0f}")
    elif key == "recovery_rate":
        print(f"{key}: {value:.2%}")
    else:
        print(f"{key}: {value}")


print()
print("=" * 60)
print("BLIND RETRY BASELINE")
print("=" * 60)

baseline = blind_retry_baseline()

for key, value in baseline.items():
    if "revenue" in key:
        print(f"{key}: ₹{value:,.0f}")
    elif key == "recovery_rate":
        print(f"{key}: {value:.2%}")
    else:
        print(f"{key}: {value}")


print()
print("=" * 60)
print("COMPARISON")
print("=" * 60)

sentinel_recovered = result["revenue_recovered"]
baseline_recovered = baseline["revenue_recovered"]

sentinel_rate = result["recovery_rate"]
baseline_rate = baseline["recovery_rate"]

print(
    f"Recovery Sentinel: ₹{sentinel_recovered:,.0f} "
    f"({sentinel_rate:.2%})"
)

print(
    f"Blind Retry:       ₹{baseline_recovered:,.0f} "
    f"({baseline_rate:.2%})"
)

print(
    f"Revenue advantage: "
    f"₹{sentinel_recovered - baseline_recovered:,.0f}"
)
