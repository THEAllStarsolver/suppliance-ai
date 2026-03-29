# SupplyChain AI — Decision, Compliance & Audit Engine

> A production-grade supply chain decision platform with real-world data integration, explainable AI, human-in-the-loop approvals, and full audit trails.

---

## 🚀 Live Deployment

| Service | URL | Status |
|---|---|---|
| **Frontend** | https://frontend-three-sigma-39.vercel.app | ✅ Live on Vercel |
| **Backend API** | https://supplychain-ai-backend.onrender.com | ✅ Live on Render |
| **API Docs** | https://supplychain-ai-backend.onrender.com/docs | ✅ Swagger UI |
| **Health Check** | https://supplychain-ai-backend.onrender.com/health | ✅ Live |

> ⚠️ Backend is on Render free tier — first request after 15 min inactivity takes ~30s to wake up.

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                               │
│                  https://frontend-three-sigma-39.vercel.app         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND — Vercel                               │
│                        React + Vite                                 │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │  Dashboard  │  │ Shipment     │  │   Command Center        │   │
│  │  (list +    │  │ Detail       │  │   (priority actions +   │   │
│  │  risk view) │  │ (map +       │  │    revenue at risk)     │   │
│  └─────────────┘  │  scenarios + │  └─────────────────────────┘   │
│                   │  audit)      │                                  │
│  ┌─────────────┐  └──────────────┘  ┌─────────────────────────┐   │
│  │ Suppliers & │                    │   Insights (BI)         │   │
│  │ Dealers     │                    │   (profit + supplier    │   │
│  │ Manager     │                    │    performance)         │   │
│  └─────────────┘                    └─────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Firebase Auth (decision-audit-engine.firebaseapp.com)       │  │
│  │  Email/Password login — per-user data isolation              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST API (axios)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   BACKEND — Render (FastAPI)                        │
│           https://supplychain-ai-backend.onrender.com               │
│                                                                     │
│  POST /api/analyze          ← Core decision pipeline               │
│  GET  /api/audit/{id}       ← Fetch audit trace                    │
│  POST /api/approve/{id}     ← Human approval                       │
│  POST /api/reject/{id}      ← Human rejection                      │
│  GET  /api/insights         ← BI aggregations                      │
│  POST /api/suppliers        ← Add supplier                         │
│  POST /api/dealers          ← Add dealer                           │
│  GET  /api/business-types   ← Config options                       │
│  GET  /api/geocode          ← City → coordinates                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   DECISION PIPELINE                         │   │
│  │                                                             │   │
│  │  ShipmentInput                                              │   │
│  │       │                                                     │   │
│  │       ▼                                                     │   │
│  │  api_integration.py  ──► OpenWeatherMap (weather)          │   │
│  │       │                ──► OpenRouteService (routing)       │   │
│  │       │                ──► Nominatim/OSM (fallback)         │   │
│  │       ▼                                                     │   │
│  │  risk_engine.py                                             │   │
│  │  (delay 35% + weather 25% + supplier 25% + distance 15%)   │   │
│  │       │                                                     │   │
│  │       ▼                                                     │   │
│  │  simulation_engine.py                                       │   │
│  │  (WAIT / REROUTE / CANCEL scenarios)                        │   │
│  │  (business type penalty × supplier cost_index)              │   │
│  │       │                                                     │   │
│  │       ▼                                                     │   │
│  │  compliance_engine.py                                       │   │
│  │  (budget / SLA / supplier reliability filters)              │   │
│  │       │                                                     │   │
│  │       ▼                                                     │   │
│  │  decision_engine.py                                         │   │
│  │  (lowest score wins + confidence + approval logic)          │   │
│  │       │                                                     │   │
│  │       ▼                                                     │   │
│  │  explanation_engine.py ──► OpenAI GPT-4o-mini (LLM)        │   │
│  │  (LLM explains only — never decides)                        │   │
│  │       │                                                     │   │
│  │       ▼                                                     │   │
│  │  audit_engine.py                                            │   │
│  │  (immutable trace: input → API data → scores →             │   │
│  │   rejections → decision → explanation)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ business_config  │  │ firebase_store  │  │ insights_engine  │  │
│  │ perishable /     │  │ per-user        │  │ profit / loss /  │  │
│  │ electronics /    │  │ suppliers,      │  │ supplier perf /  │  │
│  │ industrial       │  │ dealers,        │  │ AI recs          │  │
│  └──────────────────┘  │ shipments       │  └──────────────────┘  │
│                        └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  OpenWeatherMap │  │OpenRouteService │  │  OpenAI          │
│  Live weather   │  │Real road routing│  │  GPT-4o-mini     │
│  + risk factor  │  │+ coordinates    │  │  Explanations    │
└─────────────────┘  └─────────────────┘  └──────────────────┘
```

---

## 🧩 Module Responsibilities

| Module | Responsibility |
|---|---|
| `api_integration.py` | Fetches live weather + real road routing + geocoordinates |
| `risk_engine.py` | Weighted composite risk: delay 35% + weather 25% + supplier 25% + distance 15% |
| `simulation_engine.py` | Generates WAIT / REROUTE / CANCEL with cost, delay, loss per business type |
| `compliance_engine.py` | Rejects options violating budget, SLA, or supplier reliability |
| `decision_engine.py` | Picks best option, computes confidence, triggers approval workflow |
| `audit_engine.py` | Immutable step-by-step trace of every decision |
| `explanation_engine.py` | GPT-4o-mini explains decisions — never computes them |
| `business_config.py` | Perishable / Electronics / Industrial penalty multipliers |
| `firebase_store.py` | Per-user supplier, dealer, shipment history |
| `insights_engine.py` | Profit analysis, supplier performance, loss breakdown, AI recommendations |

---

## 🎯 Key Features

- **Real-world data** — Live weather (OpenWeatherMap) + real road distances (OpenRouteService)
- **Multi-user** — Firebase Auth with per-user data isolation
- **Geo-aware map** — Leaflet map with real coordinates, risk-colored route, simulated shipment position
- **Business types** — Perishable / Electronics / Industrial with different penalty multipliers
- **Supplier-aware** — Supplier reliability, avg delay, cost index influence every decision
- **Human-in-the-loop** — CANCEL/ESCALATE actions require human approval (or auto-execute at >90% confidence)
- **Full audit trail** — Step-by-step reasoning trace for every decision
- **BI Insights** — Profit analysis, supplier performance, loss breakdown, AI recommendations
- **Explainable AI** — LLM converts structured decisions into natural language (never decides)

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Pure CSS (dark theme) |
| Maps | React-Leaflet + OpenStreetMap |
| Auth | Firebase Authentication |
| Backend | Python 3.14 + FastAPI |
| HTTP Client | httpx (async) |
| Data Models | Pydantic v2 |
| LLM | OpenAI GPT-4o-mini |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## 🌐 External APIs

| API | Purpose | Key Required |
|---|---|---|
| OpenWeatherMap | Live weather + risk factor | Yes |
| OpenRouteService | Real road routing + geocoding | Yes |
| OpenAI GPT-4o-mini | Natural language explanations | Yes |
| Firebase Auth | Multi-user authentication | Yes |
| Nominatim (OSM) | Geocoding fallback | No |

---

## 🏃 Run Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env        # add your API keys
uvicorn app.main:app --reload --port 8080

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 📁 Project Structure

```
supplychain-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI routes
│   │   ├── models.py               # Pydantic data models
│   │   ├── config.py               # Environment config
│   │   ├── api_integration.py      # Weather + routing APIs
│   │   ├── risk_engine.py          # Risk scoring
│   │   ├── simulation_engine.py    # Scenario generation
│   │   ├── compliance_engine.py    # Constraint enforcement
│   │   ├── decision_engine.py      # Decision selection + approval
│   │   ├── audit_engine.py         # Audit trail
│   │   ├── explanation_engine.py   # LLM explanations
│   │   ├── business_config.py      # Business type configs
│   │   ├── firebase_store.py       # Per-user data store
│   │   └── insights_engine.py      # BI aggregations
│   ├── requirements.txt
│   ├── Procfile
│   └── railway.json
└── frontend/
    └── src/
        ├── views/
        │   ├── Dashboard.jsx       # Shipment list
        │   ├── DetailView.jsx      # Full decision + map
        │   ├── CommandView.jsx     # Priority actions
        │   ├── EntityManager.jsx   # Suppliers & dealers
        │   ├── InsightsView.jsx    # BI dashboard
        │   └── AuthView.jsx        # Login / register
        ├── components/
        │   ├── ShipmentMap.jsx     # Leaflet map
        │   └── ApprovalModal.jsx   # Human approval
        ├── App.jsx
        ├── AuthContext.jsx
        ├── api.js
        └── firebase.js
```

---

## 👤 Demo Login

Visit **https://frontend-three-sigma-39.vercel.app** and click **"Continue as Demo User"** — no registration needed.
