# AgroSense — System Architecture & Design Documentation

## 1. Overview & Architecture

AgroSense is an intelligent, full-stack cold-chain monitoring platform designed to protect perishable produce quality, calculate real-time shelf-life degradation using deterministic kinetic models, and dynamically trigger liquidation discounts to local retailers before produce spoils.

### System Architecture Diagram

```
+-----------------------------------------------------------------------+
|                             AgroSense UI                              |
|   React (Vite) + Recharts + Glassmorphism Aesthetics + Dark Mode     |
|   Dashboard | Shipment Detail | Retailer Portal | Audit Trail         |
+-----------------------------------------------------------------------+
                                  |
                           HTTP REST API
                                  v
+-----------------------------------------------------------------------+
|                            Backend Express                            |
|  - Telemetry Ingestion API (/api/shipments/:id/telemetry)             |
|  - Arrhenius Degradation Engine (degradationEngine.ts)                |
|  - Dynamic Discount Liquidation Engine (discountEngine.ts)            |
|  - Telemetry Simulator Service (simulatorService.ts)                  |
|  - Audit Trail Logger (auditService.ts)                               |
+-----------------------------------------------------------------------+
                                  |
                             Prisma ORM
                                  v
+-----------------------------------------------------------------------+
|                          SQLite Database                              |
|  (ProduceType, Shipment, TelemetryRecord, Retailer, DiscountOffer,    |
|   AuditLog)                                                           |
+-----------------------------------------------------------------------+
```

---

## 2. Telemetry Simulator Design

The telemetry simulator is a 100% server-side module (`src/server/services/simulatorService.ts`) that runs background interval ticks (configurable, default 5s). For each active shipment, it generates synthetic environmental readings depending on the selected scenario:

- **`stable`**: Standard cold-chain transit. Temperature fluctuates within $\pm 0.3^\circ\text{C}$ of reference ideal storage temperature $T_{ref}$, humidity remains within optimal range.
- **`gradual_warmup`**: Simulates degrading insulation or low refrigerant. Temperature rises linearly over transit time by $+0.6^\circ\text{C}$ per tick step while relative humidity gradually degrades.
- **`sudden_excursion`**: Simulates sudden cooling compressor failure. Temperature jumps abruptly to $+16^\circ\text{C}$ to $+20^\circ\text{C}$ above reference, accompanied by a drop in relative humidity.
- **`door_open_spike`**: Simulates periodic container door openings during loading/unloading. Temperature spikes by $+9.5^\circ\text{C}$ every 3 ticks before recovering.

Every synthetic telemetry point is ingested via the internal Telemetry Ingestion Pipeline and written to the SQLite database.

---

## 3. Shelf-Life Degradation Model Math

The degradation model is a transparent, deterministic kinetic rate equation based on the Arrhenius temperature relationship combined with a relative humidity deviation penalty factor.

### 3.1 Temperature Factor ($k_T$)
Per produce type, a reference ideal temperature $T_{ref}$ (°C), reference shelf life $L_{ref}$ (hours), and temperature sensitivity coefficient $Q_{10}$ are stored in the database.

For current temperature $T$:
$$k_T(T) = \begin{cases} \frac{1}{L_{ref}} \cdot Q_{10}^{\frac{T - T_{ref}}{10}}, & T > T_{ref} \\ \frac{1}{L_{ref}}, & T \le T_{ref} \end{cases}$$

*Physical meaning:* For every 10 °C increase above $T_{ref}$, the rate of spoilage multiplies by $Q_{10}$ (typically 1.8x – 2.3x).

### 3.2 Relative Humidity Penalty Factor ($f_{RH}$)
Produce types define an optimal relative humidity range $[RH_{min}, RH_{max}]$ and penalty coefficient $\alpha$ (e.g. 0.02 per % RH deviation).

$$f_{RH}(RH) = \begin{cases} 1.0 + \alpha \cdot (RH_{min} - RH), & RH < RH_{min} \text{ (Desiccation penalty)} \\ 1.0 + \alpha \cdot (RH - RH_{max}), & RH > RH_{max} \text{ (Microbial decay penalty)} \\ 1.0, & RH_{min} \le RH \le RH_{max} \text{ (Optimal humidity)} \end{cases}$$

### 3.3 Instantaneous Spoilage Rate & Step Fraction
The combined instantaneous spoilage rate $r(T, RH)$ (fraction per hour) is:
$$r(T, RH) = k_T(T) \cdot f_{RH}(RH)$$

For an elapsed time step of $\Delta t$ hours:
$$\Delta D = r(T, RH) \cdot \Delta t$$
$$D_{new} = \min(1.0, D_{prev} + \Delta D)$$

### 3.4 Remaining Shelf Life (Hours)
$$L_{rem} = \max\left(0, (1 - D_{new}) \cdot L_{ref}\right)$$

---

## 4. Dynamic Liquidation Discount Rules

When telemetry ingestion updates a shipment's remaining shelf life:
1. **Trigger Condition**: Discount logic evaluates when remaining shelf life fraction drops below 35% ($D(t) \ge 0.65$) OR remaining shelf life is $\le 48$ hours.
2. **Discount Tiers**:
   - **$D(t) < 0.65$**: Standard Price (0% discount)
   - **$0.65 \le D(t) < 0.75$**: Early Warning Liquidation (20% OFF)
   - **$0.75 \le D(t) < 0.85$**: Urgent Liquidation (40% OFF)
   - **$0.85 \le D(t) < 1.0$**: Flash Sale Clearance (60% OFF)
   - **$D(t) \ge 1.0$**: Spoilage Disposal Clearance (80% OFF)
