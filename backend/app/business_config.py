"""
business_config.py
Responsibility: Define per-business-type parameters that alter decision scoring.
Switching type changes delay penalties, priority weights, and acceptable delay thresholds.
"""

BUSINESS_TYPES = {
    "perishable": {
        "label": "Perishable Goods",
        "delay_penalty_multiplier": 3.0,   # spoilage cost is high
        "priority_weight": 1.5,
        "acceptable_delay_hours": 6.0,
        "cancel_threshold_hours": 12.0,    # cancel fast before goods spoil
    },
    "electronics": {
        "label": "Electronics",
        "delay_penalty_multiplier": 1.5,
        "priority_weight": 1.2,
        "acceptable_delay_hours": 24.0,
        "cancel_threshold_hours": 72.0,
    },
    "industrial": {
        "label": "Industrial / Heavy",
        "delay_penalty_multiplier": 0.8,   # delays are more tolerable
        "priority_weight": 0.9,
        "acceptable_delay_hours": 72.0,
        "cancel_threshold_hours": 168.0,
    },
}

DEFAULT_TYPE = "electronics"


def get_config(business_type: str) -> dict:
    return BUSINESS_TYPES.get(business_type, BUSINESS_TYPES[DEFAULT_TYPE])


def list_types() -> list:
    return [{"id": k, **v} for k, v in BUSINESS_TYPES.items()]
