"""
compliance_engine.py
Responsibility: Filter scenarios against hard business constraints.
Acts as a safety gate before decision selection.
"""
from app.models import ShipmentInput, Scenario
from app.config import MIN_SUPPLIER_RELIABILITY, SLA_BREACH_THRESHOLD_HOURS
from typing import List


def enforce(shipment: ShipmentInput, scenarios: List[Scenario]) -> List[Scenario]:
    """
    Marks scenarios as invalid if they violate constraints.
    Returns the same list with valid/rejection_reason fields updated.
    """
    for s in scenarios:
        reasons = []

        if s.cost_usd > shipment.budget_usd:
            reasons.append(f"Cost ${s.cost_usd:.0f} exceeds budget ${shipment.budget_usd:.0f}")

        if shipment.supplier_reliability < MIN_SUPPLIER_RELIABILITY and s.action == "WAIT":
            reasons.append(f"Supplier reliability {shipment.supplier_reliability:.0%} below minimum {MIN_SUPPLIER_RELIABILITY:.0%} — WAIT is unsafe")

        if s.delay_hours > SLA_BREACH_THRESHOLD_HOURS and s.action == "WAIT":
            reasons.append(f"Projected delay {s.delay_hours:.1f}h breaches SLA threshold {SLA_BREACH_THRESHOLD_HOURS:.0f}h")

        if reasons:
            s.valid = False
            s.rejection_reason = "; ".join(reasons)

    return scenarios
