# SAHAY — Phase 1: Application Foundation

## Overview
Phase 1 establishes the baseline infrastructure and application skeleton for **SAHAY: The Household Life-Admin OS**.

## Deliverables Completed

### 1. React + TypeScript Frontend
- **Framework:** Vite + React 18 + TypeScript 5
- **Styling:** Tailwind CSS with custom SAHAY color palette (`sahay`, `shield`, `warm`)
- **Routing:** React Router v6 with navigation to all 7 core modules
- **State & Data Fetching:** TanStack React Query + Axios client with `/api/v1` base URL
- **Icons:** Lucide React icons
- **Build Status:** Verified production build (`tsc -b && vite build`) passing.

### 2. FastAPI Backend
- **Framework:** FastAPI with Python 3.14 + Pydantic v2
- **Architecture:** Modular structure (`app/api/v1`, `app/core`, `app/db`, `app/models`, `app/schemas`, `app/services`, `app/workers`)
- **Settings:** Environment-driven settings via `pydantic-settings` (`.env` file)
- **CORS:** Configured for `localhost:5173` and Vite development server
- **Endpoints:**
  - `GET /`: API root and service metadata
  - `GET /api/v1/`: API v1 index and route directory
  - `GET /api/v1/health`: Detailed system and database connectivity health check
  - `GET /api/v1/status`: Active phase and architectural modules status

### 3. Database Layer
- **ORM:** SQLAlchemy 2.0 with asynchronous engine (`AsyncEngine` + `async_sessionmaker`)
- **PostgreSQL:** Configured with `postgresql+asyncpg` for production and Docker Compose
- **Local Fallback:** Seamless zero-config fallback to SQLite (`sqlite+aiosqlite`) when Docker/PostgreSQL is inactive or initializing
- **Base Models:** Declarative Base with `TimestampMixin` (`created_at`, `updated_at`)

### 4. Docker Infrastructure
- **Compose:** `docker-compose.yml` defining:
  - `sahay_postgres`: PostgreSQL 16 image with `pgvector` pre-installed on port 5432
  - `sahay_redis`: Redis 7 Alpine on port 6379
  - `sahay_minio`: MinIO S3-compatible storage on ports 9000 & 9001
- **Configuration:** Templated `.env.example` and active `.env`

### 5. Application Layout & Verification Shell
- **Sidebar:** Navigation links for all 7 core modules (Family Vault, Document Doctor, Sahay Daily, Health Shield, Lakshya, Sahay AI Assistant, Sahay Shield)
- **Header:** Household selector (`Sharma Household`), user profile (`Rajesh Sharma`), real-time API connection pulse, and 1-tap Emergency Mode action button
- **Foundation Dashboard:** Real-time health diagnostic, direct browser-to-backend API test ping runner, and module architecture roadmap.

## How to Run

### Backend
Double-click `run_backend.bat` or run:
```bash
.\.venv\Scripts\activate
$env:PYTHONPATH="C:\Users\ndhee\Sahay\backend"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Swagger UI available at: `http://localhost:8000/docs`

### Frontend
Double-click `run_frontend.bat` or run:
```bash
cd frontend
npm run dev
```
Application accessible at: `http://localhost:5173`

### Tests
Run backend test suite:
```bash
$env:PYTHONPATH="C:\Users\ndhee\Sahay\backend"
.\.venv\Scripts\pytest.exe backend\tests -v
```
