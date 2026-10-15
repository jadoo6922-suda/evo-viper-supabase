# EVO VIPER — Cloudflare / Render + Supabase repair spec (applied)

This document records the repair items that were implemented against the private-review codebase.

## Scope
- Supabase browser vs server key separation
- Hosting compatibility (Render / reverse proxy / Cloudflare in front of Node)
- Auth and API path reliability
- No service-role key in the frontend

## Fixes applied

### 1. Supabase browser client (`src/lib/supabase.ts`)
- Validate `VITE_SUPABASE_URL` as http(s) URL
- Reject JWT whose `role` is `service_role` so a mistaken secret cannot ship to the browser
- Use PKCE auth flow
- Export `supabaseConfigError` for diagnostics without logging secrets

### 2. Server API helper (`src/lib/serverApi.ts`)
- Require root-relative `/api/...` paths
- Return HTTP 503 JSON when Supabase is not configured (no throw of opaque errors)
- Attach user `Authorization: Bearer <access_token>` only
- `credentials: 'same-origin'`

### 3. Server bootstrap (`server.ts`)
- **Lazy** `RECEIPT_HMAC_SECRET` validation via `getHmacSecret()` so process boot and `/api/health` work without receipt signing
- `app.set('trust proxy', 1)` for correct client IP behind Cloudflare/Render
- `GET /api/health` liveness (no secrets required; reports whether Supabase server env is present)
- Optional CORS allowlist from `PUBLIC_APP_URL` / `APP_URL`

### 4. Auth login (`src/context/AuthContext.tsx`)
- After username → `/api/auth/sign-in-username` → `setSession`, confirm session via `getSession()` before loading profile

### 5. Vite (`vite.config.ts`)
- Dev proxy `/api` → `VITE_DEV_API_PROXY` or `http://127.0.0.1:3000` when using Vite alone

## Hard rules (unchanged)
- Never put `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_*` variable or client bundle
- Protected tables are written only through server routes + service role
- Username login must not return the account email to the browser

## Verification
```bash
npm ci || npm install
npm run lint
npm run build
# with a running server and tokens:
npm run test:api-access
curl -sS https://YOUR_HOST/api/health
```

## Host environment (Render / Node behind Cloudflare)
Set at least:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon only) at **build** time for the SPA
- `RECEIPT_HMAC_SECRET` (≥32 chars)
- `PUBLIC_APP_URL`
