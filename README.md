# QuanLyBenXe - Bus Station Management System

**A comprehensive bus station management platform for Vietnamese transportation operators.**

QuanLyBenXe (Bus Management) is a full-stack web application designed to streamline operations at bus stations, including dispatch management, fleet tracking, driver management, financial reporting, and route planning.

**Status:** Production Ready - Supabase + GTVT Sync Active (Phase 7 Pending)

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account with PostgreSQL database enabled

### Installation

```bash
# Clone repository
git clone https://github.com/your-repo/quanlybenxe.git
cd Quanlybenxe

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Start development servers
npm run dev
```

The app runs on `http://localhost:5173` (client) and backend API on configured port.

---

## Project Structure

```
quanlybenxe/
├── client/                 # React 18 frontend (Vite)
│   └── src/
│       ├── features/       # Feature modules (auth, dispatch, fleet, chat)
│       ├── pages/          # 45+ lazy-loaded page components
│       ├── components/     # 132 shared UI components (ui/, dispatch/, fleet/, dashboard/, etc.)
│       ├── services/       # 21 API client services
│       ├── hooks/          # 9 custom React hooks
│       ├── store/          # Zustand global stores (3+4)
│       ├── types/          # TypeScript definitions
│       └── lib/            # 12 utility files
│
├── server/                 # Express.js backend
│   └── src/
│       ├── modules/        # 11 feature modules (auth, billing, chat, dispatch, fleet, operator, report, route)
│       ├── controllers/    # 27 HTTP request handlers
│       ├── services/       # Business logic layer (fleet: 247 LOC service)
│       ├── repositories/   # Data access layer
│       ├── middleware/     # 3 middleware files (auth, error, validation)
│       ├── db/             # Drizzle ORM schemas (22 tables)
│       └── types/          # Shared TypeScript types
│
└── docs/                   # Technical documentation (9 files)
```

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast builds and HMR
- **React Router v6** for navigation
- **Zustand** for state management
- **React Hook Form** for form handling
- **Tailwind CSS** + **shadcn/ui** for styling
- **Recharts** for data visualization
- **SheetJS** for Excel export

### Backend
- **Express.js** with TypeScript
- **Supabase PostgreSQL** via **Drizzle ORM** (primary database)
- **JWT** for authentication
- **Cloudinary** for image storage

---

## Key Features

### 1. Dispatch Management (Điều Độ)
- Create and manage dispatch orders with multi-step workflow
- Vehicle and driver assignment with optimization
- Passenger manifest and real-time tracking
- Status workflow: entered → passengers_dropped → permit_issued → paid → departure_ordered → departed → exited
- Settlement calculation and payment processing
- Driver performance metrics

### 2. Fleet Management (Quản Lý Xe)
- Vehicle registry with maintenance history and operational status
- Driver profiles with qualifications and license management
- Operator (company) management and configuration
- Vehicle badges (Buýt, Tuyến cố định) with type definitions
- Real-time vehicle location tracking via GPS
- Badge vehicle support for specialized routes

### 3. Financial Reporting (Báo Cáo Tài Chính)
- 20+ specialized report pages with export capability
- Revenue, expense, and cash flow tracking
- Driver salary and commission calculations
- Trip metrics and mileage analytics
- Period-based financial summaries
- Excel export for analysis and external tools

### 4. Route & Location Management (Tuyến Đường)
- Route creation with stop management
- Pickup/drop-off location management
- Geographic mapping integration
- Schedule coordination and optimization
- GTVT AppSheet sync: manual pull from Sở GTVT Bắc Giang (routes + schedules)
- Admin action "Đồng bộ Sở GTVT" with live/dry-run mode and sync summary

### 5. Shift Management (Ca Làm Việc)
- Shift scheduling and assignment
- Driver shift allocation and tracking
- Shift history and performance analytics
- Shift-based reporting

### 6. Chat Integration
- AI-powered chat widget with semantic understanding
- Intent classification and context awareness
- Semantic data queries across operational data
- Multi-turn conversation support
- Real-time response generation

---

## Architecture Overview

### Data Flow

```
Client Request
    ↓
Routes (URL routing)
    ↓
Controller (HTTP handling)
    ↓
Validation (Input validation)
    ↓
Service (Business logic)
    ↓
Repository (Database layer)
    ↓
Supabase PostgreSQL (Primary database)
```

### State Management

**Frontend:**
- **Zustand stores** for feature-local state
- **React Query** patterns for async data
- **Context API** for UI-wide settings

**Backend:**
- Service layer handles complex workflows
- Repository pattern for data access
- Drizzle ORM for type-safe database queries
- Row Level Security (RLS) for data access control

---

## Development Workflow

### Running Locally

```bash
# Terminal 1: Start client (Vite dev server)
cd client && npm run dev

# Terminal 2: Start backend (Node.js)
cd server && npm run dev

# Terminal 3: Run tests (optional)
npm run test
```

### Code Organization

- **Features** are organized by business domain (auth, dispatch, fleet)
- **Components** follow feature-based structure
- **Services** handle API calls and business logic
- **Types** are TypeScript-first with strict checking

### Making Changes

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Make changes following code standards in `docs/code-standards.md`
3. Run tests: `npm run test`
4. Commit with conventional messages: `feat: add new feature`
5. Push and create pull request

---

## Documentation

- **[Code Standards](./docs/code-standards.md)** - Coding conventions and patterns
- **[Codebase Summary](./docs/codebase-summary.md)** - Complete codebase structure
- **[System Architecture](./docs/system-architecture.md)** - Architecture decisions
- **[Project Roadmap](./docs/project-roadmap.md)** - Current status and roadmap
- **[Project Overview & PDR](./docs/project-overview-pdr.md)** - Product requirements
- **[API Reference](./docs/api-reference.md)** - API endpoints documentation
- **[Operations Guide](./docs/operations-guide.md)** - Deployment and ops
- **[Design Guidelines](./docs/design-guidelines.md)** - UI/UX standards

---

## Deployment

### Backend
- Deployed to Render.com
- Environment: Node.js with Express.js
- Database: Supabase PostgreSQL (primary)

### Frontend
- Deployed to Vercel
- Automatic builds on main branch push
- Environment variables configured in deployment platform

See `docs/operations-guide.md` for detailed setup.

---

## Contributing

1. Read `docs/code-standards.md` for conventions
2. Check `docs/project-roadmap.md` for active features
3. Follow commit message format: `feat|fix|docs|refactor: description`
4. Ensure all tests pass before pushing
5. Create detailed pull requests with context

---

## Performance Metrics

### Frontend Bundle (Vite Build)
- **Total uncompressed**: ~1.4MB
- **Total gzipped**: ~350KB
- **vendor-react**: ~163KB
- **vendor-radix** (UI components): ~68KB
- **vendor-utils**: ~89KB
- **vendor-icons**: ~38KB
- **vendor-charts** (Recharts): ~382KB
- **vendor-toast**: ~30KB

### Code Quality
- **Total files**: ~578 files (286 client TS/TSX + 178 server TS)
- **Total LOC**: ~87,000 (client: ~53K | server: ~34K)
- TypeScript strict mode enabled
- Controller max: 300 lines target
- Service/Helper functions: <250 lines average
- Database: 22 schema files, 7 indexes on dispatch_records

---

**Last Updated:** 2026-03-01
**Maintainers:** Development Team
**Status:** Production Ready - Supabase + GTVT Sync Active
