---
name: api-security
description: Security controls for any web API/app — authentication & authorisation, IDOR/ownership, role-grant allowlists, input & JSON-injection defence, injection, rate limiting, IP restriction, CORS/headers/cookies, secrets, PII-safe logging, error leakage, webhooks, audit logging, AI/LLM risks. Stack-agnostic. Use when planning, coding or reviewing anything that exposes an endpoint, handles input, or touches auth, config, logs or integrations.
---

# API Security

The baseline checklist (S1–S15) is in `agents/security.md`. The current posture is in `Codebase.md` §1.

## 1. Authentication & authorisation
- Deny by default; open public routes explicitly.
- **Authorise twice:** at the route and in the service/use-case layer. A route rule alone breaks when another module calls the service directly.
- Passwords: argon2id or bcrypt via the stack's standard library. MFA available for privileged roles.
- Every login path checks the account status (active, verified) before issuing a session.
- One-time tokens (reset, OTP, magic link) are **claimed atomically**: `UPDATE … SET consumed_at = now() WHERE hash = ? AND consumed_at IS NULL AND expires_at > now()` → rows = 1.

## 2. Ownership (IDOR)
**Scope the query, don't filter after:** `WHERE id = ? AND owner_id = ?`. Return 404 for
someone else's resource. Random ids are **not** access control. Privileged bypasses are explicit and role-checked.

## 3. Privilege escalation & mass assignment
Request schemas never carry `id`, `role`, `status`, `owner_id`, `tenant_id`. Role grants are
validated against `permittedRolesFor(actor)`. A DB enum stops junk values, not an admin minting a superadmin.

## 4. Input
Validate every field with the stack's schema tool (length, format, range) · cap the body size ·
reject or ignore unknown fields deliberately · never enable polymorphic or class-name
deserialisation · parameterised queries only, with no string-built SQL, shell, or template input.

## 5. Rate limiting
Per IP and per user; stricter on login, signup, OTP, password reset, AI, and expensive
endpoints · **429** + `Retry-After` · with 2+ instances, keep the counters in Redis · trust
`X-Forwarded-For` only from your own proxy.

## 6. Network exposure
Admin, ops, and metrics routes aren't publicly reachable without auth (allowlist IPs or use a separate port bound to localhost) · bind dev servers to `127.0.0.1`.

## 7. Browser-facing
An explicit CORS origin list (never `*` with credentials) · security headers (HSTS, `X-Content-Type-Options`, frame-ancestors / CSP) ·
cookies `Secure; HttpOnly; SameSite` · CSRF protection for cookie sessions · user uploads: sniff the type from the bytes, cap the size, serve from a separate origin with `Content-Disposition: attachment`, and scan them.

## 8. Secrets
From the environment or a secret store; `.env` is gitignored, and `.env.example` holds placeholders. A committed secret → **rotate first**, then clean the history (ask before rewriting it).

## 9. Errors & logs
No stack traces, SQL, or internal paths in responses · generic 500 bodies · never log passwords, tokens, auth headers, OTPs, emails, or government ids. Log internal ids.

## 10. Webhooks & integrations
Verify the signature with a constant-time comparison **and assert the result** · idempotent on the provider's event id · **one canonical writer** per state machine (the webhook, not the browser redirect) · timeouts on every outbound call.

## 11. Audit log
Privileged and destructive actions write an append-only `audit_log` row (actor, action, entity, id, before/after redacted, ip, at) in the same transaction. The app's DB role can't `UPDATE` or `DELETE` it.

## 12. AI / LLM (if used)
Treat user **and retrieved** content as data, never instructions · redact PII before the model call and before logging · per-user rate and token caps · moderate output · allowlist model tool calls and authorise them server-side.
