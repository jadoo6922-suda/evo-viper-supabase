# EVO VIPER — server-only application data access rollout

## Changes in this revision

- Browser profile reads use `GET /api/me/profile` and return only an explicit profile allowlist for the authenticated account.
- Wallet and ledger reads use `GET /api/me/wallet`; the server scopes every query to the verified token's user ID.
- Published catalog and the current user's orders use `GET /api/catalog-data`. The public response excludes storage paths, direct download URLs, and moderation notes, and sanitizes product metadata.
- Purchase receipt retrieval uses `GET /api/me/purchase-result`; both the order and transaction must belong to the authenticated buyer.
- Removed browser Postgres Changes subscriptions for wallet/catalog. The contexts refresh through server endpoints instead.
- Admin login/profile checks now call the authenticated profile endpoint instead of querying `store_profiles` directly.
- The only remaining browser `.from(...)` call is a Storage upload to `store-product-files`; it is not a public-schema table query and still depends on correct Storage bucket policies.
- No service-role key is imported into the frontend. Keep `SUPABASE_SERVICE_ROLE_KEY` only in the server's secret environment.

## Safe rollout order

1. Deploy the updated source and set server environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the existing required server secrets) in the hosting provider's secret manager. Never set the service-role key as `VITE_*`.
2. Configure local test tokens without committing them: `BASE_URL`, `TEST_USER_TOKEN`, and `TEST_ADMIN_TOKEN`. The admin token must represent an admin/super-admin session that has completed the required MFA.
3. Run `node scripts/test-api-access.mjs` before revoking Data API grants. Confirm ordinary-user admin calls are denied and the admin endpoint succeeds.
4. Apply `supabase/migrations/202610140001_private_public_schema_data_api.sql` through the Supabase SQL editor or approved migration pipeline only after steps 1–3 pass.
5. Run the same smoke test with `SUPABASE_URL` and `SUPABASE_ANON_KEY` set. The direct REST table checks must return 401/403/404 for both anon and ordinary authenticated JWTs.
6. Verify login/signup, admin MFA, product upload, catalog, wallet, transfer, purchase, download, support, reports, and all admin screens manually. Storage uploads use the separate `storage` schema and must be tested independently.

## Important limitations

- This migration revokes browser-role privileges on tables/views and sequences in `public`; it does not modify Supabase Auth, Storage policies, or function execute grants.
- Existing RLS policies remain as defense in depth but no longer grant access when the role has no table privilege.
- Do not apply this migration to production before deploying and testing the server endpoints. Applying it first can break any unconverted browser query.
- The test script needs real, short-lived test access tokens from one ordinary user and one MFA-completed admin. These tokens must be supplied through the local shell only and must never be committed or pasted into chat.
- The project has not been marked production-ready until dependency installation/build, API smoke tests, and the end-to-end checks above pass.
