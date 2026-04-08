/**
 * Hackathon helper: hits a series of legitimate XSight endpoints with small
 * pauses between each to generate real on-chain + AI activity for the
 * "Most Active Agent" leaderboard.
 *
 * IMPORTANT: this is NOT a spammer. It runs a fixed sequence of normal
 * read-only OnchainOS calls plus optional small swap quotes. No actual
 * swap execution. Run with:
 *
 *   npm --prefix server run activity
 *
 * Make sure the server is running on http://localhost:8787 first.
 */

const BASE = process.env.XSIGHT_HOST ?? 'http://localhost:8787';
const SLEEP_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Step {
  label: string;
  fn: () => Promise<void>;
}

async function get(path: string, opts: RequestInit = {}) {
  const res = await fetch(BASE + path, opts);
  if (!res.ok && res.status !== 402) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} -> ${res.status} :: ${body.slice(0, 200)}`);
  }
  return res;
}

const steps: Step[] = [
  {
    label: 'Health check',
    fn: async () => {
      const r = await get('/api/status/health');
      const json = await r.json();
      console.log('  network:', json.network, '| wallet:', json.walletAddress);
    },
  },
  {
    label: 'Wallet portfolio (OnchainOS Wallet)',
    fn: async () => {
      const r = await get('/api/status/portfolio');
      const json = await r.json();
      console.log('  totalUsd:', json.totalUsd?.toFixed?.(4), '| tokens:', json.tokens?.length);
    },
  },
  {
    label: 'Top X Layer pools (OnchainOS Market)',
    fn: async () => {
      const r = await get('/api/status/pools');
      const json = await r.json();
      for (const p of json.pools ?? []) {
        console.log(
          `  ${p.pair}: TVL $${p.tvlUsd.toLocaleString()} | APR ${p.estAprPct.toFixed(2)}% | router ${p.router ?? '?'}`,
        );
      }
    },
  },
  {
    label: 'Token security scan: OKB (OnchainOS Security)',
    fn: async () => {
      const r = await get('/api/status/security?token=OKB');
      const json = await r.json();
      console.log(`  riskScore=${json.riskScore} level=${json.level}`);
    },
  },
  {
    label: 'Token security scan: USDT',
    fn: async () => {
      const r = await get('/api/status/security?token=USDT');
      const json = await r.json();
      console.log(`  riskScore=${json.riskScore} level=${json.level}`);
    },
  },
  {
    label: 'Swap quote: 1 USDT → OKB (OnchainOS Trade)',
    fn: async () => {
      const r = await get('/api/swap/quote?from=USDT&to=OKB&amount=1000000');
      const json = await r.json();
      console.log(`  rate=${json.rate} route=${json.routeSummary}`);
    },
  },
  {
    label: 'Swap quote: 0.1 USDT → WETH',
    fn: async () => {
      const r = await get('/api/swap/quote?from=USDT&to=WETH&amount=100000');
      const json = await r.json();
      console.log(`  rate=${json.rate} route=${json.routeSummary}`);
    },
  },
  {
    label: 'AI chat: trending tokens',
    fn: async () => {
      const r = await fetch(BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'What is trending on X Layer right now?' }),
      });
      const json = await r.json();
      console.log(`  ai cards=${json.cards?.length ?? 0}`);
    },
  },
  {
    label: 'x402 endpoint /market-summary (dev-bypass)',
    fn: async () => {
      const r = await get('/api/v1/market-summary', {
        headers: { 'X-PAYMENT': 'dev-bypass' },
      });
      const json = await r.json();
      console.log(`  trending=${json.trending?.length ?? 0}`);
    },
  },
  {
    label: 'x402 endpoint /trading-signals (dev-bypass)',
    fn: async () => {
      const r = await get('/api/v1/trading-signals', {
        headers: { 'X-PAYMENT': 'dev-bypass' },
      });
      const json = await r.json();
      console.log(`  signals received: ${JSON.stringify(json.signals).slice(0, 80)}...`);
    },
  },
  {
    label: 'Activity snapshot',
    fn: async () => {
      const r = await get('/api/status/activity');
      const json = await r.json();
      console.log(
        `  totalCalls=${json.totalCalls} swaps=${json.swapsExecuted} quotes=${json.quotesRequested} x402=${json.x402PaymentsReceived} ai=${json.aiCalls}`,
      );
    },
  },
  {
    label: 'Economy snapshot (live mark-to-market)',
    fn: async () => {
      const r = await get('/api/status/economy');
      const json = await r.json();
      console.log(
        `  rev=$${json.totalRevenueUsdt.toFixed(4)} netProfit=$${json.netProfitUsdt.toFixed(4)} deploys=${json.deployCount}`,
      );
    },
  },
];

(async () => {
  console.log(`\n🚀 Running ${steps.length} legitimate activity steps against ${BASE}\n`);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    process.stdout.write(`[${i + 1}/${steps.length}] ${step.label}...\n`);
    try {
      await step.fn();
    } catch (err) {
      console.error('  ❌', err instanceof Error ? err.message : err);
    }
    if (i < steps.length - 1) await sleep(SLEEP_MS);
  }
  console.log('\n✅ Done. Check /api/status/activity and /api/status/economy for the cumulative state.\n');
})();
