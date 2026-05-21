/**
 * ParimutuelMarket contract service — reads, operator writes, and unsigned calldata
 * builders for the user's wallet. Mirrors `cupOracleContract.ts`.
 *
 * NO MOCKS: every read/write hits the real deployed contract. Until
 * PARIMUTUEL_MARKET_ADDRESS is set, reads return null and the API surfaces an honest
 * `contract_not_deployed` state — there are no fake pools.
 */
import { Contract, Interface, isAddress } from 'ethers';
import { env } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';
import { getProvider, getSigner } from './wallet.js';

export const PARIMUTUEL_ABI = [
  'function token() view returns (address)',
  'function operator() view returns (address)',
  'function owner() view returns (address)',
  'function treasury() view returns (address)',
  'function feeBps() view returns (uint16)',
  'function getMarket(bytes32 marketId) view returns (bytes32 matchId, uint64 closeTime, bool exists, bool settled, bool refundMode, uint8 winningOutcome, uint256 totalPool, uint256 payoutPool, uint256 poolHome, uint256 poolDraw, uint256 poolAway)',
  'function stakeOf(bytes32 marketId, address user) view returns (uint256 home, uint256 draw, uint256 away)',
  'function claimed(bytes32 marketId, address user) view returns (bool)',
  'function createMarket(bytes32 marketId, bytes32 matchId, uint64 closeTime)',
  'function stake(bytes32 marketId, uint8 outcome, uint256 amount)',
  'function settle(bytes32 marketId)',
  'function claim(bytes32 marketId)',
  'function voidMarket(bytes32 marketId)',
  'event MarketCreated(bytes32 indexed marketId, bytes32 indexed matchId, uint64 closeTime)',
  'event Staked(bytes32 indexed marketId, address indexed user, uint8 outcome, uint256 amount)',
  'event Settled(bytes32 indexed marketId, uint8 winningOutcome, uint256 totalPool, uint256 payoutPool, bool refundMode)',
  'event MarketVoided(bytes32 indexed marketId)',
  'event Claimed(bytes32 indexed marketId, address indexed user, uint256 amount)',
] as const;

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
] as const;

export const OUTCOME_HOME = 1;
export const OUTCOME_DRAW = 2;
export const OUTCOME_AWAY = 3;

export interface OnchainMarket {
  marketId: string;
  matchId: string;
  closeTime: number;
  exists: boolean;
  settled: boolean;
  refundMode: boolean;
  winningOutcome: number;
  totalPool: string;
  payoutPool: string;
  poolHome: string;
  poolDraw: string;
  poolAway: string;
}

export interface UnsignedTx {
  to: string;
  data: string;
  value: string;
  chainId: number;
}

const parimutuelIface = new Interface(PARIMUTUEL_ABI as unknown as string[]);
const erc20Iface = new Interface(ERC20_ABI as unknown as string[]);

let cachedTokenAddress: string | null = null;

export function parimutuelMetadata() {
  const configured = env.parimutuelMarketAddress.trim();
  const deployed = isAddress(configured);
  return {
    name: 'XSight ParimutuelMarket',
    status: deployed ? 'deployed' : 'contract-ready',
    address: deployed ? configured : null,
    chainId: X_LAYER.chainId,
    network: X_LAYER.name,
    explorerUrl: deployed ? `${X_LAYER.explorer}/address/${configured}` : null,
    sourcePath: 'contracts/ParimutuelMarket.sol',
    abi: PARIMUTUEL_ABI,
  };
}

function marketContract(): Contract | null {
  const meta = parimutuelMetadata();
  if (!meta.address) return null;
  return new Contract(meta.address, PARIMUTUEL_ABI, getProvider());
}

/** The ERC20 the deployed market settles in. Reads `token()` on-chain, env as fallback. */
export async function readSettlementToken(): Promise<string | null> {
  if (cachedTokenAddress) return cachedTokenAddress;
  const contract = marketContract();
  if (!contract) {
    const fromEnv = env.parimutuelTokenAddress.trim();
    return isAddress(fromEnv) ? fromEnv : null;
  }
  try {
    cachedTokenAddress = String(await contract.token());
    return cachedTokenAddress;
  } catch {
    return null;
  }
}

