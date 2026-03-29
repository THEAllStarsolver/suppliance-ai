"""
audit_engine.py
Responsibility: Immutable decision trace with user_id, API sources, execution status.
"""
from app.models import ShipmentInput, RealWorldData, Decision, AuditEntry
from datetime import datetime, timezone
from typing import List
import uuid

_audit_store: dict[str, AuditEntry] = {}


def record(shipment: ShipmentInput, rw: RealWorldData, decision: Decision,
           explanation: str, api_sources: List[str] | None = None) -> str:
    audit_id = str(uuid.uuid4())[:8]

    rejected = [{"action": s.action, "reason": s.rejection_reason}
                for s in decision.all_scenarios if not s.valid]

    # Patch audit_id into approval_request if present
    if decision.approval_request:
        decision.approval_request.audit_id = audit_id

    entry = AuditEntry(
        timestamp=datetime.now(timezone.utc),
        shipment_id=shipment.shipment_id,
        user_id=shipment.user_id,
        input_data=shipment.model_dump(mode="json"),
        real_world_data=rw.model_dump(mode="json"),
        scenarios=[s.model_dump() for s in decision.all_scenarios],
        rejected_options=rejected,
        final_decision={
            "action": decision.chosen_action,
            "confidence": decision.confidence_score,
            "risk_level": decision.risk_level,
            "cost_usd": decision.chosen_scenario.cost_usd,
            "total_loss_usd": decision.chosen_scenario.total_loss_usd,
            "execution_status": decision.execution_status,
        },
        explanation=explanation,
        execution_status=decision.execution_status,
        api_sources=api_sources or [],
    )
    _audit_store[audit_id] = entry
    return audit_id


def update_execution_status(audit_id: str, status: str):
    if audit_id in _audit_store:
        entry = _audit_store[audit_id]
        entry.execution_status = status
        entry.final_decision["execution_status"] = status


def get(audit_id: str) -> AuditEntry | None:
    return _audit_store.get(audit_id)


def list_all(user_id: str | None = None) -> List[AuditEntry]:
    entries = list(_audit_store.values())
    if user_id:
        entries = [e for e in entries if e.user_id == user_id]
    return entries


def get_store() -> dict:
    return _audit_store
