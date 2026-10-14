/*
 * EVO VIPER API boundary smoke test.
 * Run after deploying the updated server and (for Data API denial checks) applying
 * supabase/migrations/202610140001_private_public_schema_data_api.sql.
 * Required: BASE_URL, TEST_USER_TOKEN, TEST_ADMIN_TOKEN.
 * Optional: SUPABASE_URL, SUPABASE_ANON_KEY.
 * Never commit tokens or put them in a VITE_* variable.
 */
import assert from 'node:assert/strict';

const base = String(process.env.BASE_URL || '').replace(/\/$/, '');
const userToken = process.env.TEST_USER_TOKEN || '';
const adminToken = process.env.TEST_ADMIN_TOKEN || '';
if (!base || !userToken || !adminToken) {
  console.error('Set BASE_URL, TEST_USER_TOKEN and TEST_ADMIN_TOKEN in your local shell.');
  process.exit(2);
}

async function call(path, token, init = {}) {
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...init, headers, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

const userProfile = await call('/api/me/profile', userToken);
assert.equal(userProfile.response.status, 200, `regular user's profile should load, got ${userProfile.response.status}`);
assert.ok(userProfile.body.profile?.id, 'profile must contain its own id');
assert.ok(!('transfer_code' in userProfile.body.profile), 'profile must not expose transfer_code');
assert.ok(!('password' in userProfile.body.profile), 'profile must not expose password fields');

const userWallet = await call('/api/me/wallet', userToken);
assert.equal(userWallet.response.status, 200, `regular user's own wallet should load, got ${userWallet.response.status}`);
assert.ok(Array.isArray(userWallet.body.ledger), 'wallet response should contain ledger array');
assert.ok(Array.isArray(userWallet.body.transactions), 'wallet response should contain transaction array');

const userAdmin = await call('/api/admin/users', userToken);
assert.ok([401, 403].includes(userAdmin.response.status), `regular user must be denied admin users API, got ${userAdmin.response.status}`);

const adminProfile = await call('/api/me/profile', adminToken);
assert.equal(adminProfile.response.status, 200, `admin's own profile should load, got ${adminProfile.response.status}`);
assert.ok(['admin', 'super_admin'].includes(adminProfile.body.profile?.role), 'admin test token must belong to an admin/super_admin account');

const adminUsers = await call('/api/admin/users', adminToken);
assert.equal(adminUsers.response.status, 200, `admin users API should succeed for admin token, got ${adminUsers.response.status}`);

const publicCatalog = await call('/api/catalog-data', '');
assert.equal(publicCatalog.response.status, 200, `public catalog should load, got ${publicCatalog.response.status}`);
for (const product of (publicCatalog.body.products || [])) {
  assert.ok(!('file_storage_path' in product), 'public catalog must not expose private storage paths');
  assert.ok(!('download_url' in product), 'public catalog must not expose direct download URLs');
  assert.ok(!('rejection_reason' in product), 'public catalog must not expose internal moderation notes');
}

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const apiKey = process.env.SUPABASE_ANON_KEY;
  for (const table of ['store_profiles', 'store_wallets', 'store_transactions', 'store_ledger_entries', 'store_orders']) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, { headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` } });
    assert.ok([401, 403, 404].includes(response.status), `anon Data API must not read ${table}; got HTTP ${response.status}`);
  }
  for (const table of ['store_profiles', 'store_wallets', 'store_transactions', 'store_ledger_entries', 'store_orders']) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, { headers: { apikey: apiKey, Authorization: `Bearer ${userToken}` } });
    assert.ok([401, 403, 404].includes(response.status), `authenticated Data API must not read ${table}; got HTTP ${response.status}`);
  }
}

console.log('PASS: profile ownership, own-wallet boundary, regular-user admin denial, admin access, and public catalog allowlist.');
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) console.log('PASS: direct Data API table access denied for anon and authenticated JWTs.');
else console.log('SKIP: direct Data API denial checks; set SUPABASE_URL and SUPABASE_ANON_KEY after applying the lockdown migration.');
