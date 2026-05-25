# Workflow

These rules define the MVP workflow baseline. Work in small, understandable steps and keep the project easy for the next agent or developer to continue.

## Rule Language
- `MUST`: required for the MVP baseline.
- `SHOULD`: strongly recommended when it fits the current task.
- `MUST NOT`: prohibited.

## 1) Start With Context
**MUST**
- Inspect existing patterns before editing. Find the closest route, component, helper, or service and follow its style.
- If requirements are unclear, state reasonable assumptions and proceed with the safest default.
- Identify the likely files or areas affected before making changes.

**SHOULD**
- For non-trivial work, summarize the goal, scope, and done criteria before editing.
- For tiny edits, keep the setup lightweight and proceed directly.

## 2) Prefer Vertical Slices
**SHOULD**
- Implement user-facing features as vertical slices when applicable: UI, server behavior, data, and verification in one coherent pass.
- Keep each slice small enough to review and adjust.

**MUST**
- Avoid broad refactors unless they are directly required for the requested change.

## 3) Tight Change Discipline
**MUST**
- Keep changes scoped to the user request.
- Do not change unrelated files.
- If formatting changes are needed, keep them within touched files.
- Reuse existing utilities, components, and patterns before introducing new ones.
- When adding a new pattern, add one clear canonical example and reuse it.

## 4) Server/Client Boundaries
**MUST**
- Default to Server Components in the App Router.
- Add `"use client"` only when state, effects, event handlers, or browser APIs are required.
- Do not import server-only modules into client components.
- Validate untrusted data at server boundaries such as route handlers and server actions.

## 5) Risky Changes
**MUST**
- Never log secrets.
- Redact tokens, cookies, auth headers, webhook secrets, and private keys from any output.
- Do not leak stack traces or raw provider errors to users.
- Use an explicit environment target for hosted provider, database, deployment, or destructive operations.
- Default to local development when the target environment is not specified.

**SHOULD**
- For database, hosted env, deploy, payment, auth, or destructive changes, use a simple flow: understand current state, apply the smallest change, then verify the expected outcome.

## 6) Completion Checks
**MUST**
- Before marking work done, run the relevant available checks for the files changed:
  - lint/typecheck for code changes
  - build for route, config, dependency, or framework changes
  - visual inspection for UI changes
- If a relevant command cannot be run, state the command and why it was skipped.

## 7) Evidence-Based Finish
**MUST**
- End with what changed and how it was verified.
- Mention any important remaining risk or follow-up only when it affects the user’s next decision.

**SHOULD**
- Keep the final summary proportional to the size of the change.

## 8) Dependency Discipline
**MUST**
- Add dependencies only when necessary.
- Prefer existing utilities first.
- When adding a dependency, explain why and use it in at least one place immediately.
