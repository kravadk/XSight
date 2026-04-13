/**
 * In-memory portfolio snapshot history.
 * Records totalUsd whenever the portfolio endpoint fetches real data.
 * Retains up to 672 entries (7 days at 15-min minimum dedup interval).
 */

const MAX_SNAPSHOTS = 672;
const MIN_INTERVAL_MS = 10 * 60_000;

export interface PortfolioSnapshot {
  timestamp: number;
  totalUsd: number;
}

const snapshots: PortfolioSnapshot[] = [];

export function recordPortfolioSnapshot(totalUsd: number): void {
  if (totalUsd <= 0) return;
  const last = snapshots[snapshots.length - 1];
  if (last && Date.now() - last.timestamp < MIN_INTERVAL_MS) return;
  snapshots.push({ timestamp: Date.now(), totalUsd });
  if (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
}

export function getPortfolioHistory(): PortfolioSnapshot[] {
  return snapshots.slice();
}
