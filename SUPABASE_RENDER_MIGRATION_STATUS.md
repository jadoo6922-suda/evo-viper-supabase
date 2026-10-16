# Firebase → Supabase migration status (13 October 2026)

## Implemented in this working copy
- Browser Supabase client uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Server uses a server-only Supabase service-role client and validates Supabase access tokens before protected actions.
- Authentication and profile loading use Supabase Auth + `store_profiles`; a database trigger creates profile, wallet, and security rows for new Auth users.
- Username sign-in is proxied through Supabase Auth without returning the account email to the browser, with basic per-IP/username throttling.
- Admin login checks the database role; accounts flagged for MFA must reach Supabase Auth assurance level `aal2`, and the admin MFA screen challenges a verified TOTP factor.
- Browser roles have no direct INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privileges on application tables. Read-only grants are limited to the catalog and user-scoped profile/wallet/ledger/transaction/order tables; writes go through server routes. This also prevents role, account status, MFA, PIN and license tampering from the browser.
- Wallet transfer and product purchase call server routes that invoke service-role-only, database-side transactional RPCs. Transfer PIN is hashed with scrypt server-side and failed attempts are temporarily locked.
- Wallet top-ups and merchant fee/deposit payments are disabled until a real payment provider can verify payments. Escrow dispute refund/release is now wired through a service-role-only atomic SQL routine that updates the wallet, ledger, transaction, order, escrow hold, dispute and idempotency record together; it still needs integration testing before real deployment.
- Product/catalog/order reads and product admin writes, private Storage uploads/signed downloads, merchant applications/reports, selected merchant admin actions, admin status changes, emergency settings, account-scoped notifications, audit logs, and dashboard counts are wired to Supabase/server routes.
- Removed Firebase client/admin dependencies from application source, Firebase Functions directory, Firebase configuration, Firestore rules/indexes, and Firebase-only maintenance scripts.
- Added `supabase/migrations/20261013_auth_profile_trigger.sql` for profile bootstrap, transfer-code uniqueness, storage role policies, and client privilege hardening.
- Added a granular server-side role-permission map and a super-admin-only staff role assignment control in the admin user table. Public clients receive only the escrow threshold through a narrow endpoint rather than direct access to platform settings. Staff tabs are scoped by role; financial dispute settlement is admin/super-admin only.
- Added `private.store_resolve_escrow_dispute` and service-only wrapper to refund the buyer or release escrow to the seller with an atomic ledger credit, order/hold/dispute state updates and idempotency record. Added `private.store_resolve_merchant_report` so report resolution and admin sanctions are atomic; moderators can dismiss or escalate reports but cannot suspend merchants.
- Transfer codes are now minted by the server and protected by a unique index; fixed PIN update lockout fields and hardened staff account-status changes.

## Not deployment-ready yet
This is a substantial migration pass, but **the full migration is not yet complete or verified**.

- No clean dependency install was possible in this environment (npm install timed out and the offline cache lacks packages), so the full TypeScript type-check and production build have not run. Syntax transpilation checks passed, and a partial `tsc` pass found no additional non-dependency diagnostics after fixes, but that is not a substitute for a clean build.
- The `store_orders_seller_required` check has been removed from the linked database and migration for schema consistency, but marketplace purchase code still rejects products without a valid seller. A platform-owned product revenue model would be needed before supporting seller-less paid products.
- Merchant activation now has single-use email tokens but activation is blocked until ledger-confirmed license/deposit payment; merchant license fee + deposit accounting/refunds and payment-provider top-ups remain disabled. Atomic dispute refunds/releases are wired but remain disabled for real-world use until integration tests pass.
- Added a user-facing support-ticket center with ticket threads and staff status controls, plus server-side endpoints. Added verified-purchase product reviews and rating aggregation. Added single-use merchant activation email tokens, but activation is deliberately blocked until the application is approved and license/deposit accounting confirms payment. These features still need full integration tests. Remote session revocation and merchant license/deposit settlement remain incomplete. Telegram linking is server-verified but still needs a real Telegram widget/bot configuration test.
- Supabase's latest security advisor now reports one remaining warning: leaked-password protection is disabled. It must be enabled in the Supabase Dashboard under Authentication password/security settings; the available project connector cannot toggle that Auth setting. All `admin` and `super_admin` sessions require AAL2 and a verified TOTP factor enrolled in Supabase Auth.
- Existing Supabase schema/RPCs were already present in the remote project; the migration file here is not a complete fresh-project schema export. Export the full base schema and RPC definitions before treating this repository as a reproducible database deployment.
- Added indexes for the 26 foreign keys flagged by the performance advisor and removed two duplicate permissive RLS policies. The latest security advisor no longer reports exposed security-definer RPCs; leaked-password protection is the remaining security warning. The current performance advisor no longer reports unindexed foreign keys or duplicate permissive policies; it reports newly-created/previously-unused indexes, which is expected before meaningful production traffic.
- Do not deploy financial flows until integration tests verify idempotency, ledger consistency, frozen-wallet handling, role boundaries, escrow refund/release edge cases, and RLS with both allowed and denied access.

