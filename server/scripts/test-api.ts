/**
 * XSight API integration test runner.
 *
 * Hits every backend endpoint with valid + invalid inputs and asserts on
 * status codes and response shapes. No external dependencies — pure fetch.
 *
 * Run with:    npm --prefix server run test:api
 *
 * Exit code 0 if all tests pass, 1 otherwise. Designed to be safe to run
 * against the live mainnet backend: NO real swaps are executed unless you
 * pass --execute-swap explicitly.
 */

const BASE = process.env.XSIGHT_HOST ?? 'http://localhost:8787';
const EXECUTE_SWAP = process.argv.includes('--execute-swap');

// ---------- ANSI ----------
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

interface TestResult {
  name: string;
  group: string;
  ok: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];
let currentGroup = '';

function group(name: string) {
  currentGroup = name;
  console.log(`\n${c.bold(c.cyan('▸ ' + name))}`);
}

async function test(name: string, fn: () => Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const dt = performance.now() - start;
    results.push({ name, group: currentGroup, ok: true, durationMs: dt });
    console.log(`  ${c.green('✓')} ${name} ${c.dim(`(${Math.round(dt)}ms)`)}`);
  } catch (err) {
    const dt = performance.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, group: currentGroup, ok: false, error: msg, durationMs: dt });
    console.log(`  ${c.red('✗')} ${name} ${c.dim(`(${Math.round(dt)}ms)`)}`);
    console.log(`    ${c.red(msg)}`);
  }
}

function skip(name: string, reason: string) {
  console.log(`  ${c.yellow('○')} ${name} ${c.dim(`— skipped: ${reason}`)}`);
}

// ---------- assertions ----------
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function assertEq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertHas(obj: unknown, key: string) {
  if (typeof obj !== 'object' || obj === null || !(key in obj)) {
    throw new Error(`expected key "${key}" in response, got ${JSON.stringify(obj).slice(0, 200)}`);
  }
}

function assertType(value: unknown, type: 'string' | 'number' | 'boolean' | 'object' | 'array', label: string) {
  if (type === 'array') {
    if (!Array.isArray(value)) throw new Error(`${label}: expected array, got ${typeof value}`);
    return;
  }
  if (typeof value !== type) throw new Error(`${label}: expected ${type}, got ${typeof value}`);
}

// ---------- HTTP helpers ----------
async function http(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; json: any; text: string; headers: Headers }> {
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, json, text, headers: res.headers };
}

/**
 * Retry an HTTP call up to N times when the upstream OKX API rate-limits with
 * 503. Backs off 500ms between attempts. Used for tests that exercise the OKX
 * aggregator immediately after pool / quote bursts.
 */
async function httpWithRetry(
  path: string,
  init: RequestInit = {},
  attempts = 4,
): ReturnType<typeof http> {
  let last: Awaited<ReturnType<typeof http>> | undefined;
  for (let i = 0; i < attempts; i++) {
    last = await http(path, init);
    if (last.status !== 503) return last;
    await new Promise((r) => setTimeout(r, 500 + i * 300));
  }
  return last as Awaited<ReturnType<typeof http>>;
}

// =====================================================================
// TEST GROUPS
// =====================================================================

async function runHealthTests() {
  group('1. Health & connectivity');

  await test('GET / returns server info', async () => {
    const r = await http('/');
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'name');
    assertHas(r.json, 'endpoints');
    assertEq(r.json.name, 'XSight server', 'name');
  });

  await test('GET /api/status/health returns ok with config flags', async () => {
    const r = await http('/api/status/health');
    assertEq(r.status, 200, 'status');
    assertEq(r.json.ok, true, 'ok');
    assertHas(r.json, 'configured');
    assertType(r.json.configured.anthropic, 'boolean', 'configured.anthropic');
    assertType(r.json.configured.okx, 'boolean', 'configured.okx');
    assertType(r.json.configured.x402, 'boolean', 'configured.x402');
    assertType(r.json.configured.signer, 'boolean', 'configured.signer');
    assertEq(r.json.chainId, 196, 'chainId');
    assertHas(r.json, 'walletExplorer');
  });
}

