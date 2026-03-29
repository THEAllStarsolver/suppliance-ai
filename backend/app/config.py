import os
from dotenv import load_dotenv

load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
ORS_API_KEY = os.getenv("ORS_API_KEY", "")  # OpenRouteService
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

FUEL_COST_PER_KM = float(os.getenv("FUEL_COST_PER_KM", "0.12"))  # USD per km
REROUTE_COST_MULTIPLIER = float(os.getenv("REROUTE_COST_MULTIPLIER", "1.4"))
MAX_BUDGET_USD = float(os.getenv("MAX_BUDGET_USD", "5000"))
SLA_BREACH_THRESHOLD_HOURS = float(os.getenv("SLA_BREACH_THRESHOLD_HOURS", "48"))
MIN_SUPPLIER_RELIABILITY = float(os.getenv("MIN_SUPPLIER_RELIABILITY", "0.6"))
