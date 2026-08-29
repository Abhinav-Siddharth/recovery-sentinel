import random
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd


SEED = 42
random.seed(SEED)

OUTPUT = Path("data/transactions.csv")

PAYMENT_METHODS = ["UPI", "CARD", "NETBANKING"]
ROUTES = ["ROUTE_A", "ROUTE_B", "ROUTE_C"]

FAILURE_CODES = [
    "bank_technical_error",
    "insufficient_funds",
    "card_expired",
    "issuer_declined",
    "mandate_cancelled",
    "network_timeout",
    "risk_block",
]


def choose_failure(method: str, degraded: bool) -> str:
    if degraded:
        return random.choices(
            ["bank_technical_error", "network_timeout", "issuer_declined"],
            weights=[60, 25, 15],
            k=1,
        )[0]

    return random.choices(
        FAILURE_CODES,
        weights=[20, 20, 15, 15, 10, 10, 10],
        k=1,
    )[0]


def action_for_failure(failure_code: str, amount: int):
    if failure_code in {"bank_technical_error", "network_timeout"}:
        return True, "RETRY"

    if failure_code in {"card_expired", "mandate_cancelled", "insufficient_funds"}:
        return True, "PAYMENT_LINK"

    if failure_code == "risk_block":
        return False, "STOP"

    if failure_code == "issuer_declined":
        if amount >= 30000:
            return True, "ESCALATE"
        return False, "ESCALATE"

    return True, "ESCALATE"


def generate():
    start = datetime(2026, 8, 27, 9, 0, 0)

    rows = []

    for i in range(1, 501):
        # Spread transactions through ~8 hours.
        timestamp = start + timedelta(minutes=i * 1.0)

        # Degradation window: records 281-360.
        degradation = 281 <= i <= 360

        if degradation:
            # Force the incident to be isolated to ROUTE_B + UPI.
            if random.random() < 0.72:
                route = "ROUTE_B"
                method = "UPI"
            else:
                route = random.choice(["ROUTE_A", "ROUTE_C"])
                method = random.choice(PAYMENT_METHODS)
        else:
            route = random.choices(
                ROUTES,
                weights=[40, 35, 25],
                k=1,
            )[0]
            method = random.choices(
                PAYMENT_METHODS,
                weights=[50, 30, 20],
                k=1,
            )[0]

        # Healthy baseline vs degraded incident.
        if degradation and route == "ROUTE_B" and method == "UPI":
            failed = random.random() < 0.65
        else:
            failed = random.random() < 0.05

        amount = random.randint(100, 50000)

        if failed:
            failure_code = choose_failure(method, degradation)
            recoverable, ground_truth_action = action_for_failure(
                failure_code, amount
            )
            status = "failed"
        else:
            failure_code = ""
            recoverable = False
            ground_truth_action = ""
            status = "success"

        rows.append(
            {
                "transaction_id": f"TXN_{i:04d}",
                "timestamp": timestamp.isoformat(),
                "amount": amount,
                "payment_method": method,
                "route": route,
                "status": status,
                "failure_code": failure_code,
                "recoverable": int(recoverable),
                "ground_truth_action": ground_truth_action,
                "attempt_count": 0,
            }
        )

    df = pd.DataFrame(rows)
    df.to_csv(OUTPUT, index=False)

    print("=" * 60)
    print("RECOVERY SENTINEL — SYNTHETIC DATASET")
    print("=" * 60)
    print(f"Rows: {len(df)}")
    print(f"Saved: {OUTPUT}")

    normal = df.iloc[:280]
    degraded = df.iloc[280:360]

    normal_failure_rate = (normal["status"] == "failed").mean()

    route_b_upi = degraded[
        (degraded["route"] == "ROUTE_B")
        & (degraded["payment_method"] == "UPI")
    ]

    degraded_failure_rate = (
        (route_b_upi["status"] == "failed").mean()
        if len(route_b_upi)
        else 0
    )

    affected = df[
        (df["route"] == "ROUTE_B")
        & (df["payment_method"] == "UPI")
        & (df["status"] == "failed")
        & (df["timestamp"].between(
            df.iloc[280]["timestamp"],
            df.iloc[359]["timestamp"],
        ))
    ]

    print(f"Normal failure rate: {normal_failure_rate:.2%}")
    print(f"Degraded ROUTE_B/UPI failure rate: {degraded_failure_rate:.2%}")
    print(f"Degradation failures: {len(affected)}")
    print(f"Revenue at risk: ₹{affected['amount'].sum():,.0f}")

    print("\nGround-truth actions:")
    print(
        df[df["ground_truth_action"] != ""]
        ["ground_truth_action"]
        .value_counts()
        .to_string()
    )


if __name__ == "__main__":
    generate()