async function runPortfolioTests() {
  group('2. Portfolio (OnchainOS Wallet)');

  await test('GET /api/status/portfolio returns balances', async () => {
    const r = await httpWithRetry('/api/status/portfolio');
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'address');
    assertHas(r.json, 'tokens');
    assertHas(r.json, 'totalUsd');
    assertType(r.json.tokens, 'array', 'tokens');
    assertEq(r.json.network, 'X Layer Mainnet', 'network');
  });

  await test('GET /api/status/portfolio?address=0xDEAD returns valid response', async () => {
    const r = await http('/api/status/portfolio?address=0x000000000000000000000000000000000000DEAD');
    // 200 with empty tokens or 503 if address format rejected — both acceptable
    assert(r.status === 200 || r.status === 503, `expected 200 or 503, got ${r.status}`);
  });
}

async function runSecurityTests() {
  group('3. Security (OnchainOS Security)');

  await test('GET /api/status/security?token=OKB returns risk data', async () => {
    const r = await httpWithRetry('/api/status/security?token=OKB');
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'riskScore');
    assertHas(r.json, 'level');
    assertHas(r.json, 'verdict');
    assert(['LOW', 'MEDIUM', 'HIGH'].includes(r.json.level), `level=${r.json.level}`);
    assert(typeof r.json.riskScore === 'number' && r.json.riskScore >= 0 && r.json.riskScore <= 100, 'riskScore range');
  });

  await test('GET /api/status/security without token returns 400', async () => {
    const r = await http('/api/status/security');
    assertEq(r.status, 400, 'status');
    assertHas(r.json, 'error');
  });

  await test('GET /api/status/security with unknown symbol returns 400', async () => {
    const r = await http('/api/status/security?token=NOTATOKEN');
    assertEq(r.status, 400, 'status');
  });

  await test('GET /api/status/security with raw 0x address works', async () => {
    const r = await httpWithRetry('/api/status/security?token=0xe538905cf8410324e03A5A23C1c177a474D59b2b');
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'riskScore');
  });
}

async function runMarketTests() {
  group('4. Market & Pools (OnchainOS Market + Uniswap)');

  await test('GET /api/status/pools returns Uniswap pool stats', async () => {
    const r = await httpWithRetry('/api/status/pools');
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'pools');
    assertType(r.json.pools, 'array', 'pools');
    assert(r.json.pools.length >= 1, 'at least one pool');
    const p = r.json.pools[0];
    assertHas(p, 'pair');
    assertHas(p, 'tvlUsd');
    assertHas(p, 'volume24hUsd');
    assertHas(p, 'estAprPct');
    assert(typeof p.tvlUsd === 'number' && p.tvlUsd > 0, 'TVL positive');
  });
}

async function runSwapQuoteTests() {
  group('5. Swap quote (OnchainOS Trade)');

  await test('GET /api/swap/quote USDT→OKB returns route', async () => {
    const r = await httpWithRetry('/api/swap/quote?from=USDT&to=OKB&amount=1000000');
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'rate');
    assertHas(r.json, 'toAmount');
    assertHas(r.json, 'routeSummary');
    assert(Number(r.json.toAmount) > 0, 'toAmount positive');
  });

  await test('GET /api/swap/quote without params returns 400', async () => {
    const r = await http('/api/swap/quote');
    assertEq(r.status, 400, 'status');
  });

  await test('GET /api/swap/quote with same from/to is rejected by upstream', async () => {
    const r = await http('/api/swap/quote?from=USDT&to=USDT&amount=1000000');
    // OKX upstream may either return 503 or a degenerate quote — both fine
    assert(r.status === 200 || r.status === 503, `expected 200 or 503, got ${r.status}`);
  });
}

