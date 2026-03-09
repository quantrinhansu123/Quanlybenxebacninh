# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role & Responsibilities

Your role is to analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery of features that meet specifications and architectural standards.

## Workflows

- Primary workflow: `./.claude/workflows/primary-workflow.md`
- Development rules: `./.claude/workflows/development-rules.md`
- Orchestration protocols: `./.claude/workflows/orchestration-protocol.md`
- Documentation management: `./.claude/workflows/documentation-management.md`
- And other workflows: `./.claude/workflows/*`

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** You must follow strictly the development rules in `./.claude/workflows/development-rules.md` file.
**IMPORTANT:** Before you plan or proceed any implementation, always read the `./README.md` file first to get context.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.
**IMPORTANT**: Date format is configured in `.ck.json` and injected by session hooks via `$CK_PLAN_DATE_FORMAT` env var. Use this format for plan/report naming.

## Development Commands

**npm workspaces monorepo** — root `package.json` defines `client` and `server` workspaces.

### Common Commands (from repo root)

```bash
npm install              # Install all workspace dependencies
npm run dev              # Start both client + server concurrently (blue=BE, green=FE)
npm run dev:client       # Client only (Vite dev server → localhost:5173)
npm run dev:server       # Server only (tsx watch → port from APP_PORT env, default 3000)
npm run build            # Build all workspaces
npm run build:client     # tsc && vite build (client)
npm run build:server     # tsc -p tsconfig.build.json (server)
```

### Server-specific (from `server/`)

```bash
npm run test                    # Jest (ESM mode) — all tests
npm run test -- --testPathPattern=fleet  # Run single test file/module
npm run test:watch              # Jest watch mode
npm run test:coverage           # Jest with coverage (threshold: 50%)
npm run db:generate             # Drizzle Kit — generate migration
npm run db:push                 # Drizzle Kit — push schema to DB
npm run db:migrate              # Drizzle Kit — run migrations
npm run db:studio               # Drizzle Kit — open studio UI
npm run db:test                 # Test Drizzle connection
npm run smoke-test              # Production smoke test
npm run create-admin            # Create admin user script
```

### Client-specific (from `client/`)

```bash
npm run build        # tsc && vite build
npm run lint         # ESLint (ts,tsx) — max-warnings 0
npm run preview      # Vite preview of build output
```

### TypeScript Verification

```bash
cd client && npx tsc --noEmit    # Check client types (uses path aliases @/*)
cd server && npx tsc -p tsconfig.build.json --noEmit  # Check server types (excludes tests/ETL)
```

## Architecture Overview

### Monorepo Structure

```
quanlybenxe/
├── client/          # React 18 + Vite + TypeScript
│   └── src/
│       ├── pages/           # Lazy-loaded page components
│       ├── components/      # Shared UI (shadcn/ui + Radix + Tailwind)
│       ├── features/        # Feature modules (auth, dispatch, fleet)
│       ├── services/        # API client services + AppSheet sync
│       ├── hooks/           # Custom React hooks
│       ├── store/           # Zustand global stores
│       ├── workers/         # SharedWorker (AppSheet polling)
│       ├── utils/           # Shared utilities
│       ├── config/          # App configuration
│       ├── lib/             # Core utilities (api.ts, utils.ts)
│       └── types/           # TypeScript definitions
│
├── server/          # Express.js + TypeScript
│   └── src/
│       ├── modules/         # Feature modules (fleet, dispatch, auth, etc.)
│       ├── controllers/     # Legacy (non-modular) controllers
│       ├── services/        # Legacy + GTVT sync services
│       ├── routes/          # Legacy route files
│       ├── middleware/      # Auth, error, validation
│       ├── db/              # Drizzle ORM schemas + migrations
│       └── config/          # Server configuration
│
└── docs/            # Technical docs (gitignored, local only)
```

### Server Module Pattern

Modules follow **feature-based** organization. The fully refactored pattern (fleet, dispatch):

```
modules/{name}/
├── controllers/         # HTTP handlers
├── repositories/        # Data access layer (Drizzle queries)
├── services/            # Business logic
├── __tests__/           # Jest tests
├── {name}-types.ts      # Shared types
├── {name}-mappers.ts    # DB → API field mapping
├── {name}-validation.ts # Zod schemas
├── {name}.routes.ts     # Express router
└── index.ts             # Barrel file (public API)
```

**Hybrid routing:** Refactored modules register routes at `modules/{name}/{name}.routes.ts`. Legacy modules still use `routes/{name}.routes.ts`. Both patterns coexist — check both locations when working with routes.

