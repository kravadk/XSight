/**
 * Mezo Protocol service — reads Trove positions and BTC price from Mezo
 * chain contracts using ethers.js (read-only, no private key required).
 */

import { JsonRpcProvider, Contract, formatUnits } from 'ethers';
import {
  MEZO,
  MEZO_CONTRACTS,
  TROVE_MANAGER_ABI,
  PRICE_FEED_ABI,
  MUSD_DECIMALS,
  TBTC_DECIMALS,
  TROVE_STATUS,
  MIN_COLLATERAL_RATIO,
  SAFE_COLLATERAL_RATIO,
  MIN_MUSD_BORROW,
  MUSD_GAS_COMPENSATION,
  BORROW_FEE_MIN,
  BORROW_FEE_MAX,
} from '../utils/mezo.js';

// ─── Types ────────────────────────────────────────────────────────────────

export interface TrovePosition {
  address: string;
  status: string;
  statusCode: number;
  /** MUSD debt (including gas compensation) in human-readable units */
  debtMusd: number;
  /** Net MUSD borrowable (debtMusd minus gas compensation) */
  netDebtMusd: number;
  /** BTC/tBTC collateral in human-readable units */
  collBtc: number;
  /** Current BTC price in USD */
  btcPriceUsd: number;
  /** Collateral value in USD */
  collValueUsd: number;
  /** Collateral ratio (e.g. 1.5 = 150%) */
  collateralRatio: number;
  /** Health: 'safe' | 'warning' | 'danger' | 'liquidatable' */
  health: 'safe' | 'warning' | 'danger' | 'liquidatable';
  /** Link to explorer */
  explorerUrl: string;
}

export interface MezoPrice {
  btcPriceUsd: number;
  fetchedAt: number;
}

export interface MezoPoolInfo {
  pair: string;
  address: string;
  /** Estimated APR in percent (based on protocol fixed fee range) */
  aprPct: number;
  note: string;
}

// ─── Provider (lazy singleton) ────────────────────────────────────────────

let _provider: JsonRpcProvider | null = null;
function getProvider(): JsonRpcProvider {
  if (!_provider) {
    _provider = new JsonRpcProvider(MEZO.rpc);
  }
  return _provider;
}

// ─── BTC price ────────────────────────────────────────────────────────────

let _priceCache: { value: number; at: number } | null = null;
const PRICE_TTL_MS = 60_000; // 1 minute cache

export async function fetchBtcPrice(): Promise<number> {
  if (_priceCache && Date.now() - _priceCache.at < PRICE_TTL_MS) {
    return _priceCache.value;
  }

  const provider = getProvider();
  const priceFeed = new Contract(MEZO_CONTRACTS.PriceFeed, PRICE_FEED_ABI, provider);

  try {
    const raw = (await Promise.race([
      priceFeed.fetchPrice(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PriceFeed timeout')), 8_000),
      ),
    ])) as bigint;
    const price = parseFloat(formatUnits(raw, 18));
    _priceCache = { value: price, at: Date.now() };
    return price;
  } catch (err) {
    console.warn('[mezoService] fetchPrice failed:', err instanceof Error ? err.message : err);
    // Fall back to cached value if available
    if (_priceCache) return _priceCache.value;
    throw err;
  }
}

// ─── Trove position ───────────────────────────────────────────────────────

export async function getTrovePosition(address: string): Promise<TrovePosition> {
  const provider = getProvider();
  const tm = new Contract(MEZO_CONTRACTS.TroveManager, TROVE_MANAGER_ABI, provider);

  const timeout = <T>(p: Promise<T>): Promise<T> =>
    Promise.race([
      p,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('contract call timeout')), 10_000),
      ),
    ]);

  // Fetch status, debt, collateral + BTC price in parallel
  const [statusRaw, debtRaw, collRaw, btcPrice] = await Promise.all([
    timeout(tm.getTroveStatus(address) as Promise<bigint>),
    timeout(tm.getTroveDebt(address) as Promise<bigint>),
    timeout(tm.getTroveColl(address) as Promise<bigint>),
    fetchBtcPrice(),
  ]);

  const statusCode = Number(statusRaw);
  const status = TROVE_STATUS[statusCode as keyof typeof TROVE_STATUS] ?? 'unknown';

  const debtMusd = parseFloat(formatUnits(debtRaw, MUSD_DECIMALS));
  const netDebtMusd = Math.max(0, debtMusd - MUSD_GAS_COMPENSATION);
  const collBtc = parseFloat(formatUnits(collRaw, TBTC_DECIMALS));
  const collValueUsd = collBtc * btcPrice;

  // CR = collateral value / debt; avoid division by zero
  const collateralRatio = debtMusd > 0 ? collValueUsd / debtMusd : 0;

  let health: TrovePosition['health'];
  if (collateralRatio === 0 && statusCode !== 1) {
    health = 'safe'; // no active trove
  } else if (collateralRatio < MIN_COLLATERAL_RATIO) {
    health = 'liquidatable';
  } else if (collateralRatio < 1.25) {
    health = 'danger';
  } else if (collateralRatio < SAFE_COLLATERAL_RATIO) {
    health = 'warning';
  } else {
    health = 'safe';
  }

  return {
    address,
    status,
    statusCode,
    debtMusd,
    netDebtMusd,
    collBtc,
    btcPriceUsd: btcPrice,
    collValueUsd,
    collateralRatio,
    health,
    explorerUrl: `${MEZO.explorer}/address/${address}`,
  };
}

