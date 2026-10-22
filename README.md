# Real-Time Flood Prediction and Early Warning System Using Machine Learning for Tamil Nadu River Basins

An end-to-end, full-stack decision-support platform designed for real-time flood monitoring, machine learning flood-risk forecasting, and automated early warnings across major river basins in Tamil Nadu, India.

Built for college final-year engineering projects, academic capstones, hackathon demonstrations, and research prototypes.

---

## 🌊 Key Features

- **7 Major Tamil Nadu River Basins**: Cauvery, Thamirabarani, Vaigai, Palar, Pennaiyar (Thenpennai), Bhavani, and Amaravathi.
- **22 Verified Monitoring Stations**: Authentic CWC and State WRD gauge stations with genuine Mean Sea Level Zero Gauge, Warning Level, Danger Level, and Highest Flood Level (HFL) benchmarks.
- **Supervised Machine Learning Ensemble**:
  - **Random Forest Classifier**: Classifies flood risks into **Low**, **Moderate**, **High**, and **Critical** categories.
  - **Random Forest Regressor**: Estimates the 24-hour ahead river gauge stage ($m\text{ MSL}$) with an MAE of $\approx 0.15\text{ m}$.
  - **Calibrated Probabilities**: Provides flood probability percentages.
  - **Explainable AI**: Gini feature importance ranking showing real-time factor weights.
- **Interactive Geospatial Map**: Leaflet and OpenStreetMap integration showing stations with risk-coded markers (Green, Yellow, Orange, Red) and telemetry popups.
- **Automated Early Warning Engine**:
  - Triggers alerts when observed or predicted water levels exceed warning/danger marks.
  - **Duplicate Alert Suppression**: Built-in 4-hour window suppression preventing alert fatigue.
  - **Official SOP Safety Advisories**: Actionable protocols for District Emergency Operation Centers (DEOC 1077), SDRF/NDRF, and public advisories.
  - Multi-stage lifecycle: **Active** ➔ **Acknowledged** ➔ **Resolved**.
- **Interactive Scenario Simulation Testbed**: Real-time slider controls for rainfall, upstream discharge, gauge rate of change, and soil moisture with quick presets (*Cyclone Michaung Deluge*, *Mettur Dam Surplus Release*, *Dry Season Baseline*).
- **Historical Hydrological Analytics**: Dual-axis precipitation vs water level time series, seasonal cyclonic trends, and permitted CSV dataset export.
- **Transparent Data Ingestion Layer**: Pluggable provider architecture supporting Open-Meteo live numerical weather prediction, Central Water Commission (CWC), and IMD AWS feeds with a clear **DEMO MODE** status banner.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Data Layer
        CWC[CWC & TN WRD Telemetry]
        IMD[IMD & Open-Meteo AWS]
        DEMO[Calibrated Demo Mode Dataset]
    end

    subgraph Backend Core (FastAPI + SQLAlchemy)
        DP[Data Provider Layer]
        DB[(SQLite / PostgreSQL DB)]
        ALERT[Early Warning Alert Engine]
        ML[Random Forest ML Pipeline]
        ROUTERS[REST API Endpoints]
    end

    subgraph Frontend Client (React 19 + TypeScript + Vite)
        DASH[1. Dashboard Overview]
        LIVE[2. Live Monitoring]
        PRED[3. Scenario Predictor]
        MAP[4. Leaflet Basin Map]
        WARN[5. Alert Command Center]
        HIST[6. Historical Analytics]
        PERF[7. Model Performance]
        ABOUT[8. Methodology & Safety]
        SRC[9. Data Sources & Limits]
    end

    Data Layer --> DP
    DP --> DB
    DB --> ROUTERS
    ML --> ROUTERS
    ALERT --> ROUTERS
    ROUTERS <--> Frontend Client
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts, Leaflet, Lucide React |
| **Backend** | Python 3.14+, FastAPI, Uvicorn, SQLAlchemy 2.0 ORM, Pydantic v2 |
| **Machine Learning** | Scikit-learn (RandomForestClassifier, RandomForestRegressor), NumPy, Pandas, Joblib |
| **Database** | SQLite (default for development; easily adaptable to PostgreSQL via `DATABASE_URL`) |
| **Testing** | Pytest, FastAPI TestClient, AnyIO |

---

## 📂 Project Structure

