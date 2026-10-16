# Security hardening applied (2026-10-16)

## Done in code
- Removed unauthenticated `/api/debug/db-check`
- Security headers: nosniff, DENY frame, Referrer-Policy, Permissions-Policy, COOP/CORP, HSTS (prod), baseline CSP
- Disabled `X-Powered-By`
- Default JSON body limit 256kb (was 20mb)
- `isValidMoneyAmount` replaces broken `Math.round(x*100)!==x*100`
- `requirePermission`: MFA (AAL2) required for staff on sensitive permissions and for admin/super_admin/finance broadly
- OCR admin path requires AAL2 (no mfa_enabled bypass)
- Escrow threshold admin uses `requirePermission(..., manage_escrow_settings)`
- Session revoke calls `auth.admin.signOut(userId, 'global')` in addition to cutoff
- Client audit log allowlist only (login/logout/profile/catalog/support); rate limited; no WALLET_ADJUST_* from client
- Wallet adjust: no self-credit; finance per-request cap 2000; amount max 5000
- Dispute open: only transitions from held/pending escrow; rolls back dispute row on conflict
- `ADMIN_GATE_EMAIL` from env
- Client IP prefers `cf-connecting-ip`
- Disputes UI: removed Unsplash/mock OCR evidence
- Unknown `/api/*` does not fall through to SPA HTML

## Still recommended (ops / product)
- Apply SQL migrations on live Supabase including `202610140001` and `20261016_security_hardening.sql`
- Real payment rails instead of WhatsApp top-up
- Atomic dispute/settlement RPCs review
- PIN attempt counters in single SQL RPC
- package-lock + CI
- Legal pages (privacy/terms)
