import { useEffect, useState } from 'react';

const CACHE_TTL_MS = 60_000;
const COINGECKO_IDS: Record<string, string> = {
  OKB: 'okb',
  USDT: 'tether',
  USDC: 'usd-coin',
  ETH: 'ethereum',
  WETH: 'weth',
  WBTC: 'wrapped-bitcoin',
  BTC: 'bitcoin',
  DAI: 'dai',
  BNB: 'binancecoin',
};
const CRYPTOCOMPARE_SYMBOLS: Record<string, string> = {
  OKB: 'OKB',
  USDT: 'USDT',
  USDC: 'USDC',
  ETH: 'ETH',
  WETH: 'ETH',
  WBTC: 'WBTC',
  BTC: 'BTC',
  DAI: 'DAI',
  BNB: 'BNB',
};

interface CacheEntry {
  ts: number;
  price: number;
  change24h: number;
}
const cache = new Map<string, CacheEntry>();

export interface TokenPriceData {
  price: number | null;
  change24h: number | null;
  loading: boolean;
  error: string | null;
}

async function fetchCoinGecko(symbol: string): Promise<{ price: number; change24h: number } | null> {
  const id = COINGECKO_IDS[symbol.toUpperCase()];
  if (!id) return null;
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const json = (await res.json()) as Record<string, { usd: number; usd_24h_change?: number }>;
  const entry = json[id];
  if (!entry || typeof entry.usd !== 'number') return null;
  return { price: entry.usd, change24h: entry.usd_24h_change ?? 0 };
}

async function fetchCryptoCompare(symbol: string): Promise<{ price: number; change24h: number } | null> {
  const sym = CRYPTOCOMPARE_SYMBOLS[symbol.toUpperCase()];
  if (!sym) return null;
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${sym}&tsyms=USD`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`cryptocompare ${res.status}`);
  const json = (await res.json()) as { RAW?: Record<string, { USD: { PRICE: number; CHANGEPCT24HOUR: number } }> };
  const raw = json.RAW?.[sym]?.USD;
  if (!raw || typeof raw.PRICE !== 'number') return null;
  return { price: raw.PRICE, change24h: raw.CHANGEPCT24HOUR ?? 0 };
}

/**
 * Live token price with multi-source fallback (CoinGecko → CryptoCompare),
 * 60s in-memory cache. Returns null while loading.
 */
export function useTokenPrice(symbol: string | undefined): TokenPriceData {
  const [data, setData] = useState<TokenPriceData>({
    price: null,
    change24h: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!symbol) return;
    const key = symbol.toUpperCase();
    const cached = cache.get(key);
    const now = Date.now();
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      setData({ price: cached.price, change24h: cached.change24h, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setData((d) => ({ ...d, loading: true, error: null }));

    const load = async () => {
      try {
        let result = await fetchCoinGecko(key).catch(() => null);
        if (!result) result = await fetchCryptoCompare(key).catch(() => null);
        if (!result) {
          if (!cancelled) setData({ price: null, change24h: null, loading: false, error: 'no source' });
          return;
        }
        cache.set(key, { ts: Date.now(), price: result.price, change24h: result.change24h });
        if (!cancelled) {
          setData({ price: result.price, change24h: result.change24h, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setData({
            price: null,
            change24h: null,
            loading: false,
            error: err instanceof Error ? err.message : 'fetch failed',
          });
        }
      }
    };

    void load();
    const id = window.setInterval(() => void load(), CACHE_TTL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [symbol]);

  return data;
}