**GTVT sync routes** use a different prefix: `app.use('/api/integrations/gtvt', gtvtSyncRoutes)` — separate from standard `/api/{resource}` routes.

### Frontend Patterns

**Routing:** React Router v6 with lazy-loaded pages via `React.lazy()` + `Suspense`. Routes use Vietnamese kebab-case: `/quan-ly-xe`, `/dieu-do`, `/bao-cao/*`. `ProtectedRoute` wraps authenticated routes.

**API Client:** `client/src/lib/api.ts` — Axios instance with `VITE_API_URL` base. Auth token stored in `localStorage` key `auth_token`, sent as `Authorization: Bearer {token}`. 401 → clear token + redirect `/login`.

**Frontend Services:** Object literal pattern:
```typescript
export const vehicleService = {
  getAll: async (): Promise<T[]> => { ... },
  getById: async (id: string): Promise<T> => { ... },
  create: async (input): Promise<T> => { ... },
}
```

**State Management:** Zustand stores — global stores at `client/src/store/`, feature-local stores at `client/src/features/{name}/store/`. Follow existing pattern when adding new stores.

**Path Aliases (client):** `@` → `./src`, `@features/*`, `@hooks/*`, `@types/*`

### Frontend AppSheet Realtime Polling (SharedWorker)

Frontend polls GTVT AppSheet API directly from browser (CORS allowed) using a SharedWorker:

```
useAppSheetPolling hook → workerBridge (singleton) → SharedWorker
                                                      ├── fetch AppSheet API
                                                      ├── normalize (TABLE_CONFIG registry)
                                                      ├── cyrb53 hash diff (per-record)
                                                      └── broadcast to subscribers
```

**Key behaviors:**
- N browser tabs → 1 SharedWorker → 1 API request (dedup across tabs)
- Adaptive intervals: `[10s, 10s, 10s, 30s, 60s, 5min]` — escalates when no changes, resets on change
- Leader election (BroadcastChannel): only 1 tab POSTs changed data to backend
- Tab visibility: pauses polling when all tabs hidden, resumes on visible
- iOS Safari fallback: main-thread polling in bridge (no SharedWorker support)
- New tabs receive cached data immediately

**Files:** `client/src/workers/appsheet-shared-worker.ts`, `client/src/services/appsheet-worker-bridge.ts`, `client/src/services/appsheet-leader-election.ts`, `client/src/hooks/use-appsheet-polling.ts`, `client/src/config/appsheet.config.ts`

**Normalizers:** `client/src/services/appsheet-normalize-{vehicles,badges,operators,fixed-routes,bus-routes}.ts` — each exports interface + normalize function. Registered in SharedWorker `TABLE_CONFIG`.

**Backend sync controllers:** `server/src/modules/fleet/controllers/{vehicle,badge,operator,route}-appsheet-sync.controller.ts` — POST endpoints for frontend leader tab to push changed data. All use JSONB shallow merge: `COALESCE(col, '{}') || excluded.metadata`.

**Operator sync upsert key:** Uses `operators.firebaseId` (UNIQUE constraint), NOT `code`. This ensures AppSheet data updates existing google_sheets operators instead of creating duplicates. Badge sync controller also resolves `operator_id` FK via `metadata.issuing_authority_ref → operators.firebase_id` JOIN.

**Verified AppSheet column names (THONGTINDONVIVANTAI, 2026-03-03):**
`IDDoanhNghiep` (unique ID, 8-char hex), `TenDoanhNghiep`, `TinhThanh`, `TinhDangKyHoatDong`, `DiaChiSauSapNhap`, `SoDienThoai`, `MaSoThue`, `NguoiDaiDienTheoPhapLuat`, `SoDKKD`, `LoaiHinh`, `LoaiHinhVanTai`

**Resolution chain (QuanLyXe):** plate → badge.operatorRef → operator.name+province. Built from AppSheet polling data with fallback to backend-provided data.

**Badge FK resolution (during sync):**
- `operator_id`: badge.operatorRef → operators.firebase_id (97.3% resolution — 18,521/19,028)
- `route_id`: badge.routeRef → routes.route_code (fixed), badge.busRouteRef → routes.firebase_id (bus) — 485/485 resolved

**Route sync:** DANHMUCTUYENCODINH (884 fixed routes) + DANHMUCTUYENBUYT (8 bus routes). Bus routes resolve mã tỉnh → tên tỉnh via MATINH table (63 rows, cached in SharedWorker memory — NOT synced to DB). Bus route `departureStation`/`arrivalStation` = resolved province name (per user design).