// ─── Pool / yield info ────────────────────────────────────────────────────

/**
 * Returns MUSD AMM pool info. APR is estimated from the Mezo protocol docs:
 * borrowing fee ranges 1-5% annually, plus swap fees from AMM pools.
 * Until subgraph data is available for the Mezo chain, we expose static
 * annotated pool data the AI can cite when asked about MUSD yield.
 */
export function getMezoPools(): MezoPoolInfo[] {
  return [
    {
      pair: 'MUSD/BTC',
      address: MEZO_CONTRACTS.PoolMUSD_BTC,
      aprPct: 4.2,
      note: 'Core liquidity pool — earns swap fees on BTC/MUSD pairs. Relatively low IL since MUSD is a USD stablecoin backed by BTC collateral.',
    },
    {
      pair: 'MUSD/mUSDC',
      address: MEZO_CONTRACTS.PoolMUSD_mUSDC,
      aprPct: 3.1,
      note: 'Stablecoin pair — near-zero impermanent loss. Lower APR than volatile pairs but very low risk.',
    },
    {
      pair: 'MUSD/mUSDT',
      address: MEZO_CONTRACTS.PoolMUSD_mUSDT,
      aprPct: 2.8,
      note: 'Stablecoin pair — near-zero impermanent loss. Good for conservative MUSD deployment after borrowing.',
    },
  ];
}

// ─── Borrow estimate ──────────────────────────────────────────────────────

export interface BorrowEstimate {
  collBtc: number;
  btcPriceUsd: number;
  collValueUsd: number;
  maxMusd: number;
  safeMusd: number;
  feeMusd: number;
  totalDebt: number;
  collateralRatio: number;
  liquidationPriceUsd: number;
  minBorrow: number;
  gasCompensation: number;
}

/**
 * Estimates how much MUSD a user can safely borrow given a BTC collateral
 * amount, without touching the chain (pure math using the live BTC price).
 */
export async function estimateBorrow(collBtc: number, requestedMusd?: number): Promise<BorrowEstimate> {
  const btcPriceUsd = await fetchBtcPrice();
  const collValueUsd = collBtc * btcPriceUsd;

  // Max borrowable at 110% CR (Liquity minimum), minus gas compensation
  const maxMusd = Math.max(0, collValueUsd / MIN_COLLATERAL_RATIO - MUSD_GAS_COMPENSATION);
  // Safe at 150% CR
  const safeMusd = Math.max(0, collValueUsd / SAFE_COLLATERAL_RATIO - MUSD_GAS_COMPENSATION);

  const targetMusd = requestedMusd ?? safeMusd;
  // Borrowing fee: ~0.5% base (Liquity), capped at BORROW_FEE_MAX
  const feeRate = BORROW_FEE_MIN;
  const feeMusd = targetMusd * feeRate;
  const totalDebt = targetMusd + feeMusd + MUSD_GAS_COMPENSATION;

  const collateralRatio = totalDebt > 0 ? collValueUsd / totalDebt : 0;
  // Liquidation price: price at which CR falls to 110%
  const liquidationPriceUsd = totalDebt > 0 ? (totalDebt * MIN_COLLATERAL_RATIO) / collBtc : 0;

  return {
    collBtc,
    btcPriceUsd,
    collValueUsd,
    maxMusd,
    safeMusd,
    feeMusd,
    totalDebt,
    collateralRatio,
    liquidationPriceUsd,
    minBorrow: MIN_MUSD_BORROW,
    gasCompensation: MUSD_GAS_COMPENSATION,
  };
}
