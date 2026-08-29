from backend.database import get_connection


WINDOW_SIZE = 20
MIN_FAILURE_RATE_INCREASE = 0.15
MIN_TRANSACTIONS = 10


def detect_degradation():
    conn = get_connection()

    rows = conn.execute(
        """
        SELECT *
        FROM transactions
        ORDER BY created_at ASC
        """
    ).fetchall()

    if len(rows) < MIN_TRANSACTIONS:
        conn.close()
        return None

    # First 200 transactions = healthy baseline.
    baseline_rows = rows[:200]

    baseline_failures = sum(
        row["status"] == "failed"
        for row in baseline_rows
    )

    baseline_failure_rate = baseline_failures / len(baseline_rows)

    detected_incident = None

    # Find the FIRST degraded window.
    for i in range(200, len(rows), WINDOW_SIZE):
        window = rows[i:i + WINDOW_SIZE]

        if len(window) < MIN_TRANSACTIONS:
            continue

        groups = {}

        for row in window:
            key = (row["route"], row["method"])
            groups.setdefault(key, []).append(row)

        for (route, method), group in groups.items():
            failures = sum(
                row["status"] == "failed"
                for row in group
            )

            failure_rate = failures / len(group)

            if (
                failure_rate >= baseline_failure_rate + MIN_FAILURE_RATE_INCREASE
                and len(group) >= MIN_TRANSACTIONS
            ):
                detected_incident = {
                    "start_index": i,
                    "route": route,
                    "method": method,
                    "detected_at": window[0]["created_at"],
                    "observed_failure_rate": failure_rate,
                }
                break

        if detected_incident:
            break

    if not detected_incident:
        conn.close()
        return None

    route = detected_incident["route"]
    method = detected_incident["method"]
    start_index = detected_incident["start_index"]

    # Find the end of the degradation period.
    end_index = start_index

    while end_index < len(rows):
        row = rows[end_index]

        # Once the injected degradation ends, stop.
        if (
            row["route"] != route
            or row["method"] != method
        ):
            # Allow a few non-matching rows inside the stream.
            lookahead = rows[end_index:min(end_index + 10, len(rows))]

            matching_failures = sum(
                r["route"] == route
                and r["method"] == method
                and r["status"] == "failed"
                for r in lookahead
            )

            if matching_failures == 0:
                break

        end_index += 1

    affected_rows = [
        row
        for row in rows[start_index:end_index]
        if (
            row["route"] == route
            and row["method"] == method
            and row["status"] == "failed"
        )
    ]

    incident_id = "INC-001"

    # Remove old demo incidents/assignments so detection is repeatable.
    conn.execute("UPDATE transactions SET incident_id = NULL")
    conn.execute("DELETE FROM incidents")

    conn.execute(
        """
        INSERT INTO incidents (
            id,
            route,
            detected_at,
            baseline_success_rate,
            observed_success_rate,
            diagnosis,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            incident_id,
            route,
            detected_incident["detected_at"],
            1 - baseline_failure_rate,
            1 - detected_incident["observed_failure_rate"],
            None,
            "open",
        ),
    )

    for row in affected_rows:
        conn.execute(
            """
            UPDATE transactions
            SET incident_id = ?
            WHERE id = ?
            """,
            (incident_id, row["id"]),
        )

    conn.commit()
    conn.close()

    return incident_id


if __name__ == "__main__":
    incident = detect_degradation()

    if incident:
        print(f"DEGRADATION DETECTED: {incident}")
    else:
        print("No degradation detected.")
