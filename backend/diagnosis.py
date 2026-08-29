import json
import os
from typing import Literal

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel

load_dotenv()


class DiagnosisResult(BaseModel):
    diagnosis: str
    root_cause: Literal[
        "bank_technical_error",
        "network_issue",
        "issuer_decline",
        "customer_payment_issue",
        "mixed_or_unknown",
    ]
    confidence: float


def diagnose_incident(incident, transactions):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return DiagnosisResult(
            diagnosis="Gemini API key missing.",
            root_cause="mixed_or_unknown",
            confidence=0.0,
        )

    failure_counts = {}

    for tx in transactions:
        reason = tx["decline_reason"] or "unknown"
        failure_counts[reason] = failure_counts.get(reason, 0) + 1

    context = {
        "route": incident["route"],
        "baseline_success_rate": incident["baseline_success_rate"],
        "observed_success_rate": incident["observed_success_rate"],
        "affected_transactions": len(transactions),
        "revenue_at_risk": sum(tx["amount"] for tx in transactions),
        "failure_distribution": failure_counts,
    }

    prompt = f"""
Diagnose this payment degradation incident using ONLY the supplied evidence.

Incident:
{json.dumps(context, indent=2)}

Return:
- diagnosis: concise plain-English explanation
- root_cause: exactly one allowed category
- confidence: number from 0 to 1

Allowed root_cause values:
bank_technical_error
network_issue
issuer_decline
customer_payment_issue
mixed_or_unknown

Do NOT propose a recovery action.
Do NOT invent facts.
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DiagnosisResult,
                temperature=0,
            ),
        )

        return DiagnosisResult.model_validate_json(response.text)

    except Exception as exc:
        return DiagnosisResult(
            diagnosis=f"Diagnosis unavailable: {type(exc).__name__}: {exc}",
            root_cause="mixed_or_unknown",
            confidence=0.0,
        )
