# EVO VIPER — Security patch report

## Database safety boundary
This patch did not execute SQL, apply migrations, alter table data, alter policies, or change database permissions. The Supabase checks performed for this report were read-only catalog queries.

## Read-only Supabase observations
- RLS was enabled on all 24 ordinary tables returned from `public` at the time of inspection.
- `store_profiles` had RLS enabled with `store_profiles_select_own` (`auth.uid() = id`) and an own-row update policy.
- No table-level or column-level INSERT/UPDATE/DELETE grants to `anon` or `authenticated` were returned by the inspected privilege queries.
- Public-schema SECURITY DEFINER functions found in the inspection had execute ACLs limited to `postgres` and `service_role`.
- `store_seller_stats_select_public` permits public reads of seller aggregate fields (product/order counts and ratings); review whether seller IDs and those aggregate values are intended to be public.
- These catalog checks are not a live penetration test and cannot prove that no privileged project owner, leaked service-role key, or hosting secret can access the database.

## Source changes in this archive
- Switched PIN hashing/verification from synchronous `scryptSync` to asynchronous `crypto.scrypt`.
- Added a shared Upstash Redis REST rate limiter for login, admin gate, bootstrap, PIN actions, transfer-code generation, transfers, and support-ticket creation. Production should configure both Upstash variables and keep `REQUIRE_DISTRIBUTED_RATE_LIMIT=true`.
- Newly generated transfer codes are stored as SHA-256 hashes in the existing `store_profiles.transfer_code` column. The raw code is returned only to the authenticated caller; profile and admin list clients no longer select or return the column.
- Public transaction verification no longer returns sender/receiver names or the raw HMAC value; the signature is still checked server-side.
- Public merchant-license verification now queries only the allowlisted fields required for a license check instead of loading the entire `store_profiles` row.
- Production super-admin bootstrap is closed by default and requires `ALLOW_BOOTSTRAP_IN_PRODUCTION=true` only during initial setup.
- Migrated browser profile, wallet/ledger, catalog, and purchase-result reads to protected server endpoints. Every authenticated endpoint derives the account ID from a verified Supabase token rather than trusting a client-supplied user ID.
- Removed browser Postgres Changes subscriptions for wallet/catalog; the UI now refreshes through server endpoints.
- Public catalog API uses an explicit column allowlist and strips storage paths, direct download URLs, moderation notes, and unapproved metadata keys.
- Admin login/profile checks now use the protected own-profile endpoint rather than direct reads from `store_profiles`.
- Added `supabase/migrations/202610140001_private_public_schema_data_api.sql` to revoke `anon`/`authenticated` table/view and sequence privileges after rollout, plus a two-account API smoke-test script.

## Remaining items requiring owner action or additional testing
- Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the hosting environment. With `REQUIRE_DISTRIBUTED_RATE_LIMIT=true`, sensitive operations fail closed in production if the shared limiter is missing/unavailable.
- Remove `BOOTSTRAP_SECRET` and `ALLOW_BOOTSTRAP_IN_PRODUCTION` from Render after initial setup; this patch cannot edit Render settings.
- Old transfer-code values already stored in the database were not changed. Users should generate fresh codes after deployment; no data migration was run because the database was explicitly kept untouched.
- Static scan confirms the only remaining browser `.from(...)` call is a Supabase Storage upload to `store-product-files`; there are no remaining browser queries against public-schema tables in the scanned TypeScript/TSX source. Storage bucket policies are separate and still require an independent test.
- The public-schema lockdown migration has **not** been applied to the live Supabase project. Do not apply it until the updated server is deployed and `scripts/test-api-access.mjs` passes, because a live site still serving old JavaScript could otherwise break.
- Real ordinary-user/admin API tests were not executed here because no real short-lived test access tokens or running deployed endpoint were provided. The included script tests user ownership, regular-user admin denial, admin access, public catalog field allowlists, and direct Data API denial after the migration.
- Full build and end-to-end tests were not completed because `npm install` timed out in this environment and dependencies were unavailable. `node --check scripts/test-api-access.mjs` passed, but a dependency-aware build must pass before deployment.
