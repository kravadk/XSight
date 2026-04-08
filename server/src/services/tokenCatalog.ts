/**
 * X Layer token catalog — universal token resolver.
 *
 * Pulls the full OKX DEX aggregator catalog for chain 196 every 10 minutes
 * and exposes lookup by symbol or by 0x contract address. Used by:
 *   • swap.ts to resolve a user-provided symbol/address into a swap-ready
 *     pair {address, decimals}
 *   • routes/market.ts to expose a search endpoint for the token picker UI
 *   • the swap pipeline so any token in the OKX universe is swappable, not
 *     just the hardcoded seed list.
 *
 * Native OKB is injected manually because OKX represents it with the
 * 0xeee...eee sentinel which is not in the all-tokens catalog.
 */
import { getAllTokens } from './onchainos.js';

const REFRESH_MS = 10 * 60_000;
const X_LAYER_CHAIN = '196';
const NATIVE_TOKEN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export interface CatalogToken {
  address: string;       // lowercase 0x
  symbol: string;        // upper-case where possible
  name: string;
  decimals: number;
  logoUrl?: string;
  /** True if this is the chain's native gas token */
  native?: boolean;
}

const byAddress = new Map<string, CatalogToken>();
const bySymbol = new Map<string, string>(); // symbol upper -> address lower

let lastRefreshMs = 0;
let refreshHandle: NodeJS.Timeout | null = null;
let firstLoad: Promise<void> | null = null;
let inFlight = false;

function seedNative() {
  const native: CatalogToken = {
    address: NATIVE_TOKEN,
    symbol: 'OKB',
    name: 'OKB (native)',
    decimals: 18,
    native: true,
  };
  byAddress.set(native.address, native);
  bySymbol.set('OKB', native.address);
}

async function refresh(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const list = await getAllTokens(X_LAYER_CHAIN);
    for (const raw of list) {
      const addr = raw.tokenContractAddress?.toLowerCase?.();
      if (!addr || !/^0x[0-9a-f]{40}$/.test(addr)) continue;
      const symbolUpper = (raw.tokenSymbol ?? '').toUpperCase();
      const decimals = Number(raw.decimals ?? 18);
      const entry: CatalogToken = {
        address: addr,
        symbol: symbolUpper || addr.slice(0, 6),
        name: raw.tokenName ?? symbolUpper,
        decimals: Number.isFinite(decimals) ? decimals : 18,
        logoUrl: raw.tokenLogoUrl,
      };
      byAddress.set(addr, entry);
      // First-come-first-served for symbol resolution. OKX may have multiple
      // contracts under the same symbol (e.g. fake USDT scams) — we keep the
      // first one returned which is typically the canonical one. Native OKB
      // is seeded before refresh so it always wins for "OKB".
      if (entry.symbol && !bySymbol.has(entry.symbol)) {
        bySymbol.set(entry.symbol, addr);
      }
    }
    lastRefreshMs = Date.now();
    console.log(`[tokenCatalog] refreshed: ${byAddress.size} tokens (${bySymbol.size} unique symbols)`);
  } catch (err) {
    console.error('[tokenCatalog] refresh failed:', err instanceof Error ? err.message : err);
  } finally {
    inFlight = false;
  }
}

export function startTokenCatalog() {
  if (refreshHandle) return;
  seedNative();
  firstLoad = refresh();
  refreshHandle = setInterval(() => void refresh(), REFRESH_MS);
}

export function stopTokenCatalog() {
  if (refreshHandle) clearInterval(refreshHandle);
  refreshHandle = null;
}

/** Wait until the first refresh completes — used in tests */
export async function ensureCatalogReady(): Promise<void> {
  if (firstLoad) await firstLoad;
}

/**
 * Resolve a user-provided string to a catalog token.
 * Accepts:
 *   • symbol: "OKB", "USDT", "BULL"
 *   • full lowercase or mixed-case 0x contract address
 * Returns null if nothing matches.
 */
export function resolveToken(input: string): CatalogToken | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Native sentinel
  if (trimmed.toLowerCase() === NATIVE_TOKEN) {
    return byAddress.get(NATIVE_TOKEN) ?? null;
  }

  // Direct address lookup
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    const lower = trimmed.toLowerCase();
    const hit = byAddress.get(lower);
    if (hit) return hit;
    // Address not in catalog yet — return a stub so swap can still proceed
    // (router will tell us if it's not routable). Decimals defaults to 18.
    return {
      address: lower,
      symbol: lower.slice(0, 6).toUpperCase(),
      name: 'Unknown token',
      decimals: 18,
    };
  }

  // Symbol lookup
  const upper = trimmed.toUpperCase();
  const addr = bySymbol.get(upper);
  if (addr) return byAddress.get(addr) ?? null;

  return null;
}

/**
 * Search the catalog for tokens matching a query (symbol or name prefix).
 * Returns up to `limit` results sorted by symbol-prefix relevance.
 */
export function searchCatalog(query: string, limit = 30): CatalogToken[] {
  if (!query || query.length < 1) {
    // Return top tokens (popular ones first — by appearance order in OKX list)
    return Array.from(byAddress.values()).slice(0, limit);
  }
  const q = query.trim().toLowerCase();
  const symbolPrefix: CatalogToken[] = [];
  const symbolContains: CatalogToken[] = [];
  const nameContains: CatalogToken[] = [];
  const addressMatch: CatalogToken[] = [];

  for (const t of byAddress.values()) {
    const sym = t.symbol.toLowerCase();
    const name = t.name.toLowerCase();
    if (sym.startsWith(q)) symbolPrefix.push(t);
    else if (sym.includes(q)) symbolContains.push(t);
    else if (name.includes(q)) nameContains.push(t);
    else if (t.address.includes(q)) addressMatch.push(t);
    if (symbolPrefix.length >= limit) break;
  }

  return [...symbolPrefix, ...symbolContains, ...nameContains, ...addressMatch].slice(0, limit);
}

export function catalogStats() {
  return {
    running: refreshHandle !== null,
    refreshMs: REFRESH_MS,
    lastRefreshMs,
    tokenCount: byAddress.size,
    symbolCount: bySymbol.size,
  };
}

export function getAllCatalogTokens(): CatalogToken[] {
  return Array.from(byAddress.values());
}