```
tn-flood-warning-system/
├── backend/
│   ├── app/
│   │   ├── alerts/
│   │   │   ├── engine.py              # Alert threshold engine & duplicate suppression
│   │   │   └── notification_service.py # Emergency broadcast interface
│   │   ├── data_providers/
│   │   │   ├── base.py                # Abstract DataSourceProvider interface
│   │   │   ├── cwc_provider.py        # Central Water Commission telemetry interface
│   │   │   └── open_meteo_provider.py # Open-Meteo live weather precipitation
│   │   ├── ml/
│   │   │   ├── features.py            # Feature engineering vector extraction
│   │   │   └── model.py               # ML inference pipeline & explainability
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── flood_models.py        # SQLAlchemy relational schema
│   │   ├── routers/
│   │   │   ├── alerts.py              # GET/POST /api/alerts
│   │   │   ├── basins.py              # GET /api/basins
│   │   │   ├── dashboard.py           # GET /api/dashboard/summary
│   │   │   ├── datasources.py         # GET /api/datasources/status
│   │   │   ├── health.py              # GET /api/health
│   │   │   ├── history.py             # GET /api/history & CSV export
│   │   │   ├── model_metrics.py       # GET /api/model/metrics
│   │   │   ├── observations.py        # GET /api/observations
│   │   │   ├── predictions.py         # POST /api/predictions/run
│   │   │   └── stations.py            # GET /api/stations & /api/stations/{id}
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── flood_schemas.py       # Pydantic v2 models
│   │   ├── config.py                  # Environment configurations & thresholds
│   │   ├── database.py                # Database connection session maker
│   │   └── main.py                    # FastAPI application setup
│   ├── data/
│   │   └── tamilnadu_flood_historical_dataset.csv  # 15,000+ historical records
│   ├── ml_models/
│   │   ├── flood_risk_classifier.joblib # Trained Random Forest Classifier
│   │   ├── water_level_regressor.joblib # Trained Random Forest Regressor
│   │   └── model_metrics.json          # Precision, Recall, F1, Confusion Matrix
│   ├── ml_training/
│   │   ├── dataset_generator.py       # Realistic 2021-2026 TN flood dataset generator
│   │   └── train.py                   # Time-aware split training pipeline
│   ├── tests/
│   │   └── test_flood_api.py          # Pytest suite (11 unit & integration tests)
│   ├── requirements.txt
│   ├── .env.example
│   └── seed_data.py                   # Initializes tables, seeds basins & telemetry
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertBanner.tsx        # Top critical alert notice
│   │   │   ├── MetricCard.tsx         # Reusable disaster KPI card
│   │   │   ├── Navbar.tsx             # Header bar with live status indicator
│   │   │   ├── RiskBadge.tsx          # Accessible color-coded risk badge
│   │   │   └── Sidebar.tsx            # Navigation drawer across 9 views
│   │   ├── pages/
│   │   │   ├── AboutPage.tsx          # Methodology, architecture & safety contacts
│   │   │   ├── AlertsPage.tsx         # Early warning command & officer workflow
│   │   │   ├── BasinMapPage.tsx       # Leaflet Tamil Nadu basin map
│   │   │   ├── DashboardPage.tsx      # Executive overview & risk distribution
│   │   │   ├── DataSourcesPage.tsx    # CWC/IMD provider status & limitations
│   │   │   ├── FloodPredictionPage.tsx# Interactive ML scenario simulation testbed
│   │   │   ├── HistoricalAnalyticsPage.tsx # Dual-axis charts & CSV export
│   │   │   ├── LiveMonitoringPage.tsx # 22 stations telemetry & gauge progress
│   │   │   └── ModelPerformancePage.tsx # Confusion matrix & evaluation report
│   │   ├── services/
│   │   │   └── api.ts                 # Typed fetch client
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript data definitions
│   │   ├── App.tsx                    # Main client root
│   │   ├── main.tsx
│   │   └── index.css                  # Tailwind styles & dark navy theme
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## ⚡ Installation & Setup Guide

### Prerequisites
- **Python**: 3.10 to 3.14+
- **Node.js**: v18+ with `npm`
- **Operating System**: Windows (PowerShell), Linux, or macOS

---

### Step 1: Backend Setup & ML Model Training

Open a Windows PowerShell terminal in the repository root:

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Install backend Python dependencies
py -m pip install -r requirements.txt

# 3. Generate realistic historical dataset and train the ML models
$env:PYTHONPATH = (Get-Location).Path
py -m ml_training.train

# 4. Seed the database with verified Tamil Nadu stations and baseline telemetry
py seed_data.py
```

---

### Step 2: Run Backend Tests

Verify database initialization, API health, duplicate alert suppression, and ML prediction logic:

```powershell
py -m pytest -v
```

All 11 tests should pass:
```
tests/test_flood_api.py::test_health_check PASSED                        [  9%]
tests/test_flood_api.py::test_get_dashboard_summary PASSED               [ 18%]
tests/test_flood_api.py::test_get_basins PASSED                          [ 27%]
tests/test_flood_api.py::test_get_stations PASSED                        [ 36%]
tests/test_flood_api.py::test_get_station_detail PASSED                  [ 45%]
tests/test_flood_api.py::test_prediction_runner_and_explainability PASSED [ 54%]
tests/test_flood_api.py::test_prediction_invalid_station PASSED          [ 63%]
tests/test_flood_api.py::test_alert_duplicate_suppression PASSED         [ 72%]
tests/test_flood_api.py::test_alert_acknowledge_and_resolve PASSED       [ 81%]
tests/test_flood_api.py::test_model_metrics_endpoint PASSED              [ 90%]
tests/test_flood_api.py::test_data_sources_status PASSED                 [100%]
======================= 11 passed in 2.89s =======================
```

