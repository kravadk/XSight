/**
 * Singleton activity counter for the agentic wallet.
 * Every OnchainOS call, x402 hit, and signed swap is recorded so we can
 * surface "Most Active Agent" metrics on the API tab and via REST.
 */

export interface ActivityEvent {
  timestamp: number;
  kind: ActivityKind;
  detail?: string;
}

export type ActivityKind =
  | 'wallet.balance'
  | 'market.trending'
  | 'market.priceInfo'
  | 'market.tokenPrice'
  | 'market.allTokens'
  | 'security.scan'
  | 'dex.quote'
  | 'dex.approve'
  | 'dex.swap'
  | 'x402.payment'
  | 'x402.rejected'
  | 'ai.chat'
  | 'ai.analytics'
  | 'economy.deploy';

interface CounterState {
  total: number;
  byKind: Record<string, number>;
  lastEventAt: number;
  recent: ActivityEvent[];
}

const state: CounterState = {
  total: 0,
  byKind: {},
  lastEventAt: 0,
  recent: [],
};

const RECENT_LIMIT = 100;

export function recordActivity(kind: ActivityKind, detail?: string) {
  const event: ActivityEvent = { timestamp: Date.now(), kind, detail };
  state.total += 1;
  state.byKind[kind] = (state.byKind[kind] ?? 0) + 1;
  state.lastEventAt = event.timestamp;
  state.recent.unshift(event);
  if (state.recent.length > RECENT_LIMIT) state.recent.pop();
}

export interface ActivitySnapshot {
  totalCalls: number;
  byKind: Record<string, number>;
  lastEventAt: number;
  swapsExecuted: number;
  quotesRequested: number;
  balanceChecks: number;
  marketDataCalls: number;
  securityScans: number;
  x402PaymentsReceived: number;
  x402Rejected: number;
  aiCalls: number;
  recent: ActivityEvent[];
}

export function activitySnapshot(): ActivitySnapshot {
  return {
    totalCalls: state.total,
    byKind: { ...state.byKind },
    lastEventAt: state.lastEventAt,
    swapsExecuted: state.byKind['dex.swap'] ?? 0,
    quotesRequested: state.byKind['dex.quote'] ?? 0,
    balanceChecks: state.byKind['wallet.balance'] ?? 0,
    marketDataCalls:
      (state.byKind['market.trending'] ?? 0) +
      (state.byKind['market.priceInfo'] ?? 0) +
      (state.byKind['market.tokenPrice'] ?? 0) +
      (state.byKind['market.allTokens'] ?? 0),
    securityScans: state.byKind['security.scan'] ?? 0,
    x402PaymentsReceived: state.byKind['x402.payment'] ?? 0,
    x402Rejected: state.byKind['x402.rejected'] ?? 0,
    aiCalls: (state.byKind['ai.chat'] ?? 0) + (state.byKind['ai.analytics'] ?? 0),
    recent: state.recent.slice(0, 50),
  };
}
