"""
risk_engine.py
Responsibility: Compute composite risk score.
Now supplier-aware and business-type-aware.
"""
from app.models import ShipmentInput, RealWorldData
from app.business_config import get_config

WEIGHT_DELAY = 0.35
WEIGHT_WEATHER = 0.25
WEIGHT_SUPPLIER = 0.25
WEIGHT_DISTANCE = 0.15


def compute_risk(shipment: ShipmentInput, rw: RealWorldData, supplier: dict | None = None) -> tuple[float, str]:
    biz = get_config(shipment.business_type or "electronics")

    delay_score = _delay_score(rw.current_delay_hours, shipment.sla_hours)
    weather_score = rw.weather.risk_factor

    # Supplier-aware: blend shipment reliability with supplier avg_delay if available
    if supplier:
        supplier_risk = (1.0 - supplier["reliability"]) * 0.6 + min(supplier["avg_delay"] / 48, 1.0) * 0.4
    else:
        supplier_risk = 1.0 - shipment.supplier_reliability

    # Distance risk: long routes are riskier
    distance_score = min(rw.route.distance_km / 3000, 1.0)

    composite = (
        WEIGHT_DELAY * delay_score
        + WEIGHT_WEATHER * weather_score
        + WEIGHT_SUPPLIER * supplier_risk
        + WEIGHT_DISTANCE * distance_score
    )

    # Business type priority weight amplifies risk for sensitive cargo
    composite = composite * biz["priority_weight"]
    composite = round(min(composite, 1.0), 3)
    return composite, _risk_level(composite)


def _delay_score(current_delay_hours: float, sla_hours: float) -> float:
    if current_delay_hours <= 0:
        return 0.0
    ratio = current_delay_hours / sla_hours
    if ratio >= 1.0: return 1.0
    if ratio >= 0.75: return 0.8
    if ratio >= 0.5: return 0.5
    if ratio >= 0.25: return 0.25
    return 0.1


def _risk_level(score: float) -> str:
    if score >= 0.75: return "CRITICAL"
    if score >= 0.5: return "HIGH"
    if score >= 0.25: return "MEDIUM"
    return "LOW"
