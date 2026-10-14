# EVO VIPER — clean repository setup

Suggested new GitHub repository: `EVO-VIPER-SUPABASE`.

## Important status
This is a clean source snapshot prepared for a new repository, not a claim that the application is production-ready. The current database has received live schema changes, but a fresh Supabase project still needs all schema and function migrations replayed and verified. Build/type-check and end-to-end flows must pass before public deployment.

## Create the repository
1. On GitHub, create a new **private** repository named `EVO-VIPER-SUPABASE` (no README/license/gitignore initialization is needed because this folder already contains files).
2. Upload the contents of this folder to the repository root, or push this folder using Git from a trusted computer.
3. Keep the old repository unchanged as a backup until the new repository and deployment have passed verification.
4. Never upload `.env`, API keys, service-role keys, access tokens, QR secrets, or daily admin links. `.env.example` contains placeholders only.

## Admin URL token
The application generates the daily path token on the server using `crypto.randomBytes(32).toString('base64url')`. That yields 32 cryptographically random bytes (256 bits; usually 43 URL-safe characters). It is not a permanent token to manually invent or commit. Each daily email contains the new link, key, and QR. The prior day’s row is deleted and its link expires. Do not put a fixed admin token in source code or GitHub.

## Render environment
Configure values from `.env.example` in Render's Environment settings. In particular, set `PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RECEIPT_HMAC_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAIL_FROM`, and `ADMIN_GATE_CRON_SECRET`. Generate secret values using a cryptographically secure generator; do not reuse the daily URL token as any environment secret. Verify the sender domain with the mail provider before expecting daily email delivery.

## Validation checklist
- `npm ci` (or `npm install` if no lockfile exists)
- `npm run lint`
- `npm run build`
- Run the Supabase migrations against a clean test project and verify schema parity
- Test sign-up/profile creation, sign-in, admin daily email, single-use key, password login, QR completion, MFA/AAL2, session revocation, product publishing/purchase/download, transfers, merchant application/activation, support tickets, reviews, and dispute settlement
- Only deploy after all checks pass; do not enable real-money flows until financial integration tests pass


## Security environment requirements
- Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the host for shared rate limits across instances. Keep `REQUIRE_DISTRIBUTED_RATE_LIMIT=true`; sensitive operations fail closed in production if required distributed limiting is missing.
- `ALLOW_BOOTSTRAP_IN_PRODUCTION` is only for the initial setup window. Remove it and `BOOTSTRAP_SECRET` after the first super-admin is established.
- New transfer codes are stored as SHA-256 hashes in the existing `store_profiles.transfer_code` column; users must regenerate any code created by the old version. No schema migration is included.
- Public transaction verification no longer returns party names or the raw HMAC value.
- This patch did not execute SQL, apply migrations, or write directly to Supabase.
