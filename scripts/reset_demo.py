import subprocess
import sys

from backend.reset import reset_database


def run_detector():
    result = subprocess.run(
        [sys.executable, "-m", "backend.detector"],
        capture_output=True,
        text=True,
    )

    print(result.stdout)

    if result.returncode != 0:
        print(result.stderr)
        raise SystemExit(result.returncode)


if __name__ == "__main__":
    print("=" * 50)
    print("RECOVERY SENTINEL — DEMO RESET")
    print("=" * 50)

    reset_database()
    print("Database reset.")

    print("\nRunning degradation detector...")
    run_detector()

    print("\nDemo ready.")
