# Namaz Recorder 🕌

> **"Apni Masjid ke Waqt ke Mutabiq Smart aur Khud-kaar Namaz Tracker"**  
> Scalable, Automated & Minimal Soft-Green Prayer Tracking Platform (Android & Enterprise Backend API).

---

## 🌟 Key Features

1. **Smart Home Screen & Prominent Countdown**:
   - Bold, highlighted card for the next prayer with live countdown timer.
   - Smooth shifting as prayer times pass.
2. **Local Masjid Timings & Quick Adjuster**:
   - Customizable jamaat timings with `+5 min / -5 min` instant adjustments.
   - Dynamic sunset calculation for automatic Maghrib updates.
   - Automatic Friday switch to **Jumu'ah Mode** (Khutbah & Jamaat times).
3. **Masjid Location Zone Auto-Tracking (Geofencing)**:
   - High-precision Haversine geofence evaluator (`75m` customizable radius).
   - Automatically marks prayer as `Prayed at Masjid` with zero battery drain outside prayer windows.
4. **Pocket Motion Sensor State Machine**:
   - Rule-based detection of **Qiyam $\rightarrow$ Ruku $\rightarrow$ Sujood $\rightarrow$ Jalsa $\rightarrow$ Sujood** posture patterns.
   - No external AI needed; uses on-device tilt and acceleration physics.
5. **Auto-Silent at Jamaat Time**:
   - Automatically silences phone during jamaat and restores sound afterwards.
6. **Smart 1-Tap Fallback Prompt & Manual Edit**:
   - Non-intrusive prompt if prayer passed unrecorded (e.g., phone left at home).
   - Full manual edit support with duplicate-prevention logic.
7. **Qaza Bank & One-Tap Recovery**:
   - Auto-sweeps unprayed prayers past their window into the Qaza Bank.
   - One-tap "Recover (Ada)" workflow to track lifetime obligations.
8. **Monthly Calendar & Detailed Insights**:
   - Aggregated monthly performance, streak visibility, and most-missed prayer metrics.
9. **Full-Detail WhatsApp Today's Report**:
   - Minimal soft-green image card generator with complete audit details (Date, Prayer, Status, Location, Tracking Method, Exact Time).

---

## 🏗️ Architecture & Folder Structure

```
namaz-recorder/
├── packages/
│   └── shared/                  # Core shared business logic & algorithms
│       ├── src/calculations/   # Haversine Geofencing, NOAA Solar Sunset, Countdown
│       ├── src/sensors/        # Pocket Motion finite state machine (Qiyam/Ruku/Sujood)
│       ├── src/types/          # Type definitions & schemas
│       └── src/i18n/           # English & Roman Urdu translations
├── backend/                     # Scalable Node.js / Express Enterprise API
│       ├── src/config/         # Strict Zod environment validation
│       ├── src/db/             # Parameterized SQL & O(1) indexed in-memory datastore
│       ├── src/middlewares/    # JWT verification, Helmet, Rate Limiter
│       ├── src/services/       # Prayer lifecycle, Geofence processor, Qaza sweep, WhatsApp SVG
│       ├── src/controllers/    # Auth & Prayer endpoints
│       └── src/tests/          # Comprehensive end-to-end integration tests
└── mobile/                      # Android Mobile Client
        ├── src/theme/          # Soft-green design system palette
        ├── src/services/       # Offline-first API client & device sensor managers
        ├── src/screens/        # Home, Onboarding, Calendar, Insights, Settings, Report
        └── src/tests/          # Mobile state & sensor automation tests
```

---

## 🔒 Security & Reliability Guarantees

- **No Hardcoded Secrets**: All configuration is loaded from environment variables via strict `Zod` validation.
- **SQL Injection Protection**: Zero raw SQL string concatenation; parameterized queries and indexed repository pattern.
- **Password Security**: Strong hashing with `bcrypt` (10 salt rounds).
- **Rate Limiting**: Configured with `express-rate-limit` to defend against brute-force attacks and denial-of-service.
- **Security Headers**: Hardened with `helmet` and custom `CORS` policies.
- **High Concurrency (10,000+ Users)**:
  - Secondary indexing on `(userId, date)` and `(userId, status)` for $O(1)$ lookups.
  - Zero heavy AI bottlenecks on the server — all solar calculations and sensor algorithms are fast, deterministic math.

---

## 🚀 Setup & Installation Steps

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+`

### 1. Install Dependencies
From the repository root:
```bash
# Install root & workspace packages
npm --prefix packages/shared install
npm --prefix backend install
npm --prefix mobile install
```

### 2. Configure Environment Variables
Copy the backend `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```
*(Customize `JWT_SECRET`, `PORT`, and `DATABASE_URL` as needed).*

### 3. Build & Run Tests
To build all packages and run all 20 automated tests:
```bash
npm run build
npm test
```

### 4. Start the Backend API Server
```bash
npm --prefix backend start
# Runs at http://localhost:4000
```
API Health Check: `GET http://localhost:4000/health`

---

## 🧪 Test Coverage Summary

- **Shared Core (4 tests)**:
  - Haversine distance & geofencing radius validation.
  - Solar sunset calculation against UTC coordinate standards.
  - Daily countdown and Friday Jumu'ah schedule switch.
  - 2-Rakat Pocket Motion finite state transitions (Qiyam $\rightarrow$ Ruku $\rightarrow$ Sujood).
- **Backend API (9 tests)**:
  - User registration & password hashing.
  - JWT authentication & session issuance.
  - Daily prayer creation & next prayer countdown calculation.
  - Automated Geofence ping evaluation.
  - Pocket Motion event recording.
  - Qaza Bank migration, listing, and recovery.
  - Monthly calendar & analytics aggregation.
  - High-res WhatsApp Report Card SVG generation.
- **Mobile Automation (7 tests)**:
  - Smart home layout state computation.
  - Settings `+/- 5 min` quick time adjustments with 24-hr wrap-around.
  - Auto-Silent phone audio state machine.
  - 1-Tap fallback prompt interval thresholds.
  - WhatsApp share text & payload formatting.
  - Offline cache fallback resilience.