**Verified badge column names (PHUHIEUXE):** `BienSo` = plate text (NOT `BienSoXe` which is ref ID), `Ref_DonVi` = operatorRef, `Ref_Tuyen` = fixed route code, `Ref_TuyenBuyt` = bus route firebase_id.

**CRITICAL:** Always verify AppSheet column names via API before mapping — guessed names are often wrong.

### Environment Variables

**Server (`server/.env.example`):** `APP_PORT` (NOT `PORT` — reserved by Firebase), `DATABASE_URL` (Supabase pgbouncer port 6543), `JWT_SECRET`, `CORS_ORIGIN` (comma-separated), `CLOUDINARY_*`, `GEMINI_API_KEY`, `GTVT_APPSHEET_*`

**Client (`client/.env.example`):** `VITE_API_URL`, `VITE_GTVT_APPSHEET_API_KEY`, `VITE_GTVT_APPSHEET_VEHICLES_ENDPOINT`, `VITE_GTVT_APPSHEET_BADGES_ENDPOINT`, `VITE_GTVT_APPSHEET_OPERATORS_ENDPOINT`

**Deployment:** Backend → Render.com, Frontend → Vercel. `client/.env.production` is committed (not gitignored).

### Database Connection

Supabase PostgreSQL via `postgres` driver (not `pg`). Connection pool: `max: 20`, `idle_timeout: 30s`, `prepare: false` (required for Supabase Transaction/pgbouncer mode), port 6543.

**Drizzle config:** Schema at `server/src/db/schema/index.ts`, migrations at `server/src/db/migrations/`.

### Express Body Parser Gotcha

Default `express.json()` limit is 100KB. AppSheet vehicle sync endpoint sends ~19K records → route-specific `express.json({ limit: '5mb' })` on `/api/vehicles`. When adding large-payload endpoints, apply route-specific limit.

## Database Schema (Drizzle ORM + Supabase PostgreSQL)

**Location:** `server/src/db/schema/`

### Core Tables (19 total)

1. **operators** - Transportation companies/operators
2. **vehicle_types** - Vehicle classifications
3. **vehicles** - Fleet registry with maintenance records
4. **vehicle_documents** - Vehicle documentation and registration
5. **vehicle_badges** - Route badges (Buýt, Tuyến cố định) with metadata
6. **drivers** - Driver profiles and qualifications
7. **driver_operators** - Many-to-many driver-operator relationships
8. **routes** - Route definitions with departure/arrival stations
9. **schedules** - Route schedules and timing
10. **locations** - Pickup/dropoff locations
11. **services** - Service type definitions
12. **shifts** - Work shift definitions
13. **dispatch_records** - Core dispatch operations (7 indexes)
14. **invoices** - Financial transactions
15. **violations** - Traffic violations and penalties
16. **users** - System users and authentication
17. **audit_logs** - System audit trail
18. **id_mappings** - Firebase-to-Supabase migration mappings

### Critical Relationships

```
operators ←--→ vehicles (operatorId FK)
operators ←--→ drivers (via driver_operators junction)
vehicles ←--→ dispatch_records (vehicleId FK)
drivers ←--→ dispatch_records (driverId FK)
routes ←--→ vehicle_badges (routeId FK)
routes ←--→ dispatch_records (routeId FK)
```

### Key Schema Notes

**vehicle_badges:**
- Fields: `routeId`, `routeCode`, `routeName`, `operatorId` (FK to operators), `metadata` (JSONB)
- `metadata` contains: `badge_color`, `issue_type`, `file_number`, `route_ref`, `issuing_authority_ref`
- **`issuing_authority_ref` MISNOMER:** Despite the name, this is the **operator** (đơn vị vận tải) reference, NOT the issuing authority (Sở GTVT). Contains 8-char hex matching `operators.firebase_id`. 2,230 distinct values = companies, not government agencies.
- `operatorId` FK: Backfilled via `metadata.issuing_authority_ref → operators.firebase_id` JOIN. Badge sync controller also resolves this on future syncs.
- Route matching: Primary by `routeId` FK, fallback to `routeName` string match
- **IMPORTANT:** Backend constructs route display as `departureStation - arrivalStation`

**dispatch_records:**
- Status workflow: entered → passengers_dropped → permit_issued → paid → departure_ordered → departed → exited
- 7 indexes for query optimization
- Fields: settlement, driver settlement, fees, fuel consumption

