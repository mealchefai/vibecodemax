# Security

These rules define the MVP security baseline. Keep the app safe by default without adding enterprise process, observability, or compliance machinery unless the product explicitly needs it.

## Rule Language
- `MUST`: required for the MVP baseline.
- `SHOULD`: strongly recommended when it fits the current feature.
- `MUST NOT`: prohibited.

## Secrets and Environment
**MUST**
- Never commit secrets such as API keys, tokens, service role keys, private keys, cookies, or webhook secrets.
- Server-only secrets must never be referenced in client components, public runtime config, or `NEXT_PUBLIC_*` variables.
- Only `NEXT_PUBLIC_*` variables may be used in browser code, and only when the value is safe to disclose.
- Keep `.env.example` complete and non-sensitive, using placeholder values.
- Redact secrets from logs, errors, and UI messages.

## Auth, Sessions, Authorization
**MUST**
- Check authorization on the server for every protected or privileged operation.
- Use default deny: if user identity, role, or ownership cannot be verified, reject the request.
- Enforce ownership checks for user-scoped data.
- Never trust client-provided user IDs, role names, account IDs, or ownership fields.
- Keep admin capabilities isolated behind explicit role or claim checks.

**SHOULD**
- Prefer short-lived session patterns provided by the auth provider.
- Avoid storing raw access tokens in browser storage.

## Input Validation and Data Boundaries
**MUST**
- Validate external input at boundaries before using it in database writes, provider calls, billing actions, uploads, or privileged operations.
- Treat route handler input, server action input, webhook payloads, URL params, and external service responses as untrusted.
- Derive identity and ownership from the authenticated session, not request body fields.

**SHOULD**
- Use strict schemas for complex or sensitive payloads.
- Reject unknown fields when accepting structured data for privileged operations.

## Database and RLS (Supabase)
**MUST**
- Enable RLS on user-facing tables by default.
- Policies must enforce ownership or team membership for `select`, `update`, and `delete`.
- Inserts must not allow users to set server-controlled fields such as roles, billing status, or ownership for another user.
- Service role keys must stay server-only and should be used only for admin, webhook, or system tasks.

## File Uploads and Storage
**MUST**
- Validate upload size and allowed file types before accepting files.
- Store user files in scoped paths such as `userId/...` and enforce matching access rules.
- Do not rely only on client-supplied file metadata for security decisions.
- Signed URLs must be short-lived and scoped to the authenticated user or team.

## Webhooks and Payments
**MUST**
- Verify webhook signatures before processing events.
- Make webhook handling idempotent using event IDs or idempotency keys.
- Apply billing state changes on the server only.
- Never accept payment state, subscription status, prices, or plan changes from client input.

**SHOULD**
- Reject replayed webhook events when the provider supports replay protection.

## Rate Limiting and Abuse Protection
**MUST**
- Rate limit public or abuse-prone endpoints such as auth, contact forms, upload endpoints, expensive writes, and AI endpoints when present.
- Prefer per-user limits for authenticated requests and per-IP limits for anonymous requests.

**SHOULD**
- Add simple usage limits for expensive AI or provider-backed features when those features exist.

## Error Handling and Information Disclosure
**MUST**
- Do not expose stack traces, secrets, provider internals, SQL errors, or raw exception messages to users.
- Return user-safe error messages from routes and actions.
- Log detailed errors server-side only, with secret redaction.

**SHOULD**
- Use stable error codes for routes that are called by client UI.

## Dependencies and Supply Chain
**MUST**
- Add dependencies only when needed; prefer existing utilities and framework APIs.
- Avoid unmaintained packages and packages that enable unsafe execution patterns.
- Address known high-severity vulnerabilities in runtime dependencies before shipping.

## Security Headers and Cookies
**SHOULD**
- Use secure cookie settings where applicable: `HttpOnly`, `Secure`, and `SameSite=Lax` or `SameSite=Strict`.
- Add simple baseline security headers where feasible, such as `X-Content-Type-Options`.
- Avoid putting sensitive data in URLs or query parameters.

## Operational Safety
**SHOULD**
- Require explicit confirmation before destructive production operations.
- Fail closed when the target environment or user authority is ambiguous.
- Keep operational logging minimal and useful; do not build audit systems unless the app needs them.

## Verification before done
**MUST**
- For changes affecting auth, billing, RLS, webhooks, uploads, or AI endpoints:
  - run the relevant lint/type/test checks available in the project
  - verify the happy path and at least one denied/invalid path
  - add targeted tests when the behavior is shared, risky, or easy to regress
