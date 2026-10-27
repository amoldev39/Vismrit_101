import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('\n==============================================================');
  console.log('🧪 Starting Terms & Deletion Authorization Test Suite');
  console.log('==============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  const userA = `user_alpha_${Date.now()}`;
  const userB = `user_beta_${Date.now()}`;

  // 1. Initial status for User A (must be false)
  await test('GET /api/consent/terms?userId=... returns termsAccepted: false and deletionAuthorized: false initially', async () => {
    const res = await fetch(`${BASE_URL}/api/consent/terms?userId=${userA}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.userId, userA);
    assert.strictEqual(body.termsAccepted, false);
    assert.strictEqual(body.deletionAuthorized, false);
  });

  // 2. Input validation
  await test('POST /api/consent/terms with non-boolean termsAccepted returns 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/consent/terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userA, termsAccepted: 'true' }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /must be a boolean/i);
  });

  // 3. User A accepts terms and authorizes deletion
  await test('POST /api/consent/terms with termsAccepted: true and deletionAuthorized: true', async () => {
    const res = await fetch(`${BASE_URL}/api/consent/terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userA,
        termsAccepted: true,
        deletionAuthorized: true,
        termsVersion: '1.0',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.userId, userA);
    assert.strictEqual(body.termsAccepted, true);
    assert.strictEqual(body.deletionAuthorized, true);
    assert.ok(body.termsAcceptedAt);
    assert.ok(body.deletionAuthorizedAt);
  });

  // 4. Persistence verification
  await test('GET /api/consent/terms confirms User A has both terms and deletion authorization persisted', async () => {
    const res = await fetch(`${BASE_URL}/api/consent/terms?userId=${userA}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.termsAccepted, true);
    assert.strictEqual(body.deletionAuthorized, true);
  });

  // 5. User-to-User Data Isolation: User B must still be false!
  await test('USER ISOLATION: User B is still false for both terms and deletion authorization', async () => {
    const res = await fetch(`${BASE_URL}/api/consent/terms?userId=${userB}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.userId, userB);
    assert.strictEqual(body.termsAccepted, false);
    assert.strictEqual(body.deletionAuthorized, false);
  });

  // 6. User A cancels / revokes
  await test('POST /api/consent/terms with termsAccepted: false revokes both terms and deletion authorization', async () => {
    const res = await fetch(`${BASE_URL}/api/consent/terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userA, termsAccepted: false, deletionAuthorized: false }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.termsAccepted, false);
    assert.strictEqual(body.deletionAuthorized, false);

    // Verify User A is now false, while User B remains false
    const checkA = await (await fetch(`${BASE_URL}/api/consent/terms?userId=${userA}`)).json();
    assert.strictEqual(checkA.termsAccepted, false);
    assert.strictEqual(checkA.deletionAuthorized, false);
  });

  // 7. Audit trail
  await test('GET /api/consent/audit returns event log with deletion authorization tracking', async () => {
    const res = await fetch(`${BASE_URL}/api/consent/audit?userId=${userA}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.auditTrail));
    assert.ok(body.auditTrail.length >= 2);
  });

  console.log('\n==============================================================');
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('==============================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
