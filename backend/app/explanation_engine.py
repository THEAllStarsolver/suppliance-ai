"""
explanation_engine.py
Responsibility: Convert structured decision data into natural language using an LLM.
The LLM receives only pre-computed facts — it does NOT make decisions.
Falls back to a template-based explanation if no LLM key is configured.
"""
from app.models import ShipmentInput, Decision, RealWorldData
from app.config import OPENAI_API_KEY
import logging

logger = logging.getLogger(__name__)


async def explain(shipment: ShipmentInput, rw: RealWorldData, decision: Decision) -> str:
    structured = _build_structured_summary(shipment, rw, decision)

    if OPENAI_API_KEY:
        try:
            return await _llm_explain(structured)
        except Exception as e:
            logger.error(f"LLM explanation failed: {e}")

    return _template_explain(structured)


def _build_structured_summary(shipment: ShipmentInput, rw: RealWorldData, decision: Decision) -> dict:
    rejected = [
        {"action": s.action, "reason": s.rejection_reason}
        for s in decision.all_scenarios if not s.valid
    ]
    return {
        "shipment_id": shipment.shipment_id,
        "origin": shipment.origin,
        "destination": shipment.destination,
        "chosen_action": decision.chosen_action,
        "chosen_cost": decision.chosen_scenario.cost_usd,
        "chosen_loss": decision.chosen_scenario.total_loss_usd,
        "chosen_delay": decision.chosen_scenario.delay_hours,
        "confidence": decision.confidence_score,
        "risk_level": decision.risk_level,
        "weather": rw.weather.description,
        "weather_risk": rw.weather.risk_factor,
        "distance_km": rw.route.distance_km,
        "current_delay_hours": rw.current_delay_hours,
        "rejected": rejected,
        "action_steps": decision.action_steps,
    }


async def _llm_explain(data: dict) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    rejected_text = ""
    for r in data["rejected"]:
        rejected_text += f"\n- {r['action']} was rejected: {r['reason']}"

    prompt = f"""You are a logistics decision analyst. Explain the following supply chain decision in 3-4 concise sentences for a business user.

Shipment {data['shipment_id']} from {data['origin']} to {data['destination']} ({data['distance_km']} km).
Current delay: {data['current_delay_hours']:.1f} hours. Weather: {data['weather']} (risk factor: {data['weather_risk']}).
Decision: {data['chosen_action']} — estimated cost ${data['chosen_cost']:.0f}, total loss ${data['chosen_loss']:.0f}, delay {data['chosen_delay']:.1f}h.
Confidence: {data['confidence']:.0%}. Risk level: {data['risk_level']}.
Rejected options:{rejected_text if rejected_text else ' None'}

Explain why this decision was chosen and why alternatives were rejected. Be direct and business-focused."""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


def _template_explain(data: dict) -> str:
    lines = [
        f"Decision for shipment {data['shipment_id']}: {data['chosen_action']} was selected "
        f"with an estimated cost of ${data['chosen_cost']:.0f} and total loss of ${data['chosen_loss']:.0f}.",
        f"The shipment from {data['origin']} to {data['destination']} ({data['distance_km']} km) "
        f"is currently delayed by {data['current_delay_hours']:.1f} hours under {data['weather']} conditions "
        f"(weather risk: {data['weather_risk']:.0%}).",
        f"Risk level is {data['risk_level']} with a decision confidence of {data['confidence']:.0%}.",
    ]
    if data["rejected"]:
        rejections = "; ".join(f"{r['action']} ({r['reason']})" for r in data["rejected"])
        lines.append(f"Rejected alternatives: {rejections}.")
    lines.append("Recommended next steps: " + " → ".join(data["action_steps"]) + ".")
    return " ".join(lines)
