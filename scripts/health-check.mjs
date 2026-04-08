#!/usr/bin/env node
/**
 * Quick smoke test before opening the browser:
 *   • Vite dev server is up on :5173
 *   • Backend is up on :8787
 *   • Vite proxy forwards /api/* correctly
 *   • Backend has all 4 OnchainOS modules configured
 *
 * Exit code 0 if everything is green, 1 otherwise.
 *
 * Usage:  node scripts/health-check.mjs
 */

const FRONTEND = process.env.XSIGHT_FRONTEND ?? 'http://localhost:5173';
const BACKEND = process.env.XSIGHT_BACKEND ?? 'http://localhost:8787';

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

let failed = 0;

async function check(label, fn) {
  process.stdout.write(`  ${label}... `);
  try {
    const result = await fn();
    console.log(c.green('✓') + (result ? c.dim(' ' + result) : ''));
  } catch (err) {
    console.log(c.red('✗ ' + (err.message ?? err)));
    failed++;
  }
}

async function fetchWithTimeout(url, opts = {}, ms = 5000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

console.log(c.bold('\nXSight health-check\n'));

console.log(c.cyan('Frontend (' + FRONTEND + ')'));
await check('GET /', async () => {
  const r = await fetchWithTimeout(FRONTEND + '/');
  if (!r.ok) throw new Error('status ' + r.status);
  const t = await r.text();
  if (!t.includes('<div id="root">')) throw new Error('not a vite html');
  return 'ok';
});
await check('proxy /api/status/health', async () => {
  const r = await fetchWithTimeout(FRONTEND + '/api/status/health');
  if (!r.ok) throw new Error('status ' + r.status);
  const j = await r.json();
  if (!j.ok) throw new Error('not ok');
  return 'ok';
});

console.log('\n' + c.cyan('Backend (' + BACKEND + ')'));
await check('GET /api/status/health', async () => {
  const r = await fetchWithTimeout(BACKEND + '/api/status/health');
  if (!r.ok) throw new Error('status ' + r.status);
  return 'ok';
});

let configured;
await check('all 4 services configured', async () => {
  const r = await fetchWithTimeout(BACKEND + '/api/status/health');
  const j = await r.json();
  configured = j.configured;
  const missing = Object.entries(j.configured)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) throw new Error('missing: ' + missing.join(', '));
  return 'anthropic + okx + x402 + signer';
});

await check('chain id 196', async () => {
  const r = await fetchWithTimeout(BACKEND + '/api/status/health');
  const j = await r.json();
  if (j.chainId !== 196) throw new Error('chainId=' + j.chainId);
  return 'X Layer Mainnet';
});

await check('agentic wallet present', async () => {
  const r = await fetchWithTimeout(BACKEND + '/api/status/health');
  const j = await r.json();
  if (!j.walletAddress) throw new Error('no wallet');
  return j.walletAddress;
});

console.log('\n' + c.cyan('OnchainOS round-trip'));

await check('wallet balance', async () => {
  const r = await fetchWithTimeout(BACKEND + '/api/status/portfolio', {}, 15000);
  if (!r.ok) throw new Error('status ' + r.status);
  const j = await r.json();
  return `${j.tokens?.length ?? 0} tokens, $${j.totalUsd?.toFixed?.(2) ?? '?'}`;
});

await check('swap quote (1 USDT → OKB)', async () => {
  const r = await fetchWithTimeout(
    BACKEND + '/api/swap/quote?from=USDT&to=OKB&amount=1000000',
    {},
    15000,
  );
  if (!r.ok) throw new Error('status ' + r.status);
  const j = await r.json();
  return `rate ${j.rate} via ${j.routeSummary}`;
});

await check('Uniswap pools', async () => {
  const r = await fetchWithTimeout(BACKEND + '/api/status/pools', {}, 15000);
  if (!r.ok) throw new Error('status ' + r.status);
  const j = await r.json();
  return `${j.pools?.length ?? 0} pools`;
});

await check('security scan OKB', async () => {
  const r = await fetchWithTimeout(BACKEND + '/api/status/security?token=OKB', {}, 15000);
  if (!r.ok) throw new Error('status ' + r.status);
  const j = await r.json();
  return `score ${j.riskScore} ${j.level}`;
});

console.log('\n' + c.cyan('x402 gating'));

await check('/api/v1/market-summary returns 402 unauthenticated', async () => {
  const r = await fetchWithTimeout(BACKEND + '/api/v1/market-summary');
  if (r.status !== 402) throw new Error('status ' + r.status);
  return '402 + payment instructions';
});

await check('/api/v1/market-summary returns 200 with dev-bypass', async () => {
  const r = await fetchWithTimeout(
    BACKEND + '/api/v1/market-summary',
    { headers: { 'X-PAYMENT': 'dev-bypass' } },
    30000,
  );
  if (!r.ok) throw new Error('status ' + r.status);
  return '200 + AI JSON';
});

console.log('\n' + '─'.repeat(50));
if (failed === 0) {
  console.log(c.bold(c.green('\n✓ All checks passed — open ' + FRONTEND + '\n')));
  process.exit(0);
} else {
  console.log(c.bold(c.red(`\n✗ ${failed} check(s) failed\n`)));
  process.exit(1);
}