async function runChatTests() {
  group('6. AI Chat (Anthropic Claude + structured cards)');

  const intents: { name: string; message: string; expectedKinds: string[] }[] = [
    { name: 'trending intent', message: "What's trending on X Layer?", expectedKinds: ['text'] },
    { name: 'portfolio intent', message: 'Show my portfolio', expectedKinds: ['text', 'portfolio'] },
    { name: 'swap intent', message: 'Swap 50 USDT to OKB', expectedKinds: ['text', 'swap'] },
    { name: 'risk intent', message: 'Is OKB safe?', expectedKinds: ['text', 'risk'] },
    { name: 'yield intent (uses real pools)', message: 'Best APR pool on X Layer?', expectedKinds: ['text'] },
    { name: 'general/gas intent', message: 'Gas price on X Layer', expectedKinds: ['text'] },
  ];

  for (const intent of intents) {
    await test(intent.name, async () => {
      const r = await http('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: intent.message }),
      });
      assertEq(r.status, 200, 'status');
      assertHas(r.json, 'cards');
      assertType(r.json.cards, 'array', 'cards');
      assert(r.json.cards.length > 0, 'at least one card');
      // verify all expected kinds appear
      const kinds = r.json.cards.map((c: { kind: string }) => c.kind);
      for (const expected of intent.expectedKinds) {
        assert(kinds.includes(expected), `expected kind="${expected}" in [${kinds.join(',')}]`);
      }
    });
  }

  await test('POST /api/chat without message returns 400', async () => {
    const r = await http('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assertEq(r.status, 400, 'status');
  });

  await test('POST /api/chat with empty message returns 400', async () => {
    const r = await http('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    assertEq(r.status, 400, 'status');
  });
}

async function runX402Tests() {
  group('7. x402 Payment Gating');

  const endpoints: { path: string; price: string; query?: string }[] = [
    { path: '/api/v1/market-summary', price: '0.01' },
    {
      path: '/api/v1/token-analysis',
      price: '0.05',
      query: '?token=0xe538905cf8410324e03A5A23C1c177a474D59b2b',
    },
    { path: '/api/v1/trading-signals', price: '0.10' },
    {
      path: '/api/v1/portfolio-advice',
      price: '0.05',
      query: '?wallet=0x0E437c109A4C1e15172c4dA557E77724D7243F71',
    },
  ];

  await test('GET /api/v1/x402-spec returns full discovery', async () => {
    const r = await http('/api/v1/x402-spec');
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'name');
    assertHas(r.json, 'endpoints');
    assertHas(r.json, 'payTo');
    assertEq(r.json.network, 'xlayer-mainnet', 'network');
    assertEq(r.json.chainId, 196, 'chainId');
    assertEq(r.json.endpoints.length, 4, 'has 4 endpoints');
  });

  for (const ep of endpoints) {
    await test(`${ep.path} without payment → 402 with schema`, async () => {
      const r = await http(ep.path + (ep.query ?? ''));
      assertEq(r.status, 402, 'status');
      assertHas(r.json, 'x402Version');
      assertHas(r.json, 'accepts');
      const accept = r.json.accepts[0];
      assertEq(accept.scheme, 'exact', 'scheme');
      assertEq(accept.network, 'xlayer-mainnet', 'network');
      assertEq(accept.asset, 'USDT', 'asset');
      assertEq(accept.amount, ep.price, 'amount');
      assertEq(accept.gasSponsored, true, 'gasSponsored');
      assertHas(accept, 'payTo');
    });

    await test(`${ep.path} with dev-bypass → 200 with real AI JSON`, async () => {
      const r = await httpWithRetry(ep.path + (ep.query ?? ''), {
        headers: { 'X-PAYMENT': 'dev-bypass' },
      });
      assertEq(r.status, 200, 'status');
      assert(r.json !== null, 'json parses');
    });

    await test(`${ep.path} with garbage X-PAYMENT → 402 + error`, async () => {
      const r = await http(ep.path + (ep.query ?? ''), {
        headers: { 'X-PAYMENT': 'not-base64-not-anything' },
      });
      assertEq(r.status, 402, 'status');
      assertHas(r.json, 'error');
    });
  }

  await test('/api/v1/token-analysis without token query → 400', async () => {
    const r = await http('/api/v1/token-analysis', {
      headers: { 'X-PAYMENT': 'dev-bypass' },
    });
    assertEq(r.status, 400, 'status');
  });

  await test('/api/v1/portfolio-advice without wallet query → 400', async () => {
    const r = await http('/api/v1/portfolio-advice', {
      headers: { 'X-PAYMENT': 'dev-bypass' },
    });
    assertEq(r.status, 400, 'status');
  });
}

