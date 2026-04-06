export interface Token {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  risk: number;
  color: string;
  icon: string;
  sparkline: number[];
}

export interface Holding {
  symbol: string;
  amount: number;
  value: number;
}

export interface YieldPool {
  name: string;
  platform: string;
  apr: number;
  tvl: number;
  volume24h: number;
  fee: number;
  risk: 'LOW' | 'MED' | 'HIGH';
}

export interface ApiCall {
  endpoint: string;
  caller: string;
  paid: number;
  time: string;
  status: 'ok' | 'pending';
}

export interface Endpoint {
  path: string;
  method: 'GET' | 'POST';
  price: number;
  description: string;
}

const spark = (base: number, vol: number): number[] =>
  Array.from({ length: 24 }, (_, i) => {
    const noise = Math.sin(i * 0.6) * vol + Math.cos(i * 0.3) * vol * 0.4;
    return +(base + noise).toFixed(2);
  });

export const WALLET = {
  address: '0x3f8a9B2c1D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a',
  short: '0x3f8a...7F8a',
  network: 'X Layer Mainnet',
  chainId: 196,
  total: 668.59,
  todayPnl: 23.12,
  todayPnlPct: 3.6,
  monthPnl: 142.8,
  monthPnlPct: 27.2,
};

export const TOKENS: Record<string, Token> = {
  OKB: {
    symbol: 'OKB',
    name: 'OKB',
    price: 22.41,
    change24h: 5.2,
    volume24h: 12_400_000,
    marketCap: 2_100_000_000,
    risk: 8,
    color: '#00C853',
    icon: 'O',
    sparkline: spark(22, 0.4),
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    price: 1.0,
    change24h: 0.0,
    volume24h: 45_000_000,
    marketCap: 120_000_000_000,
    risk: 2,
    color: '#26A17B',
    icon: 'T',
    sparkline: spark(1, 0.005),
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    price: 3847,
    change24h: 2.1,
    volume24h: 8_200_000,
    marketCap: 462_000_000_000,
    risk: 5,
    color: '#627EEA',
    icon: 'E',
    sparkline: spark(3840, 30),
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    price: 1.0,
    change24h: 0.01,
    volume24h: 38_000_000,
    marketCap: 52_000_000_000,
    risk: 3,
    color: '#2775CA',
    icon: 'C',
    sparkline: spark(1, 0.003),
  },
};

export const HOLDINGS: Holding[] = [
  { symbol: 'OKB', amount: 12.5, value: 280.12 },
  { symbol: 'USDT', amount: 350.0, value: 350.0 },
  { symbol: 'WETH', amount: 0.01, value: 38.47 },
];

export const POOLS: YieldPool[] = [
  {
    name: 'ETH/USDT',
    platform: 'Uniswap v3 · X Layer',
    apr: 12.4,
    tvl: 2_100_000,
    volume24h: 480_000,
    fee: 0.3,
    risk: 'LOW',
  },
  {
    name: 'OKB/USDT',
    platform: 'Uniswap v3 · X Layer',
    apr: 8.7,
    tvl: 890_000,
    volume24h: 120_000,
    fee: 0.3,
    risk: 'LOW',
  },
  {
    name: 'USDC/USDT',
    platform: 'Uniswap v3 · X Layer',
    apr: 3.2,
    tvl: 5_400_000,
    volume24h: 1_200_000,
    fee: 0.05,
    risk: 'LOW',
  },
];

export const ENDPOINTS: Endpoint[] = [
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
  },
];

export const RECENT_CALLS: ApiCall[] = [
  {
    endpoint: '/market-summary',
    caller: '0x7a3f...bot1',
    paid: 0.01,
    time: '2m ago',
    status: 'ok',
  },
  {
    endpoint: '/token-analysis',
    caller: '0xab12...agt2',
    paid: 0.05,
    time: '5m ago',
    status: 'ok',
  },
  {
    endpoint: '/trading-signals',
    caller: '0x3f8a...dev3',
    paid: 0.1,
    time: '12m ago',
    status: 'ok',
  },
  {
    endpoint: '/portfolio-advice',
    caller: '0xcd45...qtr4',
    paid: 0.05,
    time: '18m ago',
    status: 'ok',
  },
  {
    endpoint: '/market-summary',
    caller: '0xef67...agt5',
    paid: 0.01,
    time: '24m ago',
    status: 'pending',
  },
];

export const PORTFOLIO_HISTORY: { date: string; value: number }[] = [
  { date: 'Mar 07', value: 525.79 },
  { date: 'Mar 10', value: 538.12 },
  { date: 'Mar 14', value: 548.4 },
  { date: 'Mar 18', value: 562.18 },
  { date: 'Mar 22', value: 577.65 },
  { date: 'Mar 26', value: 595.32 },
  { date: 'Mar 30', value: 610.47 },
  { date: 'Apr 02', value: 628.11 },
  { date: 'Apr 04', value: 645.47 },
  { date: 'Apr 06', value: 668.59 },
];

export const REVENUE_HISTORY: { date: string; value: number }[] = [
  { date: 'Mar 31', value: 0.18 },
  { date: 'Apr 01', value: 0.22 },
  { date: 'Apr 02', value: 0.27 },
  { date: 'Apr 03', value: 0.24 },
  { date: 'Apr 04', value: 0.35 },
  { date: 'Apr 05', value: 0.29 },
  { date: 'Apr 06', value: 0.31 },
];

export const API_STATS = {
  totalEarned: 4.82,
  today: 0.31,
  todayDelta: 12,
  callsToday: 47,
  callsDelta: 8,
};

export const ECONOMY = {
  lpDeposited: 150.0,
  lpCurrent: 153.24,
  lpEarned: 3.24,
  lpChangePct: 2.16,
  apr: 12.4,
  expenses: { gas: 0.02, ai: 0.48 },
  net: 5.04,
  auto: {
    enabled: true,
    threshold: 100,
    amount: 80,
    pool: 'ETH/USDT',
  },
};

export const SUGGESTIONS = [
  "🔥 What's trending on X Layer?",
  '💼 Analyze my portfolio',
  '🛡️ Is OKB safe to buy?',
];

export const QUICK_ACTIONS = [
  { label: '🔥 Trending', message: "What's trending on X Layer?" },
  { label: '💼 Portfolio', message: 'Show my portfolio' },
  { label: '💰 Best yield', message: 'Best yield opportunities' },
  { label: '🔄 Trade', message: 'Swap 50 USDT to OKB' },
  { label: '🛡️ Scan token', message: 'Is OKB safe?' },
  { label: '⛽ Gas', message: 'Gas price on X Layer' },
];
