/**
 * Blockaid fraud-detection service
 * Docs: https://docs.blockaid.io
 * GitHub: https://github.com/blockaid-official/blockaid-client-node
 *
 * Calls go to /api/proxy/blockaid which the Express backend proxies to
 * api.blockaid.io using the server-side BLOCKAID_API_KEY env var.
 * The secret key never touches the browser.
 *
 * Works identically in dev (Vite proxies /api → localhost:8787)
 * and in production (Vercel rewrites /api → Railway).
 */

const BASE = '/api/proxy/blockaid';

// ── types ─────────────────────────────────────────────────────────────────

export type BlockaidStatus = 'benign' | 'warning' | 'malicious' | 'unknown';

export interface BlockaidTokenResult {
  status: BlockaidStatus;
  malicious_score?: number;
  attack_types?: string[];
  description?: string;
}

export interface BlockaidSwapSecurity {
  overall: BlockaidStatus;
  fromToken: BlockaidTokenResult;
  toToken: BlockaidTokenResult;
}

// ── helpers ───────────────────────────────────────────────────────────────

function worst(a: BlockaidStatus, b: BlockaidStatus): BlockaidStatus {
  const rank: Record<BlockaidStatus, number> = {
    unknown: 0, benign: 1, warning: 2, malicious: 3,
  };
  return rank[a] >= rank[b] ? a : b;
}

interface RawTokenScan {
  result_type?: 'Benign' | 'Warning' | 'Malicious';
  malicious_score?: number;
  attack_types?: Record<string, unknown>;
  description?: string;
}

function mapResult(raw: RawTokenScan): BlockaidTokenResult {
  const statusMap: Record<string, BlockaidStatus> = {
    Benign: 'benign', Warning: 'warning', Malicious: 'malicious',
  };
  return {
    status: raw.result_type ? (statusMap[raw.result_type] ?? 'unknown') : 'unknown',
    malicious_score: raw.malicious_score,
    attack_types: raw.attack_types ? Object.keys(raw.attack_types) : undefined,
    description: raw.description,
  };
}

// ── public API ────────────────────────────────────────────────────────────

/**
 * Scan a token contract address via the backend Blockaid proxy.
 * Throws on HTTP error or if the server has no BLOCKAID_API_KEY configured.
 */
export async function scanToken(address: string, chain = 'xlayer'): Promise<BlockaidTokenResult> {
  const res = await fetch(`${BASE}/v0/evm/token/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, chain }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Blockaid HTTP ${res.status}`);
  }

  return mapResult((await res.json()) as RawTokenScan);
}

/**
 * Run a Blockaid security check for both sides of a pending swap.
 * Throws on any error — the UI must handle failures explicitly.
 */
export async function checkSwapSecurity(
  fromAddress: string,
  toAddress: string,
  chain = 'xlayer',
): Promise<BlockaidSwapSecurity> {
  const [fromToken, toToken] = await Promise.all([
    scanToken(fromAddress, chain),
    scanToken(toAddress, chain),
  ]);
  return { overall: worst(fromToken.status, toToken.status), fromToken, toToken };
}

// ── UI helpers ────────────────────────────────────────────────────────────

export function blockaidLabel(status: BlockaidStatus): string {
  const labels: Record<BlockaidStatus, string> = {
    benign:    'Verified safe',
    warning:   'Low risk detected',
    malicious: 'Malicious token detected',
    unknown:   'Not verified',
  };
  return labels[status];
}

export function blockaidColor(status: BlockaidStatus): string {
  const colors: Record<BlockaidStatus, string> = {
    benign:    '#22C55E',
    warning:   '#F59E0B',
    malicious: '#EF4444',
    unknown:   '#6B7280',
  };
  return colors[status];
}
