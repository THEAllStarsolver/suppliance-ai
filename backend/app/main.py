"""
main.py — SupplyChain AI Decision Engine
FastAPI entry point. All existing endpoints preserved; new ones added.
"""
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from typing import Optional

from app.models import ShipmentInput, DecisionResponse, AuditEntry, SupplierInput, DealerInput
from app import (api_integration, risk_engine, simulation_engine, compliance_engine,
                 decision_engine, audit_engine, explanation_engine, firebase_store,
                 insights_engine, business_config)

app = FastAPI(title="SupplyChain AI — Decision & Audit Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


# ── Core analyze endpoint (extended, backward compatible) ─────────────────────

@app.post("/api/analyze", response_model=DecisionResponse)
async def analyze_shipment(shipment: ShipmentInput,
                            x_user_id: Optional[str] = Header(None)):
    uid = x_user_id or shipment.user_id

    # Resolve supplier from store if supplier_id provided
    supplier = None
    if uid and shipment.supplier_id:
        supplier = firebase_store.get_supplier(uid, shipment.supplier_id)

    # 1. Real-world data
    weather, route = await _fetch_real_world(shipment)
    current_delay = _compute_delay(shipment)

    # ETA and delay reason
    eta_hours = max(route.estimated_travel_hours - current_delay, 0)
    delay_reason = _delay_reason(weather, current_delay, supplier)

    from app.models import RealWorldData
    rw = RealWorldData(weather=weather, route=route, current_delay_hours=current_delay,
                       eta_hours=round(eta_hours, 2), delay_reason=delay_reason)

    # 2. Risk (supplier-aware, business-type-aware)
    risk_score, risk_level = risk_engine.compute_risk(shipment, rw, supplier)

    # 3. Simulate (supplier cost_index applied)
    scenarios = simulation_engine.simulate(shipment, rw, risk_score, supplier)

    # 4. Compliance
    scenarios = compliance_engine.enforce(shipment, scenarios)

    # 5. Decision (with approval logic)
    decision = decision_engine.decide(shipment, scenarios)
    decision.risk_level = risk_level

    # 6. Explanation
    explanation = await explanation_engine.explain(shipment, rw, decision)

    # 7. Audit (with user_id and api sources)
    api_sources = _api_sources(weather, route)
    audit_id = audit_engine.record(shipment, rw, decision, explanation, api_sources)

    # 8. Store in user history
    if uid:
        firebase_store.record_shipment(uid, {
            "shipment_id": shipment.shipment_id, "audit_id": audit_id,
            "action": decision.chosen_action, "risk_level": risk_level,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return DecisionResponse(
        shipment_id=shipment.shipment_id, risk_level=risk_level,
        real_world_data=rw, scenarios=scenarios, decision=decision,
        explanation=explanation, audit_id=audit_id,
    )


# ── Approval endpoints ────────────────────────────────────────────────────────

@app.post("/api/approve/{audit_id}")
async def approve_decision(audit_id: str):
    entry = audit_engine.get(audit_id)
    if not entry:
        raise HTTPException(404, "Audit record not found")
    audit_engine.update_execution_status(audit_id, "approved")
    return {"audit_id": audit_id, "status": "approved"}


@app.post("/api/reject/{audit_id}")
async def reject_decision(audit_id: str):
    entry = audit_engine.get(audit_id)
    if not entry:
        raise HTTPException(404, "Audit record not found")
    audit_engine.update_execution_status(audit_id, "rejected")
    return {"audit_id": audit_id, "status": "rejected"}


# ── Supplier endpoints ────────────────────────────────────────────────────────

@app.post("/api/suppliers")
async def create_supplier(supplier: SupplierInput, x_user_id: Optional[str] = Header(None)):
    uid = x_user_id or "default"
    return firebase_store.add_supplier(uid, supplier.model_dump())


@app.get("/api/suppliers")
async def list_suppliers(x_user_id: Optional[str] = Header(None)):
    uid = x_user_id or "default"
    return firebase_store.get_suppliers(uid)


# ── Dealer endpoints ──────────────────────────────────────────────────────────

@app.post("/api/dealers")
async def create_dealer(dealer: DealerInput, x_user_id: Optional[str] = Header(None)):
    uid = x_user_id or "default"
    return firebase_store.add_dealer(uid, dealer.model_dump())


@app.get("/api/dealers")
async def list_dealers(x_user_id: Optional[str] = Header(None)):
    uid = x_user_id or "default"
    return firebase_store.get_dealers(uid)


# ── Insights endpoint ─────────────────────────────────────────────────────────

@app.get("/api/insights")
async def get_insights(x_user_id: Optional[str] = Header(None)):
    return insights_engine.get_insights(x_user_id)


# ── Business config ───────────────────────────────────────────────────────────

@app.get("/api/business-types")
async def get_business_types():
    return business_config.list_types()


# ── Geocode helper for map ────────────────────────────────────────────────────

@app.get("/api/geocode")
async def geocode(city: str):
    coords = await api_integration.geocode_city(city)
    if not coords:
        raise HTTPException(404, f"Could not geocode: {city}")
    return {"city": city, "lat": coords[0], "lon": coords[1]}


# ── Existing audit endpoints ──────────────────────────────────────────────────

@app.get("/api/audit/{audit_id}", response_model=AuditEntry)
async def get_audit(audit_id: str):
    entry = audit_engine.get(audit_id)
    if not entry:
        raise HTTPException(404, "Audit record not found")
    return entry


@app.get("/api/audits")
async def list_audits(x_user_id: Optional[str] = Header(None)):
    entries = audit_engine.list_all(x_user_id)
    return [
        {"audit_id": aid, "shipment_id": e.shipment_id, "timestamp": e.timestamp,
         "action": e.final_decision["action"], "risk_level": e.final_decision["risk_level"],
         "confidence": e.final_decision["confidence"],
         "execution_status": e.execution_status}
        for aid, e in audit_engine.get_store().items()
        if not x_user_id or e.user_id == x_user_id
    ]


@app.get("/api/shipments/sample")
async def sample_shipments():
    return SAMPLE_SHIPMENTS


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "timestamp": datetime.now(timezone.utc).isoformat()}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_delay(shipment: ShipmentInput) -> float:
    now = datetime.now(timezone.utc)
    expected = shipment.expected_delivery
    if expected.tzinfo is None:
        expected = expected.replace(tzinfo=timezone.utc)
    return round(max((now - expected).total_seconds() / 3600, 0.0), 2)


async def _fetch_real_world(shipment: ShipmentInput):
    import asyncio
    return await asyncio.gather(
        api_integration.get_weather(shipment.destination),
        api_integration.get_route(shipment.origin, shipment.destination),
    )


def _delay_reason(weather, delay_hours: float, supplier: dict | None) -> str:
    reasons = []
    if weather.risk_factor >= 0.4:
        reasons.append(f"adverse weather ({weather.condition})")
    if supplier and supplier.get("avg_delay", 0) > 12:
        reasons.append(f"supplier avg delay {supplier['avg_delay']:.0f}h")
    if delay_hours > 24:
        reasons.append("extended transit time")
    return ", ".join(reasons) if reasons else "within normal parameters"


def _api_sources(weather, route) -> list:
    sources = []
    if weather.condition != "Unknown":
        sources.append("OpenWeatherMap — live weather")
    if route.origin_coords:
        sources.append("OpenRouteService — real road routing")
    else:
        sources.append("Nominatim/OSM — geocoding fallback")
    return sources


SAMPLE_SHIPMENTS = [
    {"shipment_id": "SHP-001", "origin": "Mumbai", "destination": "Delhi",
     "expected_delivery": "2025-01-10T08:00:00Z", "cargo_value_usd": 12000,
     "dealer_profit_usd": 2400, "dealer_order_frequency": 36, "dealer_payment_score": 0.92,
     "supplier_reliability": 0.85, "budget_usd": 800, "sla_hours": 48, "business_type": "electronics"},
    {"shipment_id": "SHP-002", "origin": "Chicago", "destination": "Houston",
     "expected_delivery": "2025-01-09T12:00:00Z", "cargo_value_usd": 8500,
     "dealer_profit_usd": 1200, "dealer_order_frequency": 12, "dealer_payment_score": 0.70,
     "supplier_reliability": 0.55, "budget_usd": 600, "sla_hours": 36, "business_type": "perishable"},
    {"shipment_id": "SHP-003", "origin": "Berlin", "destination": "Warsaw",
     "expected_delivery": "2025-01-11T06:00:00Z", "cargo_value_usd": 22000,
     "dealer_profit_usd": 5500, "dealer_order_frequency": 60, "dealer_payment_score": 0.98,
     "supplier_reliability": 0.90, "budget_usd": 2000, "sla_hours": 72, "business_type": "industrial"},
]
