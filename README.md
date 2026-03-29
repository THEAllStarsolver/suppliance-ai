# SupplyChain AI — Decision, Compliance & Audit Engine

This is a full-stack supply chain decision platform I built to solve a real problem: when a shipment is delayed or at risk, what should actually happen? Most tools just show you a dashboard. This one tells you what to do, why, and keeps a record of every decision it made.

The system pulls live weather and routing data, simulates multiple action options, scores them against business constraints, picks the best one, and generates a plain-English explanation. Every decision is fully auditable — you can trace exactly how it arrived at any conclusion.

---

## Live Deployment

| | |
|---|---|
| Frontend | https://frontend-three-sigma-39.vercel.app |
| Backend API | https://supplychain-ai-backend.onrender.com |
| Swagger / API Docs | https://supplychain-ai-backend.onrender.com/docs |
| Health Check | https://supplychain-ai-backend.onrender.com/health |
| GitHub | https://github.com/THEAllStarsolver/suppliance-ai |

The backend is on Render's free tier, which spins down after 15 minutes of inactivity. The first request after that takes around 30 seconds. Everything after that is normal speed.

---

## Architecture

```
+------------------------------------------------------------------+
|                        Browser / User                            |
|          https://frontend-three-sigma-39.vercel.app              |
+------------------------------+-----------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|                   React Frontend  (Vercel)                       |
|                                                                  |
|   Dashboard         - shipment list, risk badges, analyze all   |
|   Detail View       - map, live data, scenarios, audit trail     |
|   Command Center    - priority-sorted actions, revenue at risk   |
|   Suppliers/Dealers - add and manage business entities           |
|   Insights          - profit analysis, supplier performance      |
|   Auth              - Firebase email/password login              |
|                                                                  |
+------------------------------+-----------------------------------+
                               |  REST (axios)
                               v
+------------------------------------------------------------------+
|                  FastAPI Backend  (Render)                       |
|          https://supplychain-ai-backend.onrender.com             |
|                                                                  |
|   POST  /api/analyze           core decision pipeline            |
|   GET   /api/audit/{id}        fetch full audit trace            |
|   POST  /api/approve/{id}      human approves a decision         |
|   POST  /api/reject/{id}       human rejects a decision          |
|   GET   /api/insights          aggregated BI data                |
|   POST  /api/suppliers         add a supplier                    |
|   POST  /api/dealers           add a dealer                      |
|   GET   /api/business-types    list available business configs   |
|   GET   /api/geocode           city name to coordinates          |
|   GET   /api/shipments/sample  sample data for demo              |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |                  Decision Pipeline                         |  |
|  |                                                            |  |
|  |   ShipmentInput                                            |  |
|  |        |                                                   |  |
|  |        v                                                   |  |
|  |   api_integration.py                                       |  |
|  |        - weather from OpenWeatherMap                       |  |
|  |        - road distance + travel time from OpenRouteService |  |
|  |        - lat/lon coordinates for map rendering             |  |
|  |        - Nominatim/OSM as fallback if ORS is down          |  |
|  |        |                                                   |  |
|  |        v                                                   |  |
|  |   risk_engine.py                                           |  |
|  |        - delay score        (weight: 35%)                  |  |
|  |        - weather risk       (weight: 25%)                  |  |
|  |        - supplier risk      (weight: 25%)                  |  |
|  |        - distance score     (weight: 15%)                  |  |
|  |        - adjusted by business type priority weight         |  |
|  |        |                                                   |  |
|  |        v                                                   |  |
|  |   simulation_engine.py                                     |  |
|  |        - WAIT   : current route, full delay, base cost     |  |
|  |        - REROUTE: alternate route, reduced delay, +40% cost|  |
|  |        - CANCEL : stop shipment, fixed penalty + lost profit|  |
|  |        - each scenario scored by loss + cost + risk + delay |  |
|  |        - dealer value multiplier applied to all scores     |  |
|  |        - business type delay penalty applied               |  |
|  |        - supplier cost_index scales transport cost         |  |
|  |        |                                                   |  |
|  |        v                                                   |  |
|  |   compliance_engine.py                                     |  |
|  |        - reject if cost exceeds shipment budget            |  |
|  |        - reject WAIT if supplier reliability below minimum |  |
|  |        - reject WAIT if projected delay breaches SLA       |  |
|  |        |                                                   |  |
|  |        v                                                   |  |
|  |   decision_engine.py                                       |  |
|  |        - pick lowest-score valid scenario                  |  |
|  |        - confidence = spread between top two scores        |  |
|  |        - CANCEL/ESCALATE trigger approval workflow         |  |
|  |        - auto-execute if confidence > 90% + auto mode on   |  |
|  |        - escalate if no valid options remain               |  |
|  |        |                                                   |  |
|  |        v                                                   |  |
|  |   explanation_engine.py                                    |  |
|  |        - sends structured facts to GPT-4o-mini             |  |
|  |        - LLM writes explanation only, never decides        |  |
|  |        - falls back to template if no OpenAI key           |  |
|  |        |                                                   |  |
|  |        v                                                   |  |
|  |   audit_engine.py                                          |  |
|  |        - records: input, API sources, all scenarios,       |  |
|  |          rejected options with reasons, final decision,    |  |
|  |          confidence, execution status, explanation         |  |
|  |        - filterable by user_id                             |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|   business_config.py   perishable / electronics / industrial     |
|   firebase_store.py    per-user suppliers, dealers, history      |
|   insights_engine.py   profit, loss, supplier, recommendations   |
|                                                                  |
+------------------+------------------+---------------------------+
                   |                  |                  |
                   v                  v                  v
         OpenWeatherMap      OpenRouteService          OpenAI
         live weather        real road routing       GPT-4o-mini
         + risk factor       + coordinates           explanations
```

