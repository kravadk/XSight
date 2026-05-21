export type CardPayload =
  | { kind: 'text'; text: string }
  | { kind: 'tokens'; symbols: string[]; intro: string }
  | {
      kind: 'swap';
      fromSymbol: string;
      toSymbol: string;
      fromAmount: number;
      toAmount: number;
    }
  | { kind: 'portfolio'; advice: string }
  | { kind: 'risk'; symbol: string }
  | { kind: 'yield'; pairs?: string[] }
  | {
      kind: 'txPending';
      fromSymbol: string;
      toSymbol: string;
      fromAmount: number;
      toAmount: number;
    }
  | {
      kind: 'txSuccess';
      fromSymbol: string;
      toSymbol: string;
      fromAmount: number;
      toAmount: number;
      hash: string;
    };

export interface ChatResponse {
  cards: CardPayload[];
}

export interface TokenBalance {
  symbol: string;
  address: string;
  amount: number;
  usdValue: number;
}

export interface PortfolioResponse {
  address: string;
  network: string;
  totalUsd: number;
  change24h: number;
  changePercent: number;
  tokens: TokenBalance[];
}

export interface TrendingToken {
  symbol: string;
  address: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
}

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  estGasOkb: string;
  routeSummary: string;
  priceImpactPct?: number;
  txData?: { to: string; data: string; value: string };
}

export interface SwapResult {
  txHash: string;
  approveTxHash?: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  status: 'submitted' | 'confirmed';
}

export interface TokenSecurity {
  tokenAddress: string;
  riskScore: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  warnings: string[];
  verdict: string;
}

export interface X402PaymentInstruction {
  scheme: 'exact';
  network: string;
  asset: string;
  assetAddress: string;
  decimals: number;
  amount: string;
  payTo: string;
  description: string;
  gasSponsored: boolean;
}

export interface X402PaymentProof {
  payTo: string;
  amount: string;
  asset: string;
  network: string;
  txHash?: string;
  payer?: string;
}

export interface X402CallLog {
  timestamp: number;
  endpoint: string;
  caller: string;
  amount: number;
  asset: string;
  status: 'paid' | 'rejected';
}

export interface EconomySnapshot {
  totalRevenueUsdt: number;
  callsToday: number;
  lpDepositedUsdt: number;
  lpCurrentUsdt: number;
  lpYieldEarnedUsdt: number;
  /** True only when at least one real on-chain deploy has been executed. */
  lpActive: boolean;
  /** Number of triggerAutoDeploy executions on-chain so far. */
  deployCount: number;
  lastDeployAt: number;
  expensesGasOkb: number;
  expensesAiUsdt: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  netProfitUsdt: number;
  autoDeployEnabled: boolean;
  threshold: number;
}
