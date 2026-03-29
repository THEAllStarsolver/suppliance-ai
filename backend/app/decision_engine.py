"""
decision_engine.py
Responsibility: Select best scenario, compute confidence, handle approval workflow.
High-impact actions require human approval unless confidence > 0.9 and auto mode is on.
"""
from app.models import ShipmentInput, Scenario, Decision, ApprovalRequest
from app.business_config import get_config
from typing import List
import logging

logger = logging.getLogger(__name__)

HIGH_IMPACT_ACTIONS = {"CANCEL", "ESCALATE"}
AUTO_EXECUTE_THRESHOLD = 0.90

ACTION_STEPS = {
    "WAIT": [
        "Monitor shipment status every 4 hours",
        "Notify dealer of expected delay",
        "Prepare contingency if delay exceeds SLA",
    ],
    "REROUTE": [
        "Contact logistics provider to confirm alternate route",
        "Update delivery ETA in system",
        "Notify dealer of revised schedule",
        "Track rerouted shipment closely",
    ],
    "CANCEL": [
        "Issue hold/cancellation order immediately",
        "Notify dealer and offer reschedule",
        "Assess restocking or re-sourcing options",
        "Log incident for supplier review",
    ],
    "ESCALATE": [
        "No valid automated option found — escalate to operations manager",
        "Freeze shipment pending manual review",
        "Notify dealer of critical delay",
    ],
}


def decide(shipment: ShipmentInput, scenarios: List[Scenario]) -> Decision:
    valid = [s for s in scenarios if s.valid]
    if not valid:
        return _escalate(scenarios)

    valid.sort(key=lambda s: s.score)
    best = valid[0]
    confidence = _confidence(valid)
    risk_level = _risk_from_score(best.risk_score)
    steps = ACTION_STEPS.get(best.action, ACTION_STEPS["ESCALATE"])

    # Human-in-the-loop logic
    approval_request = None
    execution_status = "pending"
    is_high_impact = best.action in HIGH_IMPACT_ACTIONS
    auto_mode = (shipment.execution_mode or "recommendation") == "auto"

    if is_high_impact:
        auto_execute = auto_mode and confidence >= AUTO_EXECUTE_THRESHOLD
        approval_request = ApprovalRequest(
            shipment_id=shipment.shipment_id,
            audit_id="",  # filled in after audit record
            recommended_action=best.action,
            reason=_approval_reason(best, shipment),
            confidence=round(confidence, 2),
            requires_approval=not auto_execute,
            auto_executed=auto_execute,
        )
        execution_status = "auto_executed" if auto_execute else "awaiting_approval"
    else:
        execution_status = "executed"

    return Decision(
        chosen_action=best.action,
        chosen_scenario=best,
        confidence_score=round(confidence, 2),
        all_scenarios=scenarios,
        risk_level=risk_level,
        action_steps=steps,
        approval_request=approval_request,
        execution_status=execution_status,
    )


def _approval_reason(scenario: Scenario, shipment: ShipmentInput) -> str:
    if scenario.action == "CANCEL":
        return (f"AI recommends CANCEL due to {scenario.delay_hours:.0f}h delay "
                f"and ${scenario.total_loss_usd:.0f} projected loss. Proceed?")
    return f"AI recommends {scenario.action} with confidence {scenario.risk_score:.0%}. Proceed?"


def _escalate(scenarios: List[Scenario]) -> Decision:
    dummy = Scenario(action="ESCALATE", cost_usd=0, delay_hours=0, total_loss_usd=0,
                     risk_score=1.0, score=1.0, valid=False, rejection_reason="All options exhausted")
    return Decision(chosen_action="ESCALATE", chosen_scenario=dummy, confidence_score=0.0,
                    all_scenarios=scenarios, risk_level="CRITICAL",
                    action_steps=ACTION_STEPS["ESCALATE"], execution_status="escalated")


def _confidence(valid: List[Scenario]) -> float:
    if len(valid) == 1:
        return 0.95
    scores = [s.score for s in valid]
    spread = max(scores) - min(scores)
    return min(0.5 + spread * 5, 0.99)


def _risk_from_score(risk_score: float) -> str:
    if risk_score >= 0.75: return "CRITICAL"
    if risk_score >= 0.5: return "HIGH"
    if risk_score >= 0.25: return "MEDIUM"
    return "LOW"
