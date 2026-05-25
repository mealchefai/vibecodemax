# Project Architecture + Folder Conventions

## Scope
This standard applies to this project codebase.

## Design Goal
Keep conventions strict enough to scale while preserving predictable structure and low-churn evolution.

## Core Principles
- Keep route composition in `src/app`, reusable UI in `src/components`, and domain logic in `src/lib`.
- Prefer co-location for route-specific concerns, centralization for reusable concerns.
- Keep boundaries explicit to prevent architectural drift.

## Canonical `src/` Layout
This project should keep this structure:

- `src/app`  
  App Router routes, route handlers, layouts, and route-local server actions.
- `src/components`  
  Reusable UI/components across routes.
- `src/lib`  
  Non-UI logic: auth, db, integrations, validation, config, utilities.
- `src/styles`  
  Global theme/style assets.
- `src/types`  
  Cross-domain shared types.
- `src/design-tokens.ts`  
  Design token source file.

## `src/app` Conventions
- Keep only the route groups that exist in this project.
- Common examples include:
  - `src/app/(public)`
  - `src/app/(protected)` for signed-in app pages
  - `src/app/(admin)` for admin pages
- Keep setup routes under `src/app/setup/*`.
- Keep API handlers under `src/app/api/<domain>/route.ts`.
- Route-specific components should live under route-local folders:
  - `src/app/.../_components/*`
- Route-specific server actions should live as:
  - `src/app/.../actions.ts`
- If logic is reused across routes, move it to `src/lib/*`.

## `src/components` Conventions
- Keep domain folders aligned to project domains:
  - `admin`, `auth`, `blog`, `dashboard`, `forms`, `layout`, `marketing`, `ui`, etc.
- `src/components/ui` should contain primitive/shared UI building blocks only.
- Reusable section-level components stay in domain folders (not in `app`).
- `components` must not import from `app`.

## `src/lib` Conventions
Keep and enforce the current domain-oriented structure:

- `src/lib/auth` -> auth guards/session helpers
- `src/lib/db` -> data access helpers
- `src/lib/integrations` -> provider adapters/clients
- `src/lib/validations` -> Zod schemas and input validation
- `src/lib/config` -> static/runtime-safe config shape
- `src/lib/utils` -> pure helpers
- `src/lib/supabase` (or provider-specific dirs) -> provider clients and env access

Rules:
- `lib` contains no React components.
- `lib` should be framework-light and testable in isolation.
- Route handlers/actions call into `lib`, not the other way around.

## Type Placement Standard
- Cross-domain shared types -> `src/types/*`.
- Domain-local types -> `src/lib/<domain>/types.ts` or close to usage.
- Route-local one-off types can stay local within route files.
- Avoid duplicate type definitions across `app`, `components`, and `lib`.

## Naming Conventions
- Route segments: kebab-case.
- Allowed Next.js syntax exceptions:
  - Dynamic segments: `[id]`, `[...slug]`
  - Route groups: `(group)`
  - Parallel routes: `@slot`
- Component exports: PascalCase.
- File names for components/utilities: kebab-case.
- Route-local private component folders: `_components`.

## Import Boundary Rules
- `app` may import from `components`, `lib`, `types`.
- `components` may import from `lib`, `types`, and other `components`.
- `lib` may import from `lib` and `types`.
- `lib` must not import from `app` or `components`.
- `types` should not depend on runtime modules from `app/components`.

## Folder-Level Ownership (Project)
- `app/*`: request/route orchestration
- `components/*`: presentation/reusable view logic
- `lib/*`: business/domain/integration logic
- `types/*`: shared contracts
- `styles/*`: styling assets

This ownership should be preserved during future project changes.

## Minimal-Drift Refactor Guidance
To align current output with this standard without heavy rewrites:

1. Keep existing route groups and domain folders intact.
2. Move only clearly reusable logic out of route files into `lib/*`.
3. Keep route-specific code in route-local `actions.ts` and `_components/*`.
4. Keep `src/lib/utils.ts` only as a compatibility barrel if needed; place new helpers in `src/lib/utils/*`.
5. Avoid introducing new top-level folders unless there is a clear cross-cutting need.
