from backend.evaluation import evaluate_incident


result = evaluate_incident()

print("=" * 60)
print("RECOVERY SENTINEL — EVALUATION")
print("=" * 60)

for key, value in result.items():
    if "revenue" in key:
        print(f"{key}: ₹{value:,.0f}")
    elif key == "recovery_rate":
        print(f"{key}: {value:.2%}")
    else:
        print(f"{key}: {value}")
