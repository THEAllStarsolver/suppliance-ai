"""
insights_engine.py
Responsibility: Aggregate audit history into business intelligence insights.
Simple aggregations — no ML required.
"""
from app.audit_engine import list_all
from typing import List


def get_insights(user_id: str | None = None) -> dict:
    entries = list_all(user_id)
    if not entries:
        return _empty_insights()

    shipments = [e.input_data for e in entries]
    decisions = [e.final_decision for e in entries]
    rw_data = [e.real_world_data for e in entries]

    return {
        "profit_analysis": _profit_analysis(shipments, decisions),
        "supplier_performance": _supplier_performance(shipments, decisions),
        "loss_analysis": _loss_analysis(decisions, rw_data),
        "ai_recommendations": _recommendations(shipments, decisions),
        "total_shipments": len(entries),
        "total_revenue_at_risk": round(sum(d["total_loss_usd"] for d in decisions), 2),
        "avg_confidence": round(sum(d["confidence"] for d in decisions) / len(decisions), 2),
    }


def _profit_analysis(shipments: list, decisions: list) -> dict:
    dealer_map = {}
    for s, d in zip(shipments, decisions):
        name = s.get("shipment_id", "unknown")
        profit = s.get("dealer_profit_usd", 0)
        loss = d.get("total_loss_usd", 0)
        net = profit - loss
        dealer_map[name] = dealer_map.get(name, {"profit": 0, "loss": 0, "net": 0})
        dealer_map[name]["profit"] += profit
        dealer_map[name]["loss"] += loss
        dealer_map[name]["net"] += net

    ranked = sorted(dealer_map.items(), key=lambda x: x[1]["net"], reverse=True)
    return {
        "top_dealers": [{"id": k, **v} for k, v in ranked[:3]],
        "low_performers": [{"id": k, **v} for k, v in ranked[-3:] if v["net"] < 0],
    }


def _supplier_performance(shipments: list, decisions: list) -> list:
    sup_map = {}
    for s, d in zip(shipments, decisions):
        rel = s.get("supplier_reliability", 0)
        sid = s.get("supplier_id") or "default"
        if sid not in sup_map:
            sup_map[sid] = {"reliability_sum": 0, "loss_sum": 0, "count": 0}
        sup_map[sid]["reliability_sum"] += rel
        sup_map[sid]["loss_sum"] += d.get("total_loss_usd", 0)
        sup_map[sid]["count"] += 1

    result = []
    for sid, v in sup_map.items():
        c = v["count"]
        result.append({
            "supplier_id": sid,
            "avg_reliability": round(v["reliability_sum"] / c, 2),
            "avg_loss": round(v["loss_sum"] / c, 2),
            "shipment_count": c,
        })
    return sorted(result, key=lambda x: x["avg_reliability"], reverse=True)


def _loss_analysis(decisions: list, rw_data: list) -> dict:
    delay_loss = sum(d["total_loss_usd"] for d in decisions if d["action"] == "WAIT")
    cancel_loss = sum(d["total_loss_usd"] for d in decisions if d["action"] == "CANCEL")
    reroute_cost = sum(d["cost_usd"] for d in decisions if d["action"] == "REROUTE")
    total = sum(d["total_loss_usd"] for d in decisions)

    avg_distance = 0
    if rw_data:
        avg_distance = round(sum(r.get("route", {}).get("distance_km", 0) for r in rw_data) / len(rw_data), 1)

    return {
        "delay_induced_loss": round(delay_loss, 2),
        "cancellation_loss": round(cancel_loss, 2),
        "reroute_cost": round(reroute_cost, 2),
        "total_loss": round(total, 2),
        "avg_route_distance_km": avg_distance,
    }


def _recommendations(shipments: list, decisions: list) -> List[str]:
    recs = []
    low_rel = [s for s in shipments if s.get("supplier_reliability", 1) < 0.65]
    if len(low_rel) > 1:
        recs.append(f"Reduce dependency on low-reliability suppliers ({len(low_rel)} shipments affected)")

    high_loss = [d for d in decisions if d.get("total_loss_usd", 0) > 1000]
    if high_loss:
        recs.append(f"Review {len(high_loss)} shipments with loss > $1,000 — consider route optimization")

    cancel_count = sum(1 for d in decisions if d["action"] == "CANCEL")
    if cancel_count > 0:
        recs.append(f"{cancel_count} shipment(s) cancelled — evaluate supplier contracts")

    low_profit_dealers = [s for s in shipments
                          if s.get("dealer_profit_usd", 999) < 500 and s.get("dealer_order_frequency", 99) < 10]
    if low_profit_dealers:
        recs.append(f"{len(low_profit_dealers)} dealer(s) show low profitability and order frequency")

    if not recs:
        recs.append("All shipments within acceptable performance thresholds")

    return recs


def _empty_insights() -> dict:
    return {
        "profit_analysis": {"top_dealers": [], "low_performers": []},
        "supplier_performance": [],
        "loss_analysis": {"delay_induced_loss": 0, "cancellation_loss": 0,
                          "reroute_cost": 0, "total_loss": 0, "avg_route_distance_km": 0},
        "ai_recommendations": ["No shipment data yet — analyze shipments to generate insights"],
        "total_shipments": 0,
        "total_revenue_at_risk": 0,
        "avg_confidence": 0,
    }