---

## Module Breakdown

**api_integration.py**
Handles all external API calls. Fetches live weather from OpenWeatherMap and converts conditions into a risk factor (heavy rain = 0.8, clear = 0.05). Gets real road distance and travel time from OpenRouteService, including lat/lon coordinates used by the map. Falls back to Nominatim geocoding + haversine distance if ORS is unavailable.

**risk_engine.py**
Computes a single composite risk score from four inputs: current delay vs SLA, weather risk factor, supplier reliability (inverted), and route distance. Each input is weighted and the result is scaled by the business type's priority weight. Returns a score from 0 to 1 and a label (LOW / MEDIUM / HIGH / CRITICAL).

**simulation_engine.py**
Generates three scenarios for every shipment. WAIT keeps the current route and absorbs the full delay. REROUTE uses an alternate route at 1.4x cost but reduces delay by ~40%. CANCEL stops the shipment with a fixed penalty plus partial dealer profit loss. Each scenario is scored using a normalized formula that accounts for total loss, cost, risk, delay, and dealer importance.

**compliance_engine.py**
Acts as a hard filter before any decision is made. Rejects scenarios that exceed the shipment budget, flags WAIT as unsafe if supplier reliability is below the configured minimum, and rejects WAIT if the projected delay would breach the SLA threshold. Rejected scenarios stay in the output with a reason attached.

**decision_engine.py**
Picks the lowest-scoring valid scenario. Confidence is derived from the score spread between the top two options — a large gap means high confidence, similar scores mean low confidence. If the winning action is CANCEL or ESCALATE, it creates an approval request. If confidence is above 90% and the user has enabled auto-execution mode, it executes automatically. If no valid scenarios exist, it escalates.

**explanation_engine.py**
Takes the fully computed decision and sends structured facts to GPT-4o-mini with a prompt asking for a 3-4 sentence business-focused explanation. The LLM receives numbers and labels — it has no access to raw data and makes no decisions. Falls back to a deterministic template if no API key is configured.

**audit_engine.py**
Stores an immutable record of every decision. Each entry includes the original input, which external APIs were used, all simulated scenarios with scores, which options were rejected and why, the final decision with confidence and execution status, and the explanation. Records are filterable by user_id and retrievable by audit ID.

**business_config.py**
Defines three cargo types with different parameters. Perishable goods have a 3x delay penalty multiplier and a 12-hour cancel threshold. Electronics use 1.5x and 72 hours. Industrial cargo uses 0.8x and 168 hours. Switching the business type on a shipment changes the scenario scores and can change the final decision.