---

### Step 3: Start the FastAPI Backend Server

```powershell
py -m uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

---

### Step 4: Frontend Setup & Launch

Open a second terminal window:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (if not already done)
npm install

# 3. Start development server
npm run dev
```

Open your browser to: **`http://localhost:3000`**

---

## 📊 Machine Learning Model Evaluation Report

The machine learning pipeline implements a strict **time-aware chronological split** (First 80% train window: Jan 2021 to Aug 2025; Last 20% test window: Aug 2025 to Sep 2026) to prevent temporal data leakage:

### Classification Metrics (Random Forest Classifier - 120 Estimators)
- **Overall Accuracy**: **97.63%**
- **Weighted Precision**: **97.65%**
- **Weighted Recall**: **97.63%**
- **Weighted F1-Score**: **97.64%**

### Multi-Class Confusion Matrix (Test Split)
| Actual \ Predicted | Low | Moderate | High | Critical |
|---|---|---|---|---|
| **Low** | 118 | 5 | 0 | 0 |
| **Moderate** | 4 | 1,590 | 22 | 5 |
| **High** | 0 | 18 | 102 | 3 |
| **Critical** | 0 | 6 | 8 | 1,119 |

### Regression Metrics (Random Forest Regressor - 24-Hour Stage Forecast)
- **Mean Absolute Error (MAE)**: **0.1555 m**
- **Root Mean Squared Error (RMSE)**: **0.2245 m**
- **Coefficient of Determination ($R^2$)**: **0.9998**

### Top 5 Predictor Features by Gini Importance
1. `water_level_to_danger_ratio` (38.4%) - Immediate proximity of water surface to Danger Mark.
2. `rainfall_24h_mm` (22.1%) - Catchment rainfall volume over 24 hours.
3. `current_water_level_m` (14.6%) - Absolute river stage in meters MSL.
4. `upstream_water_level_m` (8.5%) - Gauge height at upstream stations.
5. `rate_of_change_m_hr` (6.2%) - Speed of river rise in meters per hour.

---

## 🚨 Early Warning Engine & Standard Operating Procedures (SOP)

| Risk Level | Trigger Criteria | Actionable Protocol |
|---|---|---|
| **LOW** | Gauge $< 78\%$ danger level, normal rain | Standard routine automated telemetry logging. |
| **MODERATE** | Gauge $78\%\text{--}88\%$ danger level, or $R_{24h} > 45\text{ mm}$ | Increase reading frequency to hourly; inspect sluice gates and check dams. |
| **HIGH** | Gauge $\ge \text{Warning Level}$, or $R_{24h} > 64.5\text{ mm}$ | Issue precautionary flood advisory; alert downstream irrigation engineers; prepare relief centers. |
| **CRITICAL** | Gauge $\ge \text{Danger Level}$, or 24h forecast breaches danger mark | **Urgent evacuation** of low-lying riverbank settlements; activate District Emergency Operations Center (DEOC 1077); deploy SDRF/NDRF boat teams; cut power to inundated transformers. |

---

## 🌐 Configuring Genuine Data Sources vs. DEMO MODE

By default, the application runs in **DEMO MODE (`DEMO_MODE=true` in `backend/.env`)** using calibrated synthetic observations reflecting authentic historical episodes (such as Cyclone Michaung and Mettur flood discharges).

To configure live external weather forecasting:
1. In `backend/.env`, set:
   ```env
   WEATHER_API_PROVIDER=open-meteo
   DEMO_MODE=false
   ```
2. The `open_meteo_provider.py` module automatically fetches live precipitation, soil moisture, and temperature using station latitude/longitude coordinates without requiring paid API keys.
3. For Central Water Commission telemetry, add authorized CWC credentials in `cwc_provider.py`.

---

## ⚠️ Public Safety Disclaimer

> [!IMPORTANT]
> This application provides experimental flood-risk estimates for academic research, engineering capstones, and disaster decision support. Predictions may be delayed or subject to sensor noise. Follow official warnings and instructions from the **Tamil Nadu State Disaster Management Authority (TNSDMA)**, District Collectors, and Central Water Commission.
>
> **Do not use this application as the sole basis for evacuation or life-critical safety decisions.**
>
> **Tamil Nadu Emergency Helplines:**
> - State Disaster Helpline: **1070** (24x7, Toll-Free)
> - District Disaster Helpline: **1077** (All Districts)
