from backend.detector import detect_degradation
from backend.database import get_connection


def test_detector_finds_incident():
    incident_id = detect_degradation()

    assert incident_id is not None
    assert incident_id == "INC-001"


def test_detected_incident_has_affected_transactions():
    conn = get_connection()

    count = conn.execute(
        """
        SELECT COUNT(*)
        FROM transactions
        WHERE incident_id = 'INC-001'
        """
    ).fetchone()[0]

    conn.close()

    assert count == 48
