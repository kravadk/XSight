export interface X402Endpoint {
  path: string;
  method: 'GET' | 'POST';
  price: number;
  description: string;
  /** Optional sample query string used by the "Try it" button on the API tab. */
  sampleQuery?: string;
}

const SAMPLE_TOKEN = '0xe538905cf8410324e03A5A23C1c177a474D59b2b'; // OKB
const SAMPLE_WALLET = '0x0E437c109A4C1e15172c4dA557E77724D7243F71';
const SAMPLE_MATCH = '<live-match-id>';

export const X402_ENDPOINTS: X402Endpoint[] = [
  {
    path: '/market-summary',
    method: 'GET',
    price: 0.01,
    description: 'AI-generated market overview for X Layer tokens.',
  },
  {
    path: '/token-analysis',
    method: 'GET',
    price: 0.05,
    description: 'Deep token analysis with on-chain metrics and sentiment.',
    sampleQuery: `?token=${SAMPLE_TOKEN}`,
  },
  {
    path: '/trading-signals',
    method: 'GET',
    price: 0.1,
    description: 'Real-time buy/sell signals for top X Layer tokens.',
  },
  {
    path: '/portfolio-advice',
    method: 'GET',
    price: 0.05,
    description: 'Personalized rebalancing advice for a wallet address.',
    sampleQuery: `?wallet=${SAMPLE_WALLET}`,
  },
  {
    path: '/cup/fixtures',
    method: 'GET',
    price: 0.01,
    description: 'CupHub live fixture feed with real source receipts for World Cup app builders.',
  },
  {
    path: '/cup/ai-edge',
    method: 'GET',
    price: 0.03,
    description: 'Fair probabilities, confidence, settlement risk, and source hash for a match.',
    sampleQuery: `?matchId=${SAMPLE_MATCH}`,
  },
  {
    path: '/cup/fair-odds',
    method: 'GET',
    price: 0.03,
    description: 'Decimal 1X2 fair odds derived from the XSight fair probability engine.',
    sampleQuery: `?matchId=${SAMPLE_MATCH}`,
  },
  {
    path: '/cup/settlement-check',
    method: 'GET',
    price: 0.02,
    description: 'Machine-readable quorum, challenge, proposal, and finalization readiness.',
    sampleQuery: `?matchId=${SAMPLE_MATCH}`,
  },
  {
    path: `/cup/result/${SAMPLE_MATCH}`,
    method: 'GET',
    price: 0.02,
    description: 'Canonical result and optimistic settlement state for a CupHub match.',
  },
  {
    path: '/cup/player-stats',
    method: 'GET',
    price: 0.02,
    description: 'Player impact stats when a live provider supplies them; empty rather than fabricated.',
    sampleQuery: `?matchId=${SAMPLE_MATCH}`,
  },
  {
    path: '/cup/sentiment',
    method: 'GET',
    price: 0.02,
    description: 'Non-canonical fan/social sentiment signal for a CupHub match.',
    sampleQuery: `?matchId=${SAMPLE_MATCH}`,
  },
  {
    path: '/cup/team-strength',
    method: 'GET',
    price: 0.02,
    description: 'Team strength and form signal for fair-pricing engines.',
    sampleQuery: `?matchId=${SAMPLE_MATCH}`,
  },
  {
    path: '/cup/fan-score',
    method: 'GET',
    price: 0.01,
    description: 'FanPass wallet reputation score for reward gating and anti-Sybil checks.',
    sampleQuery: `?wallet=${SAMPLE_WALLET}`,
  },
  {
    path: '/cup/action-plan',
    method: 'POST',
    price: 0.05,
    description: 'Reference builder/agent/fan action plan using CupHub edge, settlement, and FanPass guardrails.',
  },
];
