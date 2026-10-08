# AgroSense — Intelligent Perishable Cold-Chain Monitoring Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-teal.svg)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-green.svg)](https://vitest.dev/)

**AgroSense** is a full-stack, enterprise-grade web application that monitors the cold-chain condition of perishable produce using simulated telemetry, estimates remaining shelf life with a kinetic Arrhenius degradation model, and automatically triggers liquidation discounts to local retailers before produce spoils.

---

## 🔑 Key Features & Architecture

- **100% Software Telemetry Simulator**: Server-side module with selectable cold-chain scenarios (`stable`, `gradual_warmup`, `sudden_excursion`, `door_open_spike`) and manual payload injection.
- **Deterministic Arrhenius Degradation Model**: Integrates temperature rate multipliers ($Q_{10}$) and relative humidity deviation penalties ($f_{RH}$) over transit time.
- **Automated Dynamic Liquidation Engine**: Triggers tiered discounts (20%, 40%, 60%, 80% OFF) sent to local retailer bidding networks when remaining shelf life drops below thresholds.
- **Full Database Persistence**: All state changes survive page reloads via SQLite + Prisma ORM. No volatile in-memory state as the source of truth.
- **Interactive UI**: Glassmorphic dark mode dashboard with Recharts live telemetry graphs, shipment creation modal, retailer bidding portal, and expandable audit log viewer.
- **Security Compliant**: Zero secrets in client-side code; all configuration sourced from server `.env`.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v18+ and npm v9+

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 2. Database Setup & Seeding
Initialize the SQLite database and populate sample produce types (Strawberries, Leafy Greens, Tomatoes, Avocados), retailers, and shipments with telemetry history:
```bash
npm run db:push
npm run db:seed
```

### 3. Run Development Server
Start the Express backend (port `3001`) and Vite frontend dev server (port `5173`) concurrently:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running Tests

AgroSense includes a comprehensive Vitest test suite with hand-computed expected values for the Arrhenius degradation formulas and an integration test verifying HTTP API ingestion to SQLite persistence:

```bash
npm test
```

### Verified Test Suite Output:
- `src/tests/degradationEngine.test.ts`: Hand-computed Arrhenius temperature multipliers, humidity penalty factors, and step integration.
- `src/tests/discountEngine.test.ts`: Dynamic liquidation tier calculations and pricing math.
- `src/tests/telemetryIngestion.test.ts`: Integration test verifying HTTP `POST /api/shipments/:id/telemetry` persists to SQLite.

---

## 📁 Repository Structure

```
/
├── .env.example                # Server environment variable template
├── DESIGN.md                   # In-depth architectural & degradation math doc
├── README.md                   # Setup and run instructions
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma           # SQLite Prisma database schema
│   └── seed.ts                 # Database seed script
├── src/
│   ├── server/
│   │   ├── index.ts            # Server entrypoint with background simulator timer
│   │   ├── app.ts              # Express routes configuration
│   │   ├── services/
│   │   │   ├── degradationEngine.ts   # Arrhenius degradation kinetic model
│   │   │   ├── discountEngine.ts      # Liquidation discount tier rules
│   │   │   ├── simulatorService.ts     # Telemetry simulator & ingestion logic
│   │   │   └── auditService.ts         # Automated system audit logging
│   │   ├── routes/             # REST API endpoints
│   │   └── validators/         # Zod payload schemas
│   └── tests/                  # Vitest test suite
└── client/
    ├── index.html
    ├── vite.config.ts
    └── src/
        ├── App.tsx             # Main React application shell
        ├── index.css           # Glassmorphism design system & styles
        ├── components/         # Dashboard, TelemetryChart, RetailerPortal, etc.
        └── api/client.ts       # Backend API client
```

---

## 📄 Documentation

For full details on the Arrhenius model math formulas, dynamic discount rules, database schema, and file mapping, inspect [`DESIGN.md`](./DESIGN.md).