**firebase_store.py**
In-memory store (swap with Firestore in production) that keeps suppliers, dealers, and shipment history per user_id. Suppliers have reliability, average delay, and cost index fields that feed directly into risk scoring and simulation. Dealers have profit, payment delay, and order frequency that affect the dealer value multiplier.

**insights_engine.py**
Aggregates all audit records for a user into business intelligence. Shows top and low-performing dealers by net profit, supplier performance ranked by reliability and average loss per shipment, a breakdown of losses by type (delay, cancellation, reroute), and AI-generated recommendations based on patterns in the data.

---

## Scoring Formula

Each scenario gets a composite score. Lower is better.

```
score = (0.35 * total_loss/cargo_value
       + 0.30 * cost/cargo_value
       + 0.25 * risk_score
       + 0.10 * delay/168)
       * dealer_value_multiplier
```

The dealer value multiplier ranges from 0.8 to 1.5 based on order frequency, profit contribution, and payment behavior. High-value dealers make delays and losses more expensive in the scoring model, which pushes the system toward more aggressive action.

---

## Human-in-the-Loop

Any decision that involves cancelling or escalating a shipment triggers an approval request. The frontend shows a modal with the recommended action, the reason, and the confidence score. The user can approve or reject.

If the user has switched to auto-execution mode and the confidence score is above 90%, the system skips the approval and executes automatically. The audit record reflects which path was taken.

---

## Business Types

| Type | Delay Penalty | Acceptable Delay | Cancel Threshold |
|---|---|---|---|
| Perishable | 3x | 6 hours | 12 hours |
| Electronics | 1.5x | 24 hours | 72 hours |
| Industrial | 0.8x | 72 hours | 168 hours |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Maps | React-Leaflet, OpenStreetMap |
| Auth | Firebase Authentication |
| Backend | Python, FastAPI |
| Validation | Pydantic v2 |
| HTTP | httpx (async) |
| LLM | OpenAI GPT-4o-mini |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## External APIs

| API | What it's used for | Free tier |
|---|---|---|
| OpenWeatherMap | Live weather + risk factor | Yes |
| OpenRouteService | Road routing + geocoding + coordinates | Yes |
| OpenAI | Natural language explanations | No (paid) |
| Firebase | User authentication | Yes |
| Nominatim / OSM | Geocoding fallback | Yes |

---

## Running Locally

```bash
# backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# add your API keys to .env
uvicorn app.main:app --reload --port 8080

# frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Project Structure

```
supplychain-ai/
  backend/
    app/
      main.py
      models.py
      config.py
      api_integration.py
      risk_engine.py
      simulation_engine.py
      compliance_engine.py
      decision_engine.py
      audit_engine.py
      explanation_engine.py
      business_config.py
      firebase_store.py
      insights_engine.py
    requirements.txt
    Procfile
    railway.json
  frontend/
    src/
      views/
        Dashboard.jsx
        DetailView.jsx
        CommandView.jsx
        EntityManager.jsx
        InsightsView.jsx
        AuthView.jsx
      components/
        ShipmentMap.jsx
        ApprovalModal.jsx
      App.jsx
      AuthContext.jsx
      api.js
      firebase.js
```

---

## Environment Variables

```
OPENWEATHER_API_KEY     from openweathermap.org/api
ORS_API_KEY             from openrouteservice.org
OPENAI_API_KEY          from platform.openai.com
FUEL_COST_PER_KM        default 0.12
REROUTE_COST_MULTIPLIER default 1.4
MAX_BUDGET_USD          default 5000
SLA_BREACH_THRESHOLD_HOURS  default 48
MIN_SUPPLIER_RELIABILITY    default 0.6
```

---

## Demo

Go to https://frontend-three-sigma-39.vercel.app and click "Continue as Demo User" — no account needed. To test the full flow, go to the Dashboard and click "Analyze All" to run the decision engine on all three sample shipments. Then click any row to see the full breakdown including the map, scenario comparison, and audit trail.