## Required Render environment
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (public key only)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (used only for username-login proxy)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret; never prefix with `VITE_`)
- `RECEIPT_HMAC_SECRET`
- `BOOTSTRAP_SECRET` only for one-time initial super-admin setup; remove it after setup
- `TELEGRAM_BOT_TOKEN` only if Telegram account linking is enabled
- `GEMINI_API_KEY` if OCR verification is enabled
- `PORT` is supplied by Render

## Render commands (not yet build-verified)
- Build: `npm install && npm run build`
- Start: `npm start`

## Admin MFA hardening update (2026-10-13)
- Admin login no longer grants dashboard access after password-only authentication; all `admin` and `super_admin` accounts are sent through the Supabase MFA gate.
- `AdminMfaScreen` now challenges an existing verified TOTP factor, or enrolls a first-time factor by showing a QR code locally and requires a valid six-digit TOTP before completing login.
- The enrollment QR is intentionally not emailed or regenerated daily: it contains the authenticator secret and sending it to the same email channel would undermine MFA. Authenticator codes rotate automatically; email passwords should never be emailed. For an email-based daily step, use a short-lived one-time code instead, subject to Supabase email quota/configuration.
- Validation limitation: `node_modules` is not installed in this environment. `npx tsc --noEmit` therefore reports widespread missing dependency/type errors; this is not a successful build and the modified React components still need validation after dependencies install.
- The application source no longer imports Firebase; remaining migration work is feature completeness, fresh-project schema reproducibility, and full integration/build validation. Treat this package as an in-progress development snapshot, not production-ready.

## Dedicated admin access gateway update (2026-10-13)
- Added `/api/admin/confirm-mfa`, which only marks `store_profiles.mfa_enabled=true` after a valid Supabase token with AAL2 and an active `admin`/`super_admin` role.
- This change has not been build-verified because dependencies have not been installed successfully in the working environment. Full Firebase-to-Supabase migration and the other previously listed unfinished features remain incomplete; do not deploy as production-ready yet.


## Same-site daily admin gate implementation update (13 October 2026)
- Replaced the old `/admin-access` email magic-link approach with a single-site route `/admin/<daily-random-token>`.
- Added a daily server-side gate job using `PUBLIC_APP_URL` and Supabase Auth email delivery, plus a `CRON_SECRET`-protected endpoint so an external scheduler can trigger delivery reliably if Render sleeps. It generates a one-use daily path token and sends a Supabase Auth magic link; only token hashes are stored in `store_admin_daily_access`, and older date rows are deleted on the next daily run.
- Added admin-account verification and a daily access gate followed by Supabase TOTP MFA. Access remains restricted to the active `admin`/`super_admin` account matching `jadoo6922@gmail.com`, followed by the existing Supabase TOTP MFA gate. No password or TOTP secret is emailed.
- Added `supabase/migrations/20261013_daily_admin_access_gate.sql`; the matching table and expiry index have been applied to the linked Supabase project. Added a separate migration for support-ticket indexes; those indexes were applied to the remote project. A unique review index was not applied; duplicate prevention currently uses an application-side check and should be hardened with a concurrency-safe DB constraint in the next migration.
- Email delivery has not been end-to-end tested: Supabase Auth email delivery and the Render redirect URL allow-list must be configured. The project build/typecheck still cannot be certified because dependency installation times out in this environment.

- The source tree was scanned and no Firebase client/Admin/Functions imports remain in `src` or `server.ts`; this does not by itself certify feature parity or production readiness.


## Session revocation and review uniqueness follow-up (13 October 2026)
- Added a server-controlled `session_revoked_at` cutoff to `store_security_profiles`; protected API requests now reject Supabase JWTs issued at or before that cutoff. Added a super-admin-only endpoint `/api/admin/users/:userId/revoke-sessions`, with an audit log. This forces re-authentication on the next protected API request; it does not instantly erase the browser's local session display.
- Added a database unique index enforcing one review per reviewer/product and made the review endpoint recover safely from a concurrent duplicate insert.
- The session-revocation column migration still needs to be applied to the linked Supabase project before deploying this code. The unique review index has been applied remotely after confirming there were no duplicate product/reviewer pairs.

- Follow-up correction: admin/super-admin server permissions now always require AAL2, even if the profile's `mfa_enabled` flag was previously false. The daily QR stage records verification first, and consumes the daily gate only after MFA succeeds, avoiding accidental lockout if a TOTP attempt fails. Apply the added `qr_verified_at` column migration before deployment.

- Scope note: remote session revocation currently enforces a server-side cutoff for protected server API routes. It does not call a Supabase global sign-out API for the target user's session, and a previously open client may still display cached UI until it makes another protected request; do not describe this as a full instant global logout.