3. **Discounted Price Calculation**:
   $$\text{Discounted Price} = \text{Original Price per Kg} \times \left(1 - \frac{\text{Discount \%}}{100}\right)$$
4. **Offer Generation & Bidding**: Automatically matches registered local retailers whose preference matches the produce type, creates pending `DiscountOffer` database records, sets shipment status to `LIQUIDATING`, and logs an audit record.
5. **Retailer Action**: When a retailer accepts an offer, the offer status updates to `ACCEPTED`, shipment status updates to `LIQUIDATED`, competing pending offers expire, and an audit entry is created.

---

## 5. Database Schema & Entities

```prisma
ProduceType (id, name, tempRef, shelfLifeRef, q10, rhMin, rhMax, rhPenaltyCoeff, icon, color)
  └── Shipment (id, trackingNumber, produceTypeId, status, scenario, remainingShelfLifeHours, consumedFraction, initialPricePerKg)
        ├── TelemetryRecord (id, shipmentId, timestamp, temperature, humidity, transitTimeHours, cumulativeConsumedFraction)
        ├── DiscountOffer (id, shipmentId, retailerId, discountPercent, originalPricePerKg, discountedPricePerKg, status)
        └── AuditLog (id, shipmentId, eventType, summary, details, timestamp)

Retailer (id, name, location, contactEmail, contactPhone, preferredProduceTypes)
  └── DiscountOffer
```

---

## 6. File Mapping Walkthrough

| Requirement | Primary Implementation File(s) | Description |
| :--- | :--- | :--- |
| **Telemetry Simulator** | `src/server/services/simulatorService.ts` | Server-side scenario generator (`stable`, `gradual_warmup`, `sudden_excursion`, `door_open_spike`) and background timer loop (`src/server/index.ts`). |
| **Telemetry Ingestion API** | `src/server/routes/telemetry.ts` | HTTP POST `/api/shipments/:id/telemetry` endpoint validating Zod payload and triggering recomputation. |
| **Degradation Model** | `src/server/services/degradationEngine.ts` | Deterministic Arrhenius rate equation + humidity penalty calculations. |
| **Liquidation Discount Engine** | `src/server/services/discountEngine.ts` | Tiered discount scaling rules and price calculation based on remaining shelf life. |
| **Live DB Persistence** | `prisma/schema.prisma`, `src/server/db.ts` | SQLite database schema managed via Prisma ORM for full persistence across page reloads. |
| **Audit Log** | `src/server/services/auditService.ts`, `src/server/routes/audit.ts` | Records automated events (`MODEL_RECALCULATED`, `DISCOUNT_TRIGGERED`, `RETAILER_RESPONSE`). |
| **Dashboard UI** | `client/src/App.tsx`, `client/src/components/*` | React dashboard with Recharts telemetry graph, metric cards, retailer portal, audit viewer, and simulator controls. |
| **Unit & Integration Tests** | `src/tests/degradationEngine.test.ts`, `discountEngine.test.ts`, `telemetryIngestion.test.ts`, `cron.test.ts` | Vitest test suite with hand-computed mathematical validations, HTTP-to-DB integration test, and cron route security test. |

---

## 7. Deployment Architecture & Serverless Constraints

### 7.1 Serverless Function Adaptations
On Vercel, traditional long-running background timers (such as `setInterval`) are prohibited because functions are ephemeral. The serverless architecture delegates routing as follows:
- **`api/index.ts`**: Serves as the primary entrypoint wrapping the Express application instance for all API endpoints (`/api/*`).
- **`vercel.json`**: Configures Vite static asset routing for `dist/client` and API rewrites to `api/index.ts`.

### 7.2 Hosted PostgreSQL — Supabase
AgroSense uses [Supabase](https://supabase.com) as its hosted PostgreSQL provider. Two separate connection strings are required:

| Variable | Port | Purpose |
|---|---|---|
| `DATABASE_URL` | 6543 (Transaction Pooler / PgBouncer) | Runtime queries from Vercel serverless functions |
| `DIRECT_URL` | 5432 (Direct Connection) | Prisma migrations only (`prisma migrate deploy`) |

**Prisma `schema.prisma` configuration:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Row Level Security:** All six tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` applied in the seed script and migration, providing defence-in-depth even though the client never touches the database directly.

### 7.3 Vercel Cron Simulation Scheduling & Route Security
Background loops are replaced with two complementary approaches:
1. **On-Demand Ticks**: Triggered via `POST /api/simulation/tick` or manual telemetry payload injection from the dashboard UI.
2. **Vercel Cron Jobs**: Scheduled in `vercel.json` (`path: "/api/cron/simulate"`, `schedule: "*/5 * * * *"`).

#### Cron Route Authorization Security
The cron route handler (`src/server/routes/cron.ts`) verifies the `Authorization` header against the server-side `CRON_SECRET` environment variable:
```ts
const isValid = cronSecret && (
  authHeader === `Bearer ${cronSecret}` ||
  headerSecret === cronSecret ||
  querySecret === cronSecret
);
if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
```
Requests without the valid `CRON_SECRET` return an HTTP 401 Unauthorized response.

### 7.4 Deterministic Simulator PRNG
To ensure telemetry ticks remain reproducible and deterministic given a shipment's initial parameters, `generateSyntheticTelemetry()` uses a seeded pseudo-random noise function (`seededRandom(simSeed, recordIndex)`). Given the same shipment seed, identical synthetic readings are produced reproducibly.