**routes table - Normalized Fields:**
- `route_type`: MUST be one of 3 values: `"Liên tỉnh"`, `"Nội tỉnh"`, `"Xe buýt"`. Normalized in `gtvt-normalize-routes.service.ts:normalizeRouteType()`. Controller uses `isBusRouteType()` helper (checks both `"bus"` and `"xe buýt"` for backward compat).
- `operation_status`: Active statuses include "Đã công bố", "Đang khai thác", "Hoạt động", "Mới". Inactive keywords: "ngừng", "đóng", "hết hiệu lực". Frontend counts inactive first, then `active = total - inactive`.
- `departure_province`/`arrival_province`: Stored as Vietnamese text names (e.g. "Bắc Giang"), NOT numeric codes. No external province API dependency.
- `departure_station`/`arrival_station`: Plain text. Watch for UTF-8 encoding corruption from Google Sheet → Firebase → Supabase migration pipeline.

**Data Flow Patterns:**
- Backend query via Drizzle ORM → Controller mapping → Frontend service → UI state
- **CRITICAL:** Always preserve backend data fields when mapping in frontend (don't overwrite with empty defaults)
- Use normalized lookups (`.trim().toUpperCase()`) for string matching (route names, etc.)
- **3-Layer Normalization Rule:** When changing DB enum/category values, MUST update all 3 layers: (1) DB migration for existing data, (2) sync service for future data, (3) controller/helpers that hardcode old values. Always grep codebase for old string values before changing.

**QuanLyXe Page Resolution Chains:**

*Vehicle Type (`getVehicleTypeName` in `QuanLyXe.tsx`):*
- **Only use `vehicleCategory`** (from AppSheet `LoaiPhuongTien` → `vehicles.metadata.vehicle_category`). No fallback.
- `vehicle_types` table (8 manual records) is NOT aligned with actual LoaiPhuongTien data (~180 distinct values). Do NOT use it as fallback — it shows misleading labels like "Loại khác".

*Operator Name (`resolveOperatorName` in `QuanLyXe.tsx`):*
- **Frontend AppSheet chain** (priority): plate → `plateToOperatorRef` (from badge `Ref_DonViCapPhuHieu`) → `operatorRefMap` (from operators `firebaseId → name`)
- **Backend chain** (fallback via `quanly-data.controller.ts`): `badge.operatorId` FK → `operatorNameMap` → `vehicleOperatorMap(plate→name)`, then `vehicle.operatorId` FK → `operatorNameMap`
- **IMPORTANT:** Backend chain requires `vehicle_badges.operator_id` FK to be populated. Badge sync controller must resolve `issuing_authority_ref → operators.firebase_id → operators.id` during upsert.

### Data Origin Notes (Google Sheet → Firebase → Supabase)

**Google Sheet source:** `1hh1GKMiEXKb2KBYpyvzpqYuyc1Khzfjdxv2YMfIZ7cI` (updated 2026-02-26, was `16R5NPyZ-jMPq4Jnqgjl8pbK3ScrD_8GeG0Fv4-gJQhY`)

| gid | Sheet/Tab name | Target table | Key columns |
|-----|---------------|--------------|-------------|
| `1560762265` | PHUHIEUXE | `vehicle_badges` | ID_PhuHieu |
| `40001005` | Xe | `vehicles` | IDXe, BienSo |
| `230690868` | BieuDoChayXeChiTiet | `schedules` (via join) | ID_NutChay, Ref_ThongBaoKhaiThac |
| `1033980793` | THONGBAO_KHAITHAC | `operation_notices` | ID_TB, Ref_Tuyen, Ref_DonVi |
| `2025728801` | DANHMUCTUYENBUYT | `routes` (bus) | ID_Tuyen, SoHieuTuyen |
| `328499076` | DANHMUCTUYENCODINH | `routes` (fixed) | MaSoTuyen, TinhDi, BenDi |
| `1985887920` | BIEUDOCHAY_BUYT | bus schedule diagram | ID_BieuDo |
| `1047672631` | GIOCHAY_BUYT | bus departure times | ID_GioChay |
| `415536628` | QUYETDINH_KHAITHAC_BUYT | bus operation decisions | IDQD |

**`issuing_authority` field origin:**
- **`routes` table**: Extracted from `original_info` text in sheet "Danh mục tuyến cố định". The decision number column (e.g. `1752/SGTVT-QLVT PT&NL`) was resolved client-side (Firebase app) to full authority name (e.g. `Sở Giao thông Vận tải Bắc Giang`). Data already imported via `datasheet_routes.json`.
- **`vehicle_badges` table**: Sheet PHUHIEUXE has `Ref_DonViCapPhuHieu` (reference ID only, not name). Stored in `metadata.issuing_authority_ref` JSONB, not a dedicated column. **MISNOMER:** This is the **operator** (đơn vị vận tải) firebase_id, NOT the issuing authority. Matches `operators.firebase_id` with 97.3% rate.
- **`vehicle_documents` table**: Manually entered in app (e.g. "Cục Đăng kiểm Việt Nam").

**`TenDangKyXe` column (Sheet tab "Xe", gid=40001005):**
- NOT an operator name. Contains classification code (e.g. "K" = xe có KDVT).
- Stored in `vehicles.metadata.registration_name`, NOT in `operator_name`.
- `operator_name` for sheet_sync vehicles should remain NULL (resolved via operator_id FK or badge reference).

### GTVT AppSheet Integration (Sở GTVT Bắc Giang)

**AppSheet App:** SMARTTRANSPORTBG_V11_Core
**AppID:** `7ee20176-7cb1-4ad4-9d13-e541c8b1b3dc`
**API Version:** v2 (POST-based, NOT GET)

**API Endpoint Pattern:**
```
POST https://www.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action
Header: ApplicationAccessKey: {apiKey}
Body: {"Action": "Find", "Properties": {}, "Rows": []}
```

**AppSheet Table → Sync mapping:**
| AppSheet Table | Env var endpoint | Purpose |
|---|---|---|
| `DANHMUCTUYENCODINH` | `GTVT_APPSHEET_ROUTES_ENDPOINT` | Routes (tuyến cố định) |
| `DANHMUCTUYENBUYT` | `GTVT_APPSHEET_BUS_ROUTES_ENDPOINT` | Routes (tuyến buýt) |
| `BieuDoChayXeChiTiet` | `GTVT_APPSHEET_SCHEDULES_ENDPOINT` | Schedule rows (nút chạy cố định) |
| `GIOCHAY_BUYT` | `GTVT_APPSHEET_BUS_SCHEDULES_ENDPOINT` | Schedule rows (giờ chạy buýt) |
| `THONGBAO_KHAITHAC` | `GTVT_APPSHEET_NOTIFICATIONS_ENDPOINT` | Enrichment: Ref_Tuyen, Ref_DonVi (cố định) |
| `BIEUDOCHAY_BUYT` | `GTVT_APPSHEET_BUS_LOOKUP_ENDPOINT` | Enrichment: TuyenBuyt, DonViKhaiThac (buýt) |

**Key relationship:** Both types follow same join pattern:
- **Fixed**: BieuDoChayXeChiTiet.`Ref_ThongBaoKhaiThac` → THONGBAO_KHAITHAC.`ID_TB` → get `Ref_Tuyen`, `Ref_DonVi`
- **Bus**: GIOCHAY_BUYT.`BieuDo` → BIEUDOCHAY_BUYT.`ID_BieuDo` → get `TuyenBuyt`, `DonViKhaiThac`

**Sync code:** `server/src/services/gtvt-*.ts`, `server/src/config/gtvt-appsheet.config.ts`, `server/src/controllers/gtvt-sync.controller.ts`

### GTVT Sync Known Issues & Patterns

**Fallback ID Conflict (DANHMUCTUYENCODINH):**
- DANHMUCTUYENCODINH has no UUID field → AppSheet uses `MaSoTuyen` (route code) as fallback `firebaseId`
- When syncing, if `firebaseId === routeCode` (normalized), it's a fallback ID. Must adopt existing DB firebase_id instead of treating as conflict.
- Logic in `gtvt-route-schedule-sync.service.ts`: `existingCodeToOriginalId` map detects fallback IDs, `adoptedFirebaseIds` merged into `seenFirebaseIds` for disable logic.

**UTF-8 Encoding Corruption:**
- Data pipeline Google Sheet → Firebase → JSON export → Supabase import corrupts Vietnamese diacritics (ế→��, ạ→��, ê→��)
- Detection query: `WHERE column ~ '[^\x20-\x7E\u00C0-\u024F\u1E00-\u1EFF\u0300-\u036F]' OR column LIKE '%�%'`
- Fix via Supabase migration with exact string replacement. Verify by comparing with sibling records (same route prefix).
- Known fixed fields: `departure_province`, `arrival_province`, `departure_station`, `arrival_station`

**TypeScript Build (Render deploy):**
- Raw SQL results (`RowList<Record<string, unknown>[]>`) need `as unknown as Type` double cast pattern
- Pre-existing TS errors in test files/ETL migrations are non-blocking for production build (excluded in `tsconfig.build.json`)

**AppSheet Vehicle Sync (Frontend → Backend):**
- ~19K vehicle rows with ~215 duplicate plates → normalizer dedup with merge strategy (prefer non-null)
- Frontend chunks into 500-record batches before POST
- Backend uses `COALESCE(metadata, '{}') || excluded.metadata` for JSONB merge in upsert
- Batch INSERT: `db.insert(table).values(batch).onConflictDoUpdate()` with `excluded.*` uses **snake_case SQL column names**, NOT camelCase Drizzle props

### AppSheet Sync Lessons Learned (2026-03-03)

**Upsert Key Strategy:**
| Table | Upsert Key | Rationale |
|-------|-----------|-----------|
| vehicles | plateNumber | Natural unique key |
| badges | firebaseId (=badgeNumber) | Natural key |
| operators | firebaseId | Stable 8-char hex, NOT code |
| routes (fixed) | routeCode | MaSoTuyen, stable |
| routes (bus) | firebaseId | ID_Tuyen, stable |

**Rule:** Upsert key = primary natural key. NEVER derived/formatted code (e.g., "GTVT-{id}" caused duplicates).

**Sync Source Priority:** AppSheet wins (`excluded.X` in SQL); COALESCE only for app-specific fields (isActive, isTicketDelegated). `COALESCE(excluded.X, existing.X)` ≠ "AppSheet wins" — it preserves existing garbage when AppSheet sends null.

**vehicles.operator_id FK:** Mostly NULL (~99%). Badge→plate chain is the reliable operator resolution path. Backfill via: `UPDATE vehicles SET operator_id = vb.operator_id FROM vehicle_badges vb WHERE normalize_plate(v.plate_number) = normalize_plate(vb.plate_number) AND vb.operator_id IS NOT NULL AND v.operator_id IS NULL`. OperatorDetailDialog (`useOperatorDetail.ts`) must use badge→plate chain, not vehicles.operator_id FK.

**Pre-Sync Checklist (mandatory per table):**
1. Verify AppSheet column names via `curl` API before coding normalizer
2. Upsert key = stable natural key
3. FK resolution path documented
4. SharedWorker TABLE_CONFIG registered + verified
5. COALESCE vs `excluded.X` reviewed per field
6. List affected pages → test ALL after sync

**Post-Sync Smoke Test:**
1. DB count matches AppSheet count
2. FK resolution rate >95%
3. No garbage records (name ≠ id)
4. Each affected page loads correctly

**Downstream Impact Matrix:**
| Sync Table | Affected Pages |
|-----------|---------------|
| vehicles | QuanLyXe |
| badges | QuanLyXe, QuanLyPhuHieuXe |
| operators | QuanLyXe, QuanLyDonViVanTai |
| fixedRoutes | QuanLyTuyen, QuanLyPhuHieuXe |
| busRoutes | QuanLyTuyen |

**QuanLyDonViVanTai Architecture (REVISED):**
- Subscribe to operators table ONLY (NOT 3 tables)
- Backend pre-filters to ~22 operators with Buýt/TCD badges (`quanly-data.controller.ts`)
- DO NOT re-implement badge→plate→vehicle→operator filter client-side (caused showing 2963 operators instead of 22)
- Merge: AppSheet realtime (name, phone, province) ∩ backend pre-filtered set (isActive, isTicketDelegated)

**SharedWorker Phase 3 (polling hook) DELETED:** Redundant with SharedWorker architecture. `useAppSheetPolling` hook + worker bridge already handles: adaptive intervals, per-record hash diff, tab visibility, cached data, surgical updates. No need for separate `useGtvtPolling` + Zustand store.

**Leader Election:** 1 instance per `useAppSheetPolling` call — accepted tech debt. BroadcastChannel lightweight (~20KB each). 5 instances = ~100KB total, no perf impact.

**Verified AppSheet Column Names:**
- Badge color: `MauPhuHieu` (PHUHIEUXE table)

## Documentation

Local-only docs (gitignored) at `./docs/`:

```
docs/
├── project-overview-pdr.md
├── code-standards.md
├── codebase-summary.md
├── design-guidelines.md
├── deployment-guide.md
├── system-architecture.md
└── project-roadmap.md
```

Plans at `./plans/` (also gitignored). Both directories persist locally only.
