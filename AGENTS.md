# Repository Guidelines

## Project Structure & Module Organization
This repository is an npm workspace monorepo with two apps:
- `client/`: React 18 + TypeScript frontend (Vite). Main code is in `client/src/` with feature modules, pages, shared components, hooks, services, and types.
- `server/`: Express + TypeScript backend. Main code is in `server/src/` with controllers, modules, services, repositories, middleware, and database code.
- `docs/`: project docs (`code-standards.md`, `system-architecture.md`, `project-roadmap.md`).
- `scripts/` and `plans/`: operational scripts and planning artifacts.

Follow domain boundaries (`dispatch`, `fleet`, `chat`, etc.) and keep related logic close to its module.

## Build, Test, and Development Commands
- `npm install`: install all workspace dependencies.
- `npm run dev`: run backend and frontend together (concurrently).
- `npm run dev:client` / `npm run dev:server`: run one workspace only.
- `npm run build`: build all workspaces.
- `npm run lint --workspace=client`: run frontend ESLint.
- `npm run test --workspace=server`: run backend Jest tests.
- `npm run test:coverage --workspace=server`: generate backend coverage report.
- `npm run db:migrate --workspace=server`: apply Drizzle migrations.

## Coding Style & Naming Conventions
- Language: TypeScript (strict mode). Prefer explicit types; avoid introducing new `any`.
- Frontend naming: PascalCase for components/pages (`VehicleInfoSection.tsx`), `useX` for hooks, camelCase for variables/functions, UPPER_SNAKE_CASE for constants.
- Backend naming: kebab-case files with role suffixes (`dispatch.controller.ts`, `auth-middleware...test.ts`), camelCase symbols.
- Keep files focused: components ideally <500 LOC, controllers ideally <300 LOC.

## Testing Guidelines
- Backend uses Jest + ts-jest ESM (`server/jest.config.js`).
- Put tests under `__tests__/` and name files `*.test.ts`.
- Coverage floor is configured at 50% global (branches/functions/lines/statements).
- Run tests before pushing; include edge/error-path cases, not only happy paths.

## Commit & Pull Request Guidelines
- Use Conventional Commits with optional scope:
  - `feat(dispatch): add route detail dialog`
  - `fix(etl): cast text dates to date type`
- Keep commits focused and small.
- PRs should include: purpose, impacted paths, test commands/results, migration or env changes, and screenshots for UI changes.
- Link the related issue/task when available.

## Security & Configuration Tips
- Never commit secrets (`.env`, API keys, service credentials).
- Use provided env templates (`.env.example`) and keep local overrides private.
- For schema/data changes, document migration and rollback notes in the PR.
