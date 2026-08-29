from backend.metrics import calculate_metrics


metrics = calculate_metrics()

print("=" * 50)
print("RECOVERY SENTINEL METRICS")
print("=" * 50)

for key, value in metrics.items():
    if "rate" in key:
        print(f"{key}: {value:.2%}")
    elif "revenue" in key:
        print(f"{key}: ₹{value:,.0f}")
    else:
        print(f"{key}: {value:,}")