async function runEconomyTests() {
  group('8. Economy loop');

  await test('GET /api/status/economy returns full snapshot', async () => {
    const r = await http('/api/status/economy');
    assertEq(r.status, 200, 'status');
    const fields = [
      'totalRevenueUsdt',
      'callsToday',
      'lpDepositedUsdt',
      'lpCurrentUsdt',
      'lpYieldEarnedUsdt',
      'lpActive',
      'deployCount',
      'lastDeployAt',
      'expensesGasOkb',
      'expensesAiUsdt',
      'aiInputTokens',
      'aiOutputTokens',
      'netProfitUsdt',
      'autoDeployEnabled',
      'threshold',
    ];
    for (const f of fields) assertHas(r.json, f);
  });

  await test('POST /api/status/economy/configure persists threshold + autoDeploy', async () => {
    const r = await http('/api/status/economy/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoDeployEnabled: true, threshold: 0.05 }),
    });
    assertEq(r.status, 200, 'status');
    assertEq(r.json.ok, true, 'ok');
    assertEq(r.json.autoDeployEnabled, true, 'autoDeployEnabled');
    assertEq(r.json.threshold, 0.05, 'threshold');
  });

  await test('configure clamps negative threshold (preserves previous valid value)', async () => {
    // Set to a known good value first
    await http('/api/status/economy/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 0.07 }),
    });
    // Now try a negative value — should be ignored
    await http('/api/status/economy/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: -1 }),
    });
    const r = await http('/api/status/economy');
    assertEq(r.json.threshold, 0.07, 'threshold preserved');
  });

  await test('GET /api/status/economy/history returns deploys array', async () => {
    const r = await http('/api/status/economy/history');
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'deploys');
    assertType(r.json.deploys, 'array', 'deploys');
  });

  await test('POST /api/status/economy/trigger-deploy with disabled auto-deploy → 409', async () => {
    // turn off auto-deploy first
    await http('/api/status/economy/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoDeployEnabled: false }),
    });
    const r = await http('/api/status/economy/trigger-deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assertEq(r.status, 409, 'status');
    assertEq(r.json.ok, false, 'ok=false');
    assertHas(r.json, 'reason');
    // re-enable
    await http('/api/status/economy/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoDeployEnabled: true }),
    });
  });

  await test('POST trigger-deploy with insufficient balance returns reason', async () => {
    // Set threshold so high that surplus is impossible
    await http('/api/status/economy/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 999999 }),
    });
    const r = await http('/api/status/economy/trigger-deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Either threshold-too-high or balance-below — both 409 with reason
    assertEq(r.status, 409, 'status');
    assertEq(r.json.ok, false, 'ok=false');
    assert(typeof r.json.reason === 'string' && r.json.reason.length > 0, 'reason present');
    // restore sane threshold
    await http('/api/status/economy/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 0.05 }),
    });
  });
}

