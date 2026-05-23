/**
 * FanScoreRegistry on-chain sync.
 *
 * Weekly cron: read the off-chain FanScore for every known wallet (those that
 * have either touched the X Cup product or paid an x402 endpoint), and write
 * them in a single batch to the on-chain FanScoreRegistry contract. The
 * FanFeeHook reads from the registry during each swap.
 *
 * OFF by default. Enabled only when ALL of:
 *   HOOK_FAN_SCORE_REGISTRY  contract address is set
 *   HOOK_SYNC_ENABLED        = 'true'
 *   DEPLOYER_PRIVATE_KEY     (operator key) is set
 *
 * No-op otherwise so dev environments and review deploys never burn gas.
 */
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { getFanScore } from './cupReputation.js';
import { x402Log } from '../middleware/x402.js';
import { listFreePicks } from './freePickStore.js';
import { listLeagues } from './leagueStore.js';

const FIRST_TICK_DELAY_MS = 30_000;
const DEFAULT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const MAX_BATCH_SIZE = 100;

const REGISTRY_ABI = [
  'function setScores(address[] wallets, uint256[] scores) external',
  'function operator() view returns (address)',
];

let timer: NodeJS.Timeout | null = null;

interface SyncEnv {
  registryAddress: string;
  rpcUrl: string;
  privateKey: string;
}

function readEnv(): SyncEnv | null {
  const registryAddress = (process.env.HOOK_FAN_SCORE_REGISTRY ?? '').trim();
  const enabled = (process.env.HOOK_SYNC_ENABLED ?? '').toLowerCase() === 'true';
  const rpcUrl = (process.env.X_LAYER_RPC_URL ?? 'https://rpc.xlayer.tech').trim();
  const privateKey = (process.env.DEPLOYER_PRIVATE_KEY ?? '').trim();
  if (!enabled || !registryAddress || !privateKey) return null;
  return { registryAddress, rpcUrl, privateKey };
}

/** Union of all wallets the server has seen — across x402, free picks, leagues. */
function collectKnownWallets(): string[] {
  const seen = new Set<string>();
  for (const call of x402Log) {
    if (call.caller) seen.add(call.caller.toLowerCase());
  }
  for (const pick of listFreePicks()) {
    if (pick.wallet) seen.add(pick.wallet.toLowerCase());
  }
  for (const league of listLeagues()) {
    for (const member of league.members) {
      seen.add(member.toLowerCase());
    }
  }
  return Array.from(seen).slice(0, MAX_BATCH_SIZE);
}

async function tick(): Promise<void> {
  const env = readEnv();
  if (!env) return;

  const wallets = collectKnownWallets();
  if (wallets.length === 0) {
    console.log('[fanScoreSync] no known wallets yet, skipping');
    return;
  }

  const scores: number[] = [];
  for (const wallet of wallets) {
    try {
      const fs = await getFanScore(wallet);
      scores.push(fs ? fs.score : 0);
    } catch {
      scores.push(0);
    }
  }

  try {
    const provider = new JsonRpcProvider(env.rpcUrl);
    const signer = new Wallet(env.privateKey, provider);
    const registry = new Contract(env.registryAddress, REGISTRY_ABI, signer);
    const tx = await registry.setScores(wallets, scores);
    console.log(`[fanScoreSync] sent batch: ${wallets.length} wallets · tx ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[fanScoreSync] mined in block ${receipt?.blockNumber}`);
  } catch (err) {
    console.warn('[fanScoreSync] batch failed:', err instanceof Error ? err.message : err);
  }
}

export function startFanScoreSync(): void {
  if (timer) return;
  const env = readEnv();
  if (!env) {
    console.log('[fanScoreSync] disabled (HOOK_SYNC_ENABLED!=true or HOOK_FAN_SCORE_REGISTRY unset)');
    return;
  }
  const intervalMs = Number(process.env.HOOK_SYNC_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  console.log(`[fanScoreSync] enabled - syncing every ${Math.round(intervalMs / 1000 / 60)}min to ${env.registryAddress}`);
  setTimeout(() => {
    void tick();
    timer = setInterval(() => void tick(), intervalMs);
  }, FIRST_TICK_DELAY_MS);
}

/** Manual one-shot sync — exposed for the operator API + tests. */
export async function runFanScoreSyncOnce(): Promise<void> {
  await tick();
}
