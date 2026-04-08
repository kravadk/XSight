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
];
