# SupplyChain AI — Decision, Compliance & Audit Engine

A production-grade prototype for logistics decision-making with real-world data integration, explainable AI, and full audit trails.

---

## Architecture

```
supplychain-ai/
├── backend/
│   ├── app/
│   │   ├── config.py            # Environment config
│   │   ├── models.py            # Pydantic data models
│   │   ├── api_integration.py   # Weather (OpenWeatherMap) + Routing (ORS / Nominatim)
│   │   ├── risk_engine.py       # Composite risk scoring
│   │   ├── simulation_engine.py # WAIT / REROUTE / CANCEL scenario generation
│   │   ├── compliance_engine.py # Hard constraint enforcement
│   │   ├── decision_engine.py   # Best option selection + confidence
│   │   ├── audit_engine.py      # Immutable decision trace
│   │   ├── explanation_engine.py# LLM or template-based explanation
│   │   └── main.py              # FastAPI routes
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── views/
        │   ├── Dashboard.jsx    # Shipment list + risk overview
        │   ├── DetailView.jsx   # Full decision breakdown + audit
        │   └── CommandView.jsx  # Command center + priority actions
        ├── components.jsx       # Shared UI components
        ├── api.js               # Axios API client
        └── App.jsx              # Navigation shell
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your API keys (see below)

# Run
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at: http://localhost:5173

---

## API Keys

| Key | Required | Purpose | Free Tier |
|-----|----------|---------|-----------|
| `OPENWEATHER_API_KEY` | Recommended | Live weather data | Yes — https://openweathermap.org/api |
| `ORS_API_KEY` | Optional | Real road routing | Yes — https://openrouteservice.org |
| `OPENAI_API_KEY` | Optional | Natural language explanations | Paid — falls back to templates |

**Without any keys:** The system uses Nominatim (OpenStreetMap) for geocoding + haversine distance, and template-based explanations. Everything still works end-to-end.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Analyze a shipment and get a decision |
| GET | `/api/audit/{id}` | Retrieve full audit trace by ID |
| GET | `/api/audits` | List all audit records |
| GET | `/api/shipments/sample` | Get sample shipment data |
| GET | `/health` | Health check |

### Example Request

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_id": "SHP-001",
    "origin": "Chicago",
    "destination": "Houston",
    "expected_delivery": "2025-01-09T12:00:00Z",
    "cargo_value_usd": 8500,
    "dealer_profit_usd": 1200,
    "dealer_order_frequency": 12,
    "dealer_payment_score": 0.70,
    "supplier_reliability": 0.55,
    "budget_usd": 600,
    "sla_hours": 36
  }'
```

---

## Decision Logic

```
Input Shipment
     │
     ├─► api_integration  → Weather risk factor + Route distance/cost
     │
     ├─► risk_engine       → Composite score (delay 40% + weather 30% + supplier 30%)
     │
     ├─► simulation_engine → 3 scenarios: WAIT / REROUTE / CANCEL
     │                       Each scored by: loss + cost + risk + delay × dealer value
     │
     ├─► compliance_engine → Reject options exceeding budget, SLA, or supplier threshold
     │
     ├─► decision_engine   → Select lowest-score valid option + confidence
     │
     ├─► explanation_engine→ LLM or template explanation
     │
     └─► audit_engine      → Immutable trace stored with full input/output
```

---

## Business Configuration (`.env`)

```env
FUEL_COST_PER_KM=0.12              # Transport cost per km
REROUTE_COST_MULTIPLIER=1.4        # Reroute cost vs base route
MAX_BUDGET_USD=5000                # Global budget ceiling
SLA_BREACH_THRESHOLD_HOURS=48      # Hours before SLA violation
MIN_SUPPLIER_RELIABILITY=0.6       # Minimum acceptable supplier score
```
