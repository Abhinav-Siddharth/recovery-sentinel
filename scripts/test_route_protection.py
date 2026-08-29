from backend.route_protection import evaluate_route_shift


healthy = evaluate_route_shift(
    "ROUTE_B",
    0.96,
)

degraded = evaluate_route_shift(
    "ROUTE_B",
    0.3125,
)

unknown = evaluate_route_shift(
    "ROUTE_X",
    0.20,
)

print("HEALTHY:")
print(healthy)

print("\nDEGRADED:")
print(degraded)

print("\nUNKNOWN ROUTE:")
print(unknown)
