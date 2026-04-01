/**
 * Step 8A — Governance Public API Verification Suite.
 * Standalone integration tests. Server must be running on BASE_URL.
 * No changes to existing implementation; Node standard libraries only.
 */

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'test_key';

type ApiResult = { status: number; body: unknown };

async function apiGet(path: string, includeApiKey = true): Promise<ApiResult> {
  const url = new URL(path, BASE_URL).toString();
  const headers: Record<string, string> = {};
  if (includeApiKey) headers['X-IRIS-API-KEY'] = API_KEY;
  const res = await fetch(url, { method: 'GET', headers });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function apiRequest(method: string, path: string): Promise<ApiResult> {
  const url = new URL(path, BASE_URL).toString();
  const res = await fetch(url, {
    method,
    headers: { 'X-IRIS-API-KEY': API_KEY, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

// --- Test results
const results: Record<string, 'PASS' | 'FAIL'> = {};

function pass(name: string): void {
  results[name] = 'PASS';
  console.log(`  ${name}: PASS`);
}
function fail(name: string): void {
  results[name] = 'FAIL';
  console.log(`  ${name}: FAIL`);
}

// --- Test 1: API key obbligatoria
async function test1ApiKeyRequired(): Promise<void> {
  const { status } = await apiGet('/governance/tier', false);
  if (status === 401) pass('API key enforcement');
  else fail('API key enforcement');
}

// --- Test 2: Tier endpoint
async function test2TierEndpoint(): Promise<void> {
  const { status, body } = await apiGet('/governance/tier');
  if (status !== 200) {
    fail('Tier endpoint');
    return;
  }
  const b = body as Record<string, unknown>;
  const has =
    typeof b.tier === 'string' &&
    typeof b.score === 'number' &&
    typeof b.tier_range === 'string' &&
    typeof b.snapshot_id === 'string' &&
    b.snapshot_id.length > 0 &&
    typeof b.timestamp === 'string' &&
    typeof b.response_hash === 'string' &&
    (b.response_hash as string).length === 64;
  const scoreOk = Number(b.score) >= 0 && Number(b.score) <= 100;
  if (has && scoreOk) pass('Tier endpoint');
  else fail('Tier endpoint');
}

// --- Test 3: Certificate endpoint
async function test3CertificateEndpoint(): Promise<void> {
  const { status, body } = await apiGet('/governance/certificate');
  if (status !== 200) {
    fail('Certificate endpoint');
    return;
  }
  const b = body as Record<string, unknown>;
  const hash = (b.hash ?? b.certificate_hash) as string | undefined;
  const has =
    typeof b.certificate_id === 'string' &&
    typeof hash === 'string' &&
    hash.length === 64 &&
    typeof b.issued_at === 'string' &&
    typeof b.tier === 'string' &&
    b.valid === true;
  const issuedAtValid = !Number.isNaN(Date.parse((b.issued_at as string) ?? ''));
  if (has && issuedAtValid) pass('Certificate endpoint');
  else fail('Certificate endpoint');
}

// --- Test 4: SLA endpoint
async function test4SlaEndpoint(): Promise<void> {
  const { status, body } = await apiGet('/governance/sla');
  if (status !== 200) {
    fail('SLA endpoint');
    return;
  }
  const b = body as Record<string, unknown>;
  const availability = Number(b.availability_target);
  const latency = Number(b.latency_target_ms);
  const has =
    typeof b.profile === 'string' &&
    Number.isFinite(availability) &&
    Number.isFinite(latency) &&
    typeof b.breach_count_30d === 'number';
  const valid = availability >= 0 && availability <= 1 && latency > 0;
  if (has && valid) pass('SLA endpoint');
  else fail('SLA endpoint');
}

// --- Test 5: Snapshot endpoint
async function test5SnapshotEndpoint(): Promise<void> {
  const { status, body } = await apiGet('/governance/snapshot');
  if (status !== 200) {
    fail('Snapshot endpoint');
    return;
  }
  const b = body as Record<string, unknown>;
  const hash = (b.governance_hash as string) ?? '';
  const has =
    typeof b.snapshot_id === 'string' &&
    b.integrity_verified === true &&
    typeof b.governance_hash === 'string' &&
    hash.length === 64 &&
    typeof b.timestamp === 'string' &&
    typeof b.response_hash === 'string';
  if (has) pass('Snapshot endpoint');
  else fail('Snapshot endpoint');
}

// --- Test 6: History endpoint
async function test6HistoryEndpoint(): Promise<void> {
  const { status, body } = await apiGet('/governance/history?limit=10');
  if (status !== 200) {
    fail('History endpoint');
    return;
  }
  const b = body as Record<string, unknown>;
  const entries = Array.isArray(b.entries) ? b.entries : [];
  const lengthOk = entries.length <= 10;
  const eachOk = entries.every((e: unknown) => {
    const x = e as Record<string, unknown>;
    return (
      typeof x.snapshot_id === 'string' &&
      typeof x.tier === 'string' &&
      typeof x.timestamp === 'string'
    );
  });
  if (lengthOk && eachOk) pass('History endpoint');
  else fail('History endpoint');
}

// --- Test 7: Hash stability
async function test7HashStability(): Promise<void> {
  const a = await apiGet('/governance/certificate');
  const b = await apiGet('/governance/certificate');
  if (a.status !== 200 || b.status !== 200) {
    fail('Hash stability');
    return;
  }
  const hashA = (a.body as Record<string, unknown>).hash as string;
  const hashB = (b.body as Record<string, unknown>).hash as string;
  if (hashA === hashB && hashA?.length === 64) pass('Hash stability');
  else fail('Hash stability');
}

// --- Test 8: Read-only enforcement
async function test8ReadOnlyEnforcement(): Promise<void> {
  const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  let all405 = true;
  for (const method of methods) {
    const { status } = await apiRequest(method, '/governance/tier');
    if (status !== 405) all405 = false;
  }
  if (all405) pass('Read-only enforcement');
  else fail('Read-only enforcement');
}

// --- Test 9: Rate limit
async function test9RateLimit(): Promise<void> {
  let got200 = false;
  let got429 = false;
  for (let i = 0; i < 120; i++) {
    const { status } = await apiGet('/governance/tier');
    if (status === 200) got200 = true;
    if (status === 429) got429 = true;
  }
  if (got200 && got429) pass('Rate limiting');
  else fail('Rate limiting');
}

// --- Test 10: Snapshot consistency
async function test10SnapshotConsistency(): Promise<void> {
  const tierRes = await apiGet('/governance/tier');
  const snapRes = await apiGet('/governance/snapshot');
  if (tierRes.status !== 200 || snapRes.status !== 200) {
    fail('Snapshot consistency');
    return;
  }
  const tierId = (tierRes.body as Record<string, unknown>).snapshot_id as string;
  const snapId = (snapRes.body as Record<string, unknown>).snapshot_id as string;
  if (tierId === snapId) pass('Snapshot consistency');
  else fail('Snapshot consistency');
}

// --- Run all
async function run(): Promise<void> {
  console.log('\n--- IRIS GOVERNANCE API VERIFICATION REPORT ---\n');
  await test1ApiKeyRequired();
  await test2TierEndpoint();
  await test3CertificateEndpoint();
  await test4SlaEndpoint();
  await test5SnapshotEndpoint();
  await test6HistoryEndpoint();
  await test7HashStability();
  await test8ReadOnlyEnforcement();
  await test10SnapshotConsistency(); // before rate limit so we're still under limit
  await test9RateLimit();

  console.log('\n--- SUMMARY ---');
  const names = [
    'API key enforcement',
    'Tier endpoint',
    'Certificate endpoint',
    'SLA endpoint',
    'Snapshot endpoint',
    'History endpoint',
    'Hash stability',
    'Read-only enforcement',
    'Snapshot consistency',
    'Rate limiting',
  ];
  for (const name of names) {
    const key = name;
    console.log(`${results[key] === 'PASS' ? '✔' : '✖'} ${name}: ${results[key] ?? 'FAIL'}`);
  }
  const allPass = names.every((n) => results[n] === 'PASS');
  console.log('\n' + (allPass ? 'IRIS Governance Public API verified successfully' : 'Verification completed with failures') + '\n');
  process.exit(allPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