export async function readMarket(marketId: string): Promise<OnchainMarket | null> {
  const contract = marketContract();
  if (!contract) return null;
  try {
    const m = await contract.getMarket(marketId);
    return {
      marketId,
      matchId: String(m.matchId),
      closeTime: Number(m.closeTime),
      exists: Boolean(m.exists),
      settled: Boolean(m.settled),
      refundMode: Boolean(m.refundMode),
      winningOutcome: Number(m.winningOutcome),
      totalPool: m.totalPool.toString(),
      payoutPool: m.payoutPool.toString(),
      poolHome: m.poolHome.toString(),
      poolDraw: m.poolDraw.toString(),
      poolAway: m.poolAway.toString(),
    };
  } catch {
    return null;
  }
}

export async function readStakeOf(
  marketId: string,
  wallet: string,
): Promise<{ home: string; draw: string; away: string } | null> {
  const contract = marketContract();
  if (!contract || !isAddress(wallet)) return null;
  try {
    const s = await contract.stakeOf(marketId, wallet);
    return { home: s.home.toString(), draw: s.draw.toString(), away: s.away.toString() };
  } catch {
    return null;
  }
}

export async function hasClaimed(marketId: string, wallet: string): Promise<boolean> {
  const contract = marketContract();
  if (!contract || !isAddress(wallet)) return false;
  try {
    return Boolean(await contract.claimed(marketId, wallet));
  } catch {
    return false;
  }
}

// ---- operator writes (signed by the server signer, gated like the cup write API) ----

async function operatorWrite(method: 'createMarket' | 'settle' | 'voidMarket', args: unknown[]) {
  if (!env.cupWriteApiEnabled) {
    throw new Error('Write API disabled — set CUP_WRITE_API_ENABLED=true for operator usage.');
  }
  const meta = parimutuelMetadata();
  if (!meta.address) throw new Error('PARIMUTUEL_MARKET_ADDRESS is not configured');
  const contract = new Contract(meta.address, PARIMUTUEL_ABI, getSigner());
  const fn = contract[method] as (...a: unknown[]) => Promise<{ hash: string; wait: () => Promise<{ hash?: string } | null> }>;
  const tx = await fn(...args);
  const receipt = await tx.wait();
  const txHash = String(receipt?.hash ?? tx.hash);
  return { ok: true, method, txHash, explorerUrl: `${X_LAYER.explorer}/tx/${txHash}` };
}

export function createMarketTx(marketId: string, matchId: string, closeTime: number) {
  return operatorWrite('createMarket', [marketId, matchId, BigInt(closeTime)]);
}

export function settleMarketTx(marketId: string) {
  return operatorWrite('settle', [marketId]);
}

export function voidMarketTx(marketId: string) {
  return operatorWrite('voidMarket', [marketId]);
}

// ---- unsigned calldata builders (the user's wallet signs these in the frontend) ----

function requireMarketAddress(): string {
  const meta = parimutuelMetadata();
  if (!meta.address) throw new Error('contract_not_deployed');
  return meta.address;
}

/** Approve the market to pull `amount` of the settlement token from the user. */
export async function buildApproveTx(amount: string): Promise<UnsignedTx> {
  const market = requireMarketAddress();
  const token = await readSettlementToken();
  if (!token) throw new Error('settlement token unknown');
  return {
    to: token,
    data: erc20Iface.encodeFunctionData('approve', [market, BigInt(amount)]),
    value: '0x0',
    chainId: X_LAYER.chainId,
  };
}

export function buildStakeTx(marketId: string, outcome: number, amount: string): UnsignedTx {
  return {
    to: requireMarketAddress(),
    data: parimutuelIface.encodeFunctionData('stake', [marketId, outcome, BigInt(amount)]),
    value: '0x0',
    chainId: X_LAYER.chainId,
  };
}

export function buildClaimTx(marketId: string): UnsignedTx {
  return {
    to: requireMarketAddress(),
    data: parimutuelIface.encodeFunctionData('claim', [marketId]),
    value: '0x0',
    chainId: X_LAYER.chainId,
  };
}

/** Current allowance the market has on the user's settlement-token balance. */
export async function readAllowance(wallet: string): Promise<string | null> {
  const meta = parimutuelMetadata();
  const token = await readSettlementToken();
  if (!meta.address || !token || !isAddress(wallet)) return null;
  try {
    const erc20 = new Contract(token, ERC20_ABI, getProvider());
    return (await erc20.allowance(wallet, meta.address)).toString();
  } catch {
    return null;
  }
}
