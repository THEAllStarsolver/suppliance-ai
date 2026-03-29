"""
simulation_engine.py
Responsibility: Generate WAIT / REROUTE / CANCEL scenarios.
Now business-type-aware and supplier-aware.
"""
from app.models import ShipmentInput, RealWorldData, Scenario
from app.config import REROUTE_COST_MULTIPLIER
from app.business_config import get_config

BASE_DELAY_PENALTY = 15.0
CANCEL_FIXED_PENALTY = 200.0


def simulate(shipment: ShipmentInput, rw: RealWorldData, risk_score: float,
             supplier: dict | None = None) -> list[Scenario]:
    biz = get_config(shipment.business_type or "electronics")
    penalty_per_hour = BASE_DELAY_PENALTY * biz["delay_penalty_multiplier"]

    # Supplier cost_index scales transport cost (default 1.0)
    cost_multiplier = supplier["cost_index"] if supplier else 1.0

    return [
        _wait(shipment, rw, risk_score, penalty_per_hour, cost_multiplier),
        _reroute(shipment, rw, risk_score, penalty_per_hour, cost_multiplier),
        _cancel(shipment, rw),
    ]


def _wait(shipment, rw, risk_score, penalty_per_hour, cost_mult):
    delay = rw.current_delay_hours * (1 + rw.weather.risk_factor)
    cost = rw.route.base_cost_usd * cost_mult
    total_loss = cost + delay * penalty_per_hour
    score = _score(cost, delay, total_loss, risk_score, shipment)
    return Scenario(action="WAIT", cost_usd=round(cost, 2), delay_hours=round(delay, 2),
                    total_loss_usd=round(total_loss, 2), risk_score=round(risk_score, 3),
                    score=round(score, 3), valid=True)


def _reroute(shipment, rw, risk_score, penalty_per_hour, cost_mult):
    cost = rw.route.base_cost_usd * REROUTE_COST_MULTIPLIER * cost_mult
    # Near destination → reroute adds less value
    proximity_factor = max(1.0 - (rw.route.distance_km / 5000), 0.3)
    delay = max(rw.current_delay_hours * 0.6 * proximity_factor, rw.route.estimated_travel_hours * 0.1)
    total_loss = cost + delay * penalty_per_hour
    adjusted_risk = risk_score * 0.7
    score = _score(cost, delay, total_loss, adjusted_risk, shipment)
    return Scenario(action="REROUTE", cost_usd=round(cost, 2), delay_hours=round(delay, 2),
                    total_loss_usd=round(total_loss, 2), risk_score=round(adjusted_risk, 3),
                    score=round(score, 3), valid=True)


def _cancel(shipment, rw):
    cost = CANCEL_FIXED_PENALTY
    total_loss = cost + shipment.dealer_profit_usd * 0.5
    score = _score(cost, 0.0, total_loss, 0.1, shipment)
    return Scenario(action="CANCEL", cost_usd=round(cost, 2), delay_hours=0.0,
                    total_loss_usd=round(total_loss, 2), risk_score=0.1,
                    score=round(score, 3), valid=True)


def _score(cost, delay, total_loss, risk, shipment):
    ref = max(shipment.cargo_value_usd, 1.0)
    dv = _dealer_value(shipment)
    raw = (0.35 * (total_loss / ref) + 0.30 * (cost / ref)
           + 0.25 * risk + 0.10 * min(delay / 168, 1.0)) * dv
    return round(raw, 4)


def _dealer_value(shipment):
    freq = min(shipment.dealer_order_frequency / 50, 1.0)
    val = min(shipment.dealer_profit_usd / 5000, 1.0)
    importance = (freq + val + shipment.dealer_payment_score) / 3
    return round(0.8 + importance * 0.7, 3)