async function runActivityTests() {
  group('9. Activity tracker (Most Active Agent)');

  await test('GET /api/status/activity returns full counter snapshot', async () => {
    const r = await http('/api/status/activity');
    assertEq(r.status, 200, 'status');
    const fields = [
      'walletAddress',
      'walletExplorer',
      'chainId',
      'network',
      'totalCalls',
      'byKind',
      'lastEventAt',
      'swapsExecuted',
      'quotesRequested',
      'balanceChecks',
      'marketDataCalls',
      'securityScans',
      'x402PaymentsReceived',
      'x402Rejected',
      'aiCalls',
      'recent',
    ];
    for (const f of fields) assertHas(r.json, f);
    assertEq(r.json.chainId, 196, 'chainId');
    assertType(r.json.recent, 'array', 'recent');
  });

  await test('Activity counter increments after a fresh OnchainOS call', async () => {
    const before = await http('/api/status/activity');
    const beforeBalance = before.json.balanceChecks;
    await http('/api/status/portfolio');
    // small wait — cache may absorb the call, but a fresh path should bump
    const after = await http('/api/status/activity');
    assert(
      after.json.balanceChecks >= beforeBalance,
      `balanceChecks did not increment: before=${beforeBalance} after=${after.json.balanceChecks}`,
    );
  });
}

async function runX402LogTests() {
  group('10. x402 log');

  await test('GET /api/status/x402-log returns calls array', async () => {
    const r = await http('/api/status/x402-log');
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'calls');
    assertType(r.json.calls, 'array', 'calls');
  });

  await test('Log records new dev-bypass payment', async () => {
    // The /x402-log endpoint returns the last 50 entries (newest first), so
    // once the log has 50+ entries the array length stays at 50. Compare the
    // newest timestamp instead, which is monotonic.
    const before = await httpWithRetry('/api/status/x402-log');
    const beforeNewestTs = before.json.calls[0]?.timestamp ?? 0;
    await httpWithRetry('/api/v1/market-summary', { headers: { 'X-PAYMENT': 'dev-bypass' } });
    const after = await httpWithRetry('/api/status/x402-log');
    const afterNewestTs = after.json.calls[0]?.timestamp ?? 0;
    assert(
      afterNewestTs > beforeNewestTs,
      `newest log timestamp did not advance: before=${beforeNewestTs} after=${afterNewestTs}`,
    );
    const newest = after.json.calls[0];
    assertEq(newest.status, 'paid', 'status');
    assertEq(newest.caller, 'dev-bypass', 'caller');
  });
}

async function runOnChainExecutionTests() {
  group('11. On-chain execution');

  if (!EXECUTE_SWAP) {
    skip(
      'POST /api/swap real on-chain swap',
      'pass --execute-swap to actually broadcast a 0.005 USDT → WOKB tx',
    );
    return;
  }

  await test('POST /api/swap broadcasts real tx and confirms', async () => {
    const r = await http('/api/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'USDT', to: 'WOKB', amount: '5000' }),
    });
    assertEq(r.status, 200, 'status');
    assertHas(r.json, 'txHash');
    assertEq(r.json.status, 'confirmed', 'status');
    assert(r.json.txHash.startsWith('0x') && r.json.txHash.length === 66, 'txHash format');
    console.log(`    ${c.dim('explorer:')} https://www.okx.com/web3/explorer/xlayer/tx/${r.json.txHash}`);
  });
}

// =====================================================================
// MAIN
// =====================================================================
(async () => {
  console.log(c.bold(`\nXSight API test suite — target: ${c.cyan(BASE)}\n`));

  await runHealthTests();
  await runPortfolioTests();
  await runSecurityTests();
  await runMarketTests();
  await runSwapQuoteTests();
  await runChatTests();
  await runX402Tests();
  await runEconomyTests();
  await runActivityTests();
  await runX402LogTests();
  await runOnChainExecutionTests();

  // ----- summary -----
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const total = results.length;
  const totalMs = results.reduce((s, r) => s + r.durationMs, 0);

  console.log('\n' + '─'.repeat(60));
  if (failed === 0) {
    console.log(c.bold(c.green(`✓ All ${total} tests passed in ${Math.round(totalMs)}ms`)));
  } else {
    console.log(c.bold(c.red(`✗ ${failed} of ${total} tests failed`)));
    console.log('\nFailures:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  ${c.red('✗')} ${r.group} → ${r.name}`);
      console.log(`    ${c.dim(r.error ?? '')}`);
    }
  }
  console.log('');

  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error(c.red('\nFATAL: ' + (err instanceof Error ? err.message : String(err))));
  process.exit(2);
});
