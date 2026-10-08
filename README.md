# AgroSense — Intelligent Perishable Cold-Chain Monitoring Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-teal.svg)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-green.svg)](https://vitest.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com/)

**AgroSense** is a full-stack, enterprise-grade web application that monitors the cold-chain condition of perishable produce using simulated telemetry, estimates remaining shelf life with a kinetic Arrhenius degradation model, and automatically triggers liquidation discounts to local retailers before produce spoils.

---

## 🔑 Key Features & Architecture

- **100% Software Telemetry Simulator**: Server-side module with selectable cold-chain scenarios (`stable`, `gradual_warmup`, `sudden_excursion`, `door_open_spike`) and manual payload injection.
- **Deterministic Arrhenius Degradation Model**: Integrates temperature rate multipliers ($Q_{10}$) and relative humidity deviation penalties ($f_{RH}$) over transit time.
- **Automated Dynamic Liquidation Engine**: Triggers tiered discounts (20%, 40%, 60%, 80% OFF) sent to local retailer bidding networks when remaining shelf life drops below thresholds.
- **Full Database Persistence**: All state changes survive page reloads via Supabase PostgreSQL + Prisma ORM. No volatile in-memory state.
- **Interactive UI**: Glassmorphic dark mode dashboard with Recharts live telemetry graphs, shipment creation modal, retailer bidding portal, and expandable audit log viewer.
- **Security Compliant**: Zero secrets in client-side code; all configuration sourced from server `.env`. Row Level Security enabled on all tables.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v18+ and npm v9+
- A [Supabase](https://supabase.com) project (free tier works fine)

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example file and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env` and replace `[YOUR_DB_PASSWORD]` in both connection strings:

| Variable | Where to find it | Purpose |
|---|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → **Transaction Pooler** (port 6543) | Runtime queries from serverless functions |
| `DIRECT_URL` | Supabase → Project Settings → Database → **Direct Connection** (port 5432) | Prisma migrations only |
| `CRON_SECRET` | Generate a random string (e.g. `openssl rand -hex 32`) | Protects the cron simulation endpoint |

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
CRON_SECRET="your_random_secret_here"
```

> **Note:** The Transaction Pooler URL must include `?pgbouncer=true` for Prisma to work correctly with PgBouncer in transaction mode.

### 3. Database Setup & Seeding
Push the schema to Supabase (uses `DIRECT_URL` for the session-level connection required by migrations):
```bash
npm run db:push
npm run db:seed
```

This populates sample produce types (Strawberries, Leafy Greens, Tomatoes, Avocados), retailers, and shipments with telemetry history. **Row Level Security is automatically enabled on all tables.**

### 4. Run Development Server
Start the Express backend (port `3001`) and Vite frontend dev server (port `5173`) concurrently:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☁️ Vercel Serverless Deployment Guide

AgroSense is fully adapted for serverless deployment on Vercel with Supabase as the hosted PostgreSQL backend.

### 1. Set Vercel Environment Variables
In your Vercel Project → **Settings → Environment Variables**, add all four:

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase Transaction Pooler (port 6543) | Must have `?pgbouncer=true` |
| `DIRECT_URL` | Supabase Direct Connection (port 5432) | Used only during `prisma migrate deploy` |
| `CRON_SECRET` | A random secret string | Must match value set in Vercel Cron config |
| `NODE_ENV` | `production` | Enables production logging |

> **Security:** None of these use the `VITE_` prefix — they are **never** bundled into client-side code.

### 2. Run Migrations Against Production DB
Locally (with production credentials in `.env`), or via Vercel's build/post-install scripts:
```bash
# Uses DIRECT_URL (bypasses pgBouncer for migration locks)
npx prisma migrate deploy

# Optionally seed initial reference data
npm run db:seed
```

### 3. Deploy
```bash
npx vercel --prod
```
Or connect your GitHub repository to Vercel for automatic deployments on push.

### 4. Verify the Deployment
After deployment:

1. **Persistence check**: Create a shipment → refresh page → confirm shipment still exists.
2. **Cron security check**:
   ```bash
   # Should return 401
   curl https://your-app.vercel.app/api/cron/simulate
   # Should return 200 with { success: true, tickedCount: N }
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/simulate
   ```
3. **Secret audit**: No secrets in the client bundle:
   ```bash
   grep -r "postgresql\|supabase\.co\|CRON_SECRET" dist/assets/ || echo "CLEAN — no secrets in bundle"
   ```

---

## 🧪 Test Suite

```bash
npm test
```

| Test File | What It Verifies |
|---|---|
| `degradationEngine.test.ts` | Hand-computed Arrhenius temperature multipliers, humidity penalty, step integration |
| `discountEngine.test.ts` | Discount tier boundaries and discounted price calculations |
| `telemetryIngestion.test.ts` | HTTP POST → PostgreSQL persistence (skipped if no real DB URL configured) |
| `cron.test.ts` | Cron route returns 401 without secret, 200 with correct `Bearer` header |

---

## 📁 Repository Structure

```
/
├── .env.example                # Server environment variable template
├── DESIGN.md                   # In-depth architectural & degradation math doc
├── README.md                   # This file
├── vercel.json                 # Vercel deployment, API rewrites & cron schedule
├── package.json
├── tsconfig.json
├── api/
│   └── index.ts                # Vercel serverless function entrypoint (wraps Express)
├── prisma/
│   ├── schema.prisma           # PostgreSQL Prisma schema (all models + RLS)
│   ├── seed.ts                 # Database seed + RLS enforcement script
│   └── migrations/             # SQL migration history
├── src/
│   ├── server/
│   │   ├── index.ts            # Local dev server entrypoint
│   │   ├── app.ts              # Express routes configuration
│   │   ├── db.ts               # Prisma client singleton (serverless-safe)
│   │   ├── services/
│   │   │   ├── degradationEngine.ts   # Arrhenius degradation kinetic model
│   │   │   ├── discountEngine.ts      # Liquidation discount tier rules
│   │   │   ├── simulatorService.ts    # Deterministic telemetry simulator
│   │   │   └── auditService.ts        # Automated system audit logging
│   │   ├── routes/             # REST API endpoints (shipments, telemetry, cron, …)
│   │   └── validators/         # Zod payload schemas
│   └── tests/                  # Vitest test suite
└── client/
    ├── index.html
    ├── vite.config.ts
    └── src/
        ├── App.tsx             # Main React application shell
        ├── index.css           # Glassmorphism design system & styles
        ├── components/         # Dashboard, TelemetryChart, RetailerPortal, etc.
        └── api/client.ts       # Backend API client (no DB credentials)
```

---

## 📄 Documentation

For full details on the Arrhenius model math, dynamic discount rules, database schema, RLS configuration, and serverless architecture decisions, see [`DESIGN.md`](./DESIGN.md).
