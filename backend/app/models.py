from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ShipmentInput(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    expected_delivery: datetime
    cargo_value_usd: float
    dealer_profit_usd: float
    dealer_order_frequency: int
    dealer_payment_score: float        # 0.0 - 1.0
    supplier_reliability: float        # 0.0 - 1.0
    budget_usd: float
    sla_hours: float = 48.0
    # New optional fields
    user_id: Optional[str] = None
    supplier_id: Optional[str] = None
    dealer_id: Optional[str] = None
    business_type: Optional[str] = "electronics"   # perishable | electronics | industrial
    execution_mode: Optional[str] = "recommendation"  # recommendation | auto


class SupplierInput(BaseModel):
    name: str
    location: str
    reliability: float       # 0.0 - 1.0
    avg_delay: float         # hours
    cost_index: float        # 0.5 (cheap) - 2.0 (expensive)


class DealerInput(BaseModel):
    name: str
    location: str
    profit: float
    payment_delay: float     # days
    order_frequency: int     # per year


class WeatherData(BaseModel):
    condition: str
    description: str
    rain_probability: float
    risk_factor: float


class RouteData(BaseModel):
    distance_km: float
    estimated_travel_hours: float
    base_cost_usd: float
    origin_coords: Optional[List[float]] = None    # [lat, lon]
    dest_coords: Optional[List[float]] = None      # [lat, lon]


class RealWorldData(BaseModel):
    weather: WeatherData
    route: RouteData
    current_delay_hours: float
    eta_hours: Optional[float] = None
    delay_reason: Optional[str] = None


class Scenario(BaseModel):
    action: str
    cost_usd: float
    delay_hours: float
    total_loss_usd: float
    risk_score: float
    score: float
    valid: bool
    rejection_reason: Optional[str] = None


class ApprovalRequest(BaseModel):
    shipment_id: str
    audit_id: str
    recommended_action: str
    reason: str
    confidence: float
    requires_approval: bool
    auto_executed: bool = False


class Decision(BaseModel):
    chosen_action: str
    chosen_scenario: Scenario
    confidence_score: float
    all_scenarios: List[Scenario]
    risk_level: str
    action_steps: List[str]
    approval_request: Optional[ApprovalRequest] = None
    execution_status: Optional[str] = "pending"   # pending | approved | rejected | auto_executed


class AuditEntry(BaseModel):
    timestamp: datetime
    shipment_id: str
    user_id: Optional[str] = None
    input_data: dict
    real_world_data: dict
    scenarios: List[dict]
    rejected_options: List[dict]
    final_decision: dict
    explanation: str
    execution_status: Optional[str] = "pending"
    api_sources: Optional[List[str]] = None


class DecisionResponse(BaseModel):
    shipment_id: str
    risk_level: str
    real_world_data: RealWorldData
    scenarios: List[Scenario]
    decision: Decision
    explanation: str
    audit_id: str
