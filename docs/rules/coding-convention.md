# Coding Conventions

These rules define the MVP coding baseline. Keep the code predictable, typed, and easy to change without adding process-heavy conventions that slow down small product teams.

## Rule Language
- `MUST`: required for the MVP baseline.
- `SHOULD`: strongly recommended when it fits the current feature.
- `MUST NOT`: prohibited.

## 1. Enforceable Quality Gates
**MUST**
- Pass the project quality commands before shipping changes:
  - `{{RUN_LINT_COMMAND}}`
  - `{{RUN_TYPECHECK_COMMAND}}`
  - `{{RUN_BUILD_COMMAND}}`
- Treat formatter output as the source of truth; do not manually fight formatting.

**SHOULD**
- Keep lint, typecheck, build, and format scripts deterministic and aligned with the commands in `package.json`.

## 2. TypeScript Standards
**MUST**
- Keep TypeScript `strict` enabled.
- Avoid implicit `any`.
- Prefer `unknown` over `any` for untrusted or unknown data.
- Use `any` only at narrow adapter boundaries where a third-party type is unavailable or impractical.
- Guard optional fields before using them.
- Use `satisfies` for config objects and static maps when shape validation is useful.
- Do not use `@ts-ignore` unless there is a short reason comment.

**SHOULD**
- Give exported service/lib functions explicit return types.
- Let React components, Next.js pages/layouts, and route handlers use inferred return types when inference is clear.
- Use `type` for unions and utility shapes; use `interface` when extension semantics are helpful.

## 3. Module Boundaries and Architecture
**MUST**
- Keep `src/lib` free of React component and DOM concerns.
- Keep route modules in `src/app` focused on validation, wiring, and response shaping.
- Keep reusable business logic in service/lib layers.
- Do not introduce circular imports.

**SHOULD**
- Keep modules cohesive and low-coupling.
- Split files when they become difficult to scan or safely edit.

## 4. Next.js App Router Boundaries
**MUST**
- Default to Server Components.
- Use `"use client"` only when state, effects, event handlers, or browser APIs are required.
- Do not import server-only modules into client components.
- Prefer server-side data fetching with Server Components, Server Actions, or Route Handlers.

**SHOULD**
- Fetch in client components only for interaction-driven cases.

## 5. Naming and File Conventions
**MUST**
- Use `PascalCase` for React component names.
- Use `camelCase` for functions and variables.
- Use kebab-case for route segments except Next.js special syntax:
  - dynamic segments: `[id]`, `[...slug]`
  - route groups: `(group)`
  - parallel routes: `@slot`

**SHOULD**
- Align file names with default exports where practical.

## 6. Function and Logic Quality
**MUST**
- Keep functions single-purpose and understandable.
- Prefer early returns over deep nesting.
- Do not hide surprising side effects in generic utility functions.

**SHOULD**
- Split functions or components when branching and state become hard to follow.
- Prefer clear code over clever abstractions.

## 7. Input Validation and Data Contracts
**MUST**
- Validate untrusted input at route handler, server action, webhook, and external-provider boundaries.
- Normalize external API responses before using them in UI or domain logic.
- Derive identity and ownership from trusted server context, not client-submitted fields.
- Guard optional fields before using them.

**SHOULD**
- Define reusable DTOs/contracts when a shape is shared across multiple files.
- Use strict schemas for sensitive or complex payloads.

## 8. Error Handling and Logging
**MUST**
- Return user-safe API errors.
- Do not swallow errors silently.
- Log actionable context without secrets.
- Do not log secrets, tokens, cookies, private keys, or full provider payloads.

**SHOULD**
- Keep API error responses reasonably consistent within a feature area.
- Throw or propagate structured errors when doing so makes call sites clearer.

## 9. Async, Concurrency, and Reliability
**MUST**
- Await async work unless it is intentionally fire-and-forget.
- Use `Promise.all` only for truly independent operations.

**SHOULD**
- Keep mutation paths idempotent where retries are possible.
- Add timeout or retry handling only where the user experience or provider behavior needs it.

## 10. Security and Environment Handling
**MUST**
- Keep server secrets out of client bundles.
- Fail fast on missing required provider env vars when that provider is used.
- Apply least privilege for privileged operations.

**SHOULD**
- Read required env vars through small provider-specific helpers.
- Add a broader typed env layer only when it simplifies the app.

## 11. Database and Persistence
**MUST**
- Keep DB write logic in controlled route, action, service, or lib layers.
- Use transactions or idempotent operations for multi-step writes that must stay consistent.

**SHOULD**
- Use explicit column selection in critical queries.
- Keep database access patterns typed and easy to trace.

## 12. Optional Tooling Enhancements
**SHOULD**
- Use Prettier and ESLint consistently.
- Enforce import order, unused code checks, or Tailwind class ordering only when the project already has that tooling configured.
