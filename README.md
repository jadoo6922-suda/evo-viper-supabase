# Digital Store — Supabase migration working copy

This branch is the local working copy of the Supabase-backed application. It is **not yet production-ready**; see `SUPABASE_RENDER_MIGRATION_STATUS.md` for the remaining disabled flows and validation gaps.

## Required environment

### Browser / Vite
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` — public key only

### Server / Render
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` — used by the username-login proxy
- `SUPABASE_SERVICE_ROLE_KEY` — secret, server-only; never use a `VITE_` prefix
- `RECEIPT_HMAC_SECRET` — strong random secret, required at startup
- `PUBLIC_APP_URL` — canonical Render URL (for example `https://your-app.onrender.com`), no trailing slash
- Supabase Auth email delivery must be configured in Supabase Authentication settings; the app does not call Resend or another external mail API
- `ADMIN_GATE_CRON_SECRET` — random secret of at least 32 characters to authorize an external daily scheduler call to `/api/cron/admin-daily-gate`
- `GEMINI_API_KEY` — optional unless OCR verification is used
- `BOOTSTRAP_SECRET` — one-time super-admin bootstrap only; remove after setup
- `TELEGRAM_BOT_TOKEN` — required only for Telegram account linking; server-only

### Daily admin access gateway
- The administration gateway is on the same app at `/admin/<daily-random-token>`; it is not a second site.
- Each day the server generates a one-use path token, stores only its SHA-256 hash in `store_admin_daily_access`, and asks Supabase Auth to email a magic link to `jadoo6922@gmail.com`. Previous-day rows are deleted by the daily job.
- The admin opens the Supabase Auth magic link, which establishes the account session and returns to the one-use daily admin URL, then completes Supabase TOTP MFA. The password and TOTP setup secret are never emailed. The daily gate is marked used only after MFA succeeds, so a failed TOTP attempt does not immediately consume the day’s link.
- Daily email depends on Supabase Auth email delivery being configured and the Render `PUBLIC_APP_URL` being allow-listed under Supabase Auth redirect URLs. The app does not call Resend or another external mail API. For a Render instance that sleeps, configure an external daily scheduler to POST to `/api/cron/admin-daily-gate` with `Authorization: Bearer <ADMIN_GATE_CRON_SECRET>`; this is a scheduler call to the same website, not a second website. The fixed mailbox `jadoo6922@gmail.com` must match an active `admin` or `super_admin` profile in `store_profiles`.
- `PORT` — supplied by Render

Never commit `.env` or service-role credentials. If a secret was ever pasted into a chat, repository, or client-side variable, rotate it.

## Local development

1. Copy `.env.example` to `.env` and fill in the required values.
2. Install dependencies with `npm install`.
3. Run `npm run dev` for local development.
4. Run `npm run lint` and `npm run build` before deployment.

The current execution environment could not complete dependency installation, so those commands have not yet been verified in this working copy.

## Database

The remote Supabase project already had its base `store_*` schema and wallet RPCs. The included SQL migration adds the auth-user profile/wallet trigger and tightens profile update privileges. It is **not a full fresh-project schema export**; export the complete base schema and RPC definitions before reproducing this project in a new Supabase project.

## Financial safety status

- Transfer and product purchase use server-side transactional RPCs.
- Transfer PINs are scrypt-hashed on the server and failed attempts are temporarily locked.
- Wallet top-ups and merchant fee/deposit payments remain disabled until a real payment provider verifies payments. Escrow dispute refunds/releases now use a server-only atomic settlement RPC, but still require integration tests before real deployment.
- Purchases require a product with a valid seller; legacy seller-less products are rejected by the purchase route/RPC.
- All `admin` and `super_admin` server-protected operations require Supabase Auth assurance level AAL2 with a verified TOTP factor, regardless of the profile's `mfa_enabled` flag.
- Browser roles have no direct table-write grants; only required read access is granted, and RLS limits rows to the owner or published catalog. Platform settings are accessed through narrow server endpoints.
- Admin access is role-scoped on the server (`super_admin`, `admin`, `finance`, `product_manager`, `moderator`, `support`); only the super-admin can assign staff roles. Financial dispute settlement is restricted to `admin`/`super_admin` and writes a ledger credit plus an audit entry atomically.
- Transfer codes are now generated server-side and protected by a unique database index; the browser no longer chooses the code value.
- Support tickets are server-mediated, owner-scoped, rate-limited at creation, and staff-reply capable. Product reviews require a paid/completed order and refresh the product rating summary. Merchant activation tokens are single-use and expire after 30 minutes; activation refuses to proceed until the application is approved and license/deposit records confirm payment.

## Private administrator access gateway

- The admin gateway is on the same deployed site at `/admin/<daily-random-token>`. There is no second website.
- The server generates a fresh daily path token; only its SHA-256 hash is stored in `store_admin_daily_access`. Old daily records are deleted, and the link expires at the end of the UTC day.
- The flow is: open the Supabase Auth magic link → verify the active admin account on the server → complete Supabase TOTP MFA. The password and TOTP enrollment secret are never emailed.
- `jadoo6922@gmail.com` must be an existing active `admin` or `super_admin` account in both Supabase Auth and `store_profiles`.
- Configure `PUBLIC_APP_URL` and `ADMIN_GATE_CRON_SECRET` on Render, and allow-list `https://evoweb.onrender.com/admin/**` in Supabase Auth redirect URLs. The app attempts delivery on startup and daily; for sleeping Render instances, use a scheduler to POST to `/api/cron/admin-daily-gate` with `Authorization: Bearer <ADMIN_GATE_CRON_SECRET>` once per day. This scheduler calls the same website and does not create a second website.
- A super-admin-only remote session revocation endpoint sets a server-side cutoff; protected server API requests reject tokens issued before that cutoff. This is application-level revocation, not a claim that Supabase Auth globally deleted every session or that an already-open browser instantly clears its local UI.
- Never commit `.env` or service-role credentials. If a secret was pasted into chat or a repository, rotate it.

## New repository handoff
See [`NEW_REPOSITORY_SETUP.md`](./NEW_REPOSITORY_SETUP.md) for the clean GitHub repository setup, secret handling, daily Supabase Auth admin-link behavior, Render environment variables, and the validation checklist. This source snapshot is still a development build until the listed checks pass.
