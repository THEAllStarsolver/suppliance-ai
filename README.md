# SupplyChain AI — Decision, Compliance & Audit Engine

A supply chain decision-making system built for logistics companies. Given a shipment, it pulls live weather and routing data, simulates multiple action scenarios, scores them, picks the best one, and explains why — with a full audit trail of every decision.

Built as a hackathon prototype but designed to feel like something a real logistics company could actually use.

---

## Live Links

- Frontend: https://frontend-three-sigma-39.vercel.app
- Backend API: https://supplychain-ai-backend.onrender.com
- API Docs: https://supplychain-ai-backend.onrender.com/docs
- Health: https://supplychain-ai-backend.onrender.com/health

Note: The backend runs on Render's free tier, so the first request after 15 minutes of inactivity takes about 30 seconds to wake up. After that it's fast.

---

## What it does

You give it a shipment — origin, destination, cargo value, dealer info, supplier reliability, budget, SLA. It then:

1. Fetches live weather for the destination city
2. Gets real road distance and travel time via OpenRouteService
3. Calculates how delayed the shipment currently is
4. Scores the risk based on delay, weather, supplier reliability, and distance
5. Simulates three options: wait, reroute, or cancel
6. Filters out options that violate budget or SLA constraints
7. Picks the best option using a weighted scoring model
8. Asks for human approval if the action is high-impact (cancel, escalate)
9. Generates a plain-English explanation of the decision
10. Stores a full audit trace of everything that happened

---

## Architecture

```
Browser
  |
  v
React frontend (Vercel)
  - Dashboard: list of shipments with risk indicators
  - Detail view: map, scenarios, decision, audit trail
  - Command center: priority-sorted actions across all shipments
  - Suppliers and dealers manager
  - Business intelligence / insights view
  - Firebase auth (email + password, per-user data)
  |
  v
FastAPI backend (Render)
  |
  |-- api_integration.py   fetches weather and routing from external APIs
  |-- risk_engine.py       computes composite risk score
  |-- simulation_engine.py generates wait / reroute / cancel scenarios
  |-- compliance_engine.py filters out options that break constraints
  |-- decision_engine.py   picks best option, handles approval workflow
  |-- explanation_engine.py converts decision to plain English via LLM
  |-- audit_engine.py      stores immutable trace of every decision
  |-- business_config.py   perishable / electronics / industrial configs
  |-- firebase_store.py    per-user suppliers, dealers, shipment history
  |-- insights_engine.py   aggregates data into business intelligence
  |
  v
External APIs
  - OpenWeatherMap: live weather conditions and risk factor
  - OpenRouteService: real road distances, travel time, coordinates
  - OpenAI GPT-4o-mini: natural language explanations only (never decides)
  - Firebase: user authentication
  - Nominatim / OSM: geocoding fallback when ORS is unavailable
```

---

## Decision logic

The scoring model is straightforward and fully transparent:

Risk score = delay (35%) + weather (25%) + supplier reliability (25%) + distance (15%)

Each scenario (wait, reroute, cancel) gets a composite score based on total loss, cost, risk, and delay — adjusted by how valuable the dealer is. Lower score wins.

Before finalizing, the compliance layer rejects any option that exceeds the shipment budget, breaches the SLA threshold, or relies on an unreliable supplier.

If the winning action is a cancellation or escalation, the system flags it for human approval unless confidence is above 90% and the user has enabled auto-execution mode.

The LLM only receives the final structured output and converts it to plain English. It has no role in the actual decision.

---

## Business types

The system supports three cargo types, each with different delay penalty multipliers:

- Perishable: 3x penalty, cancel threshold at 12 hours
- Electronics: 1.5x penalty, cancel threshold at 72 hours
- Industrial: 0.8x penalty, cancel threshold at 168 hours

Switching the business type changes the scenario scores and can change the final decision.

---

## Tech stack

- Frontend: React 18, Vite, React-Leaflet, Firebase SDK
- Backend: Python, FastAPI, httpx, Pydantic v2
- LLM: OpenAI GPT-4o-mini (explanation only)
- Auth: Firebase Authentication
- Maps: Leaflet with OpenStreetMap tiles
- Frontend hosting: Vercel
- Backend hosting: Render

---

## Running locally

```bash
# backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# fill in your API keys in .env
uvicorn app.main:app --reload --port 8080

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Project structure

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

## API keys needed

- OpenWeatherMap: https://openweathermap.org/api (free tier)
- OpenRouteService: https://openrouteservice.org (free tier)
- OpenAI: https://platform.openai.com (paid, falls back to templates if missing)
- Firebase: https://console.firebase.google.com (free)

---

## Demo

Go to https://frontend-three-sigma-39.vercel.app and click "Continue as Demo User" to try it without registering.
