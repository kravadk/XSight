# Pundit Executor + Completion Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the XSight AI pundit ("Hermes") actually *act* — turn a `PunditPick` into a real on-chain `stake` from the pundit's own wallet, and gate every "success" claim behind a completion guard that verifies the `Staked` event landed.

**Architecture:** The pundit's *thinking* (`punditService.ts`, already built) and its *acting* stay deliberately separate. A new `punditExecutor.ts` reads a pick, stakes on the deployed `ParimutuelMarket` from a dedicated pundit wallet (separate key from the operator signer, per DESIGN §8), waits for the receipt, then runs `punditCompletionGuard.ts`. A signed tx that merely mined is **not** proof — only a receipt containing a matching `Staked` event yields `verified: true`. Executions are appended to a capped JSON log that a future X-poster reads.

**Tech Stack:** TypeScript (NodeNext ESM), ethers v6, Express. Tests are standalone `tsx` scripts using `node:assert/strict` — the repo's existing idiom (`server/scripts/test-*.ts`), no test framework.

**Out of scope (separate follow-on plans):** posting to X/Twitter; a cron that auto-runs the executor. This plan delivers the executor + guard + a manual operator trigger (route + npm script). The guard's `verified` flag is the contract a future X-poster consumes.

---

## File Structure

**Create:**
- `server/src/services/punditCompletionGuard.ts` — pure logic: verify a stake receipt against an intent; decide whether a success claim is allowed.
- `server/src/services/punditExecutor.ts` — orchestration: pick → on-chain stake → guard → log. Owns the `PunditExecution` type.
- `server/src/services/punditExecutionLog.ts` — capped append-only JSON log of executions (mirrors `cupSettlementLog.ts`).
- `server/scripts/test-pundit-guard.ts` — TDD unit test for the guard (pure, offline).
- `server/scripts/test-pundit-executor.ts` — dry-run honest-state test for the executor (offline).

**Modify:**
- `server/src/config/env.ts` — add `PUNDIT_PRIVATE_KEY`, `PUNDIT_WALLET_ADDRESS`, `PUNDIT_STAKE_AMOUNT`; add `isConfigured.pundit`.
- `server/src/services/wallet.ts` — add `getPunditSigner()`.
- `server/src/services/parimutuelContract.ts` — export `ERC20_ABI` (executor needs it).
- `server/src/services/activityTracker.ts` — add `'cup.punditStake'` activity kind.
- `server/src/routes/cup.ts` — add `POST /pundit/execute` (operator-gated) + `GET /pundit/executions`.
- `server/src/index.ts` — document the two new endpoints.
- `server/package.json` — add `test:pundit-guard` + `test:pundit-exec` scripts.
- `server/.env.example` — document the three new env vars.

---

## Task 1: Config & wallet plumbing

**Files:**
- Modify: `server/src/config/env.ts`
- Modify: `server/src/services/wallet.ts`
- Modify: `server/src/services/parimutuelContract.ts:35`
- Modify: `server/src/services/activityTracker.ts`
- Modify: `server/package.json`
- Modify: `server/.env.example`

- [ ] **Step 1: Add pundit env vars to `env.ts`**

In `server/src/config/env.ts`, insert immediately after the line `  parimutuelDeployBlock: Number(process.env.PARIMUTUEL_DEPLOY_BLOCK ?? 0),`:

```ts
  // AI pundit wallet (DESIGN §2.1 Flow D, §8) — its OWN key, separate from the
  // operator signer above, so the operator that creates and settles markets never
  // also stakes in them. Empty key => the executor honestly reports
  // `pundit_wallet_not_configured` and stakes nothing.
  punditPrivateKey: required('PUNDIT_PRIVATE_KEY'),
  punditWalletAddress: required('PUNDIT_WALLET_ADDRESS'),
  // Stake size per pundit pick, in human token units of the settlement token.
  punditStakeAmount: process.env.PUNDIT_STAKE_AMOUNT ?? '0.5',
```

- [ ] **Step 2: Add `isConfigured.pundit` to `env.ts`**

In `server/src/config/env.ts`, replace:

```ts
  signer: () => env.deployerPrivateKey.length > 0 && env.agenticWalletAddress.length > 0,
};
```

with:

```ts
  signer: () => env.deployerPrivateKey.length > 0 && env.agenticWalletAddress.length > 0,
  pundit: () => env.punditPrivateKey.length > 0 && env.punditWalletAddress.length > 0,
};
```

- [ ] **Step 3: Add `getPunditSigner()` to `wallet.ts`**

In `server/src/services/wallet.ts`, append after the closing brace of `getSigner()` (end of file):

```ts

let cachedPunditSigner: Wallet | null = null;

/**
 * The AI pundit's own wallet — separate from the operator signer. The pundit is a
 * real market participant (DESIGN §8), so it must stake from its own key, never the
 * operator key that creates and settles markets. Throws if PUNDIT_PRIVATE_KEY and
 * PUNDIT_WALLET_ADDRESS are unset or do not match.
 */
export function getPunditSigner(): Wallet {
  if (!isConfigured.pundit()) {
    throw new WalletError(
      'Pundit wallet not configured: PUNDIT_PRIVATE_KEY and PUNDIT_WALLET_ADDRESS required',
    );
  }
  if (!cachedPunditSigner) {
    let signer: Wallet;
    try {
      signer = new Wallet(env.punditPrivateKey, getProvider());
    } catch (err) {
      throw new WalletError(
        `Invalid PUNDIT_PRIVATE_KEY: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
    const derived = getAddress(signer.address);
    const expected = getAddress(env.punditWalletAddress);
    if (derived !== expected) {
      throw new WalletError(
        `PUNDIT_PRIVATE_KEY derives ${derived} but PUNDIT_WALLET_ADDRESS is ${expected}. They must match.`,
      );
    }
    cachedPunditSigner = signer;
  }
  return cachedPunditSigner;
}
```

- [ ] **Step 4: Export `ERC20_ABI` from `parimutuelContract.ts`**

In `server/src/services/parimutuelContract.ts`, replace line 35:

```ts
const ERC20_ABI = [
```

with:

```ts
export const ERC20_ABI = [
```

- [ ] **Step 5: Add the `cup.punditStake` activity kind**

In `server/src/services/activityTracker.ts`, replace:

```ts
  | 'cup.fanScore';
```

with:

```ts
  | 'cup.fanScore'
  | 'cup.punditStake';
```

- [ ] **Step 6: Add npm test scripts to `server/package.json`**

In `server/package.json`, replace the line:

```json
    "test:pundit": "tsx scripts/test-pundit.ts",
```

with:

```json
    "test:pundit": "tsx scripts/test-pundit.ts",
    "test:pundit-guard": "tsx scripts/test-pundit-guard.ts",
    "test:pundit-exec": "tsx scripts/test-pundit-executor.ts",
```

- [ ] **Step 7: Document the env vars in `server/.env.example`**

Append to the end of `server/.env.example`:

```
# --- AI pundit wallet (Flow D) -------------------------------------------------
# The pundit's OWN wallet, separate from DEPLOYER_PRIVATE_KEY / AGENTIC_WALLET_ADDRESS
# so the operator that creates/settles markets never also stakes in them.
PUNDIT_PRIVATE_KEY=
PUNDIT_WALLET_ADDRESS=
# Stake per pick, in human units of the market settlement token (e.g. USDT).
PUNDIT_STAKE_AMOUNT=0.5
```

- [ ] **Step 8: Typecheck**

Run: `npm --prefix server run typecheck`
Expected: PASS — no errors.

- [ ] **Step 9: Commit**

```bash
git add server/src/config/env.ts server/src/services/wallet.ts server/src/services/parimutuelContract.ts server/src/services/activityTracker.ts server/package.json server/.env.example
git commit -m "feat(pundit): config + wallet plumbing for the pundit executor"
```

---

## Task 2: Completion guard

**Files:**
- Create: `server/src/services/punditCompletionGuard.ts`
- Test: `server/scripts/test-pundit-guard.ts`

- [ ] **Step 1: Write the failing test**

Create `server/scripts/test-pundit-guard.ts`:

```ts
/**
 * TDD unit test for the pundit completion guard. Pure logic, fully offline:
 * builds synthetic ParimutuelMarket receipts and asserts the guard's verdict.
 *
 * Run: npm --prefix server run test:pundit-guard
 */
import assert from 'node:assert/strict';
import { Interface } from 'ethers';
import { PARIMUTUEL_ABI } from '../src/services/parimutuelContract.js';
import { verifyStakeReceipt, claimAllowed, type StakeIntent } from '../src/services/punditCompletionGuard.js';

const iface = new Interface(PARIMUTUEL_ABI as unknown as string[]);
const stakedEvent = iface.getEvent('Staked')!;

const MARKET = '0x' + '11'.repeat(32);
const STAKER = '0x000000000000000000000000000000000000bEEF';
const OTHER = '0x000000000000000000000000000000000000dEaD';

function stakedLog(marketId: string, user: string, outcome: number, amount: bigint) {
  const { data, topics } = iface.encodeEventLog(stakedEvent, [marketId, user, outcome, amount]);
  return { topics, data };
}

const intent: StakeIntent = { marketId: MARKET, staker: STAKER, outcome: 1, amount: '500000' };

// 1. happy path — a matching Staked event verifies
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [stakedLog(MARKET, STAKER, 1, 500000n)] });
  assert.equal(r.verified, true, 'matching Staked event verifies');
  assert.equal(r.reason, 'staked_event_confirmed');
}

// 2. tx mined but NO Staked event => not verified
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [] });
  assert.equal(r.verified, false, 'no event => not verified');
  assert.equal(r.reason, 'no_staked_event');
}

// 3. reverted tx => not verified even if a log is present
{
  const r = verifyStakeReceipt(intent, { status: 0, logs: [stakedLog(MARKET, STAKER, 1, 500000n)] });
  assert.equal(r.verified, false, 'reverted tx => not verified');
  assert.equal(r.reason, 'tx_reverted');
}

// 4. wrong outcome => not verified
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [stakedLog(MARKET, STAKER, 3, 500000n)] });
  assert.equal(r.verified, false, 'wrong outcome => not verified');
  assert.equal(r.reason, 'outcome_mismatch');
}

// 5. wrong amount => not verified
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [stakedLog(MARKET, STAKER, 1, 999n)] });
  assert.equal(r.verified, false, 'wrong amount => not verified');
  assert.equal(r.reason, 'amount_mismatch');
}

// 6. a Staked event for a different staker is ignored
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [stakedLog(MARKET, OTHER, 1, 500000n)] });
  assert.equal(r.verified, false, 'other staker ignored => not verified');
  assert.equal(r.reason, 'no_staked_event');
}

// 7. a foreign (non-Parimutuel) log does not crash the guard
{
  const foreign = { topics: ['0x' + 'ab'.repeat(32)], data: '0x' };
  const r = verifyStakeReceipt(intent, { status: 1, logs: [foreign, stakedLog(MARKET, STAKER, 1, 500000n)] });
  assert.equal(r.verified, true, 'foreign log skipped, real event still found');
}

// 8. no receipt at all => not verified
{
  const r = verifyStakeReceipt(intent, null);
  assert.equal(r.verified, false, 'null receipt => not verified');
  assert.equal(r.reason, 'no_receipt');
}

// 9. claimAllowed gate — only executed + verified + txHash may be claimed a success
assert.equal(claimAllowed({ executed: true, verified: true, txHash: '0xabc' }), true);
assert.equal(claimAllowed({ executed: true, verified: false, txHash: '0xabc' }), false, 'unverified blocks claim');
assert.equal(claimAllowed({ executed: true, verified: true, txHash: null }), false, 'no txHash blocks claim');
assert.equal(claimAllowed({ executed: false, verified: false, txHash: null }), false, 'not executed blocks claim');

console.log('pundit completion guard checks passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server run test:pundit-guard`
Expected: FAIL — `Cannot find module '../src/services/punditCompletionGuard.js'`.

- [ ] **Step 3: Write the guard implementation**

Create `server/src/services/punditCompletionGuard.ts`:

```ts
/**
 * Pundit completion guard.
 *
 * A signed transaction that mined with status 1 is NOT proof the intended action
 * happened — the calldata could have been wrong, or a different event fired. Before
 * the pundit (or anything reading its log) may state "Hermes staked on X", the guard
 * must find a `Staked` event in the receipt that matches the intent exactly. This is
 * the line between "the agent decided" and "the action is verified".
 */
import { Interface } from 'ethers';
import { PARIMUTUEL_ABI } from './parimutuelContract.js';

export interface StakeIntent {
  marketId: string; // bytes32
  staker: string;   // pundit wallet address
  outcome: number;  // 1 = HOME, 2 = DRAW, 3 = AWAY
  amount: string;   // stake amount in token base units (wei string)
}

export interface ReceiptLike {
  status?: number | null;
  logs?: ReadonlyArray<{ topics: ReadonlyArray<string>; data: string }>;
}

export interface GuardResult {
  verified: boolean;
  reason: string;
}

const iface = new Interface(PARIMUTUEL_ABI as unknown as string[]);

/**
 * Verify a stake receipt against the intent. Returns `verified: true` only when a
 * `Staked` event with matching market, staker, outcome and amount is present.
 */
export function verifyStakeReceipt(intent: StakeIntent, receipt: ReceiptLike | null): GuardResult {
  if (!receipt) return { verified: false, reason: 'no_receipt' };
  if (receipt.status !== 1) return { verified: false, reason: 'tx_reverted' };

  for (const log of receipt.logs ?? []) {
    let parsed;
    try {
      parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    } catch {
      continue; // foreign log (e.g. an ERC20 Transfer) — not from ParimutuelMarket
    }
    if (!parsed || parsed.name !== 'Staked') continue;

    if (String(parsed.args.marketId).toLowerCase() !== intent.marketId.toLowerCase()) continue;
    if (String(parsed.args.user).toLowerCase() !== intent.staker.toLowerCase()) continue;
    if (Number(parsed.args.outcome) !== intent.outcome) {
      return { verified: false, reason: 'outcome_mismatch' };
    }
    if (parsed.args.amount.toString() !== intent.amount) {
      return { verified: false, reason: 'amount_mismatch' };
    }
    return { verified: true, reason: 'staked_event_confirmed' };
  }
  return { verified: false, reason: 'no_staked_event' };
}

/**
 * Whether a public success statement (X post, API `staked` status) is allowed for an
 * execution. The guard's verdict — not the bare tx hash — is the gate.
 */
export function claimAllowed(execution: {
  executed: boolean;
  verified: boolean;
  txHash: string | null;
}): boolean {
  return execution.executed && execution.verified && Boolean(execution.txHash);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix server run test:pundit-guard`
Expected: PASS — prints `pundit completion guard checks passed`.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/punditCompletionGuard.ts server/scripts/test-pundit-guard.ts
git commit -m "feat(pundit): completion guard verifies Staked event before any success claim"
```

---

## Task 3: Executor + execution log

**Files:**
- Create: `server/src/services/punditExecutor.ts`
- Create: `server/src/services/punditExecutionLog.ts`
- Test: `server/scripts/test-pundit-executor.ts`

- [ ] **Step 1: Write the failing test**

Create `server/scripts/test-pundit-executor.ts`:

```ts
/**
 * Dry-run honest-state test for the pundit executor. Forces the contract-not-deployed
 * branch (regardless of the local .env) and asserts the executor stakes nothing and
 * reports an honest, non-success status — NO MOCKS.
 *
 * Run: npm --prefix server run test:pundit-exec
 */
import assert from 'node:assert/strict';

// Blank the market address BEFORE importing config/env.js so the executor takes the
// honest `contract_not_deployed` path. dotenv never overrides an already-set key.
process.env.PARIMUTUEL_MARKET_ADDRESS = '';

const { executePunditPick } = await import('../src/services/punditExecutor.js');
const { claimAllowed } = await import('../src/services/punditCompletionGuard.js');

const exec = await executePunditPick('cup-bra-cro-demo');

assert.equal(exec.status, 'contract_not_deployed', 'no market address => honest not-deployed status');
assert.equal(exec.txHash, null, 'no tx attempted');
assert.equal(exec.verified, false, 'nothing to verify');
assert.equal(exec.amount, '0', 'nothing staked');
assert.equal(
  claimAllowed({ executed: false, verified: exec.verified, txHash: exec.txHash }),
  false,
  'a non-executed result can never be reported as a success',
);

console.log('pundit executor honest-state checks passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server run test:pundit-exec`
Expected: FAIL — `Cannot find module '../src/services/punditExecutor.js'`.

- [ ] **Step 3: Write the execution log**

Create `server/src/services/punditExecutionLog.ts`:

```ts
/**
 * Append-only, capped JSON log of pundit on-chain stake executions. Mirrors
 * `cupSettlementLog.ts`. This is the record the AI Pundit tab renders and a future
 * X-poster reads — every entry carries the completion-guard verdict (`verified`).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { PunditExecution } from './punditExecutor.js';

const MAX_LOG_ENTRIES = 50;
const LOG_PATH = resolve(
  process.cwd(),
  process.env.PUNDIT_EXECUTION_LOG_PATH ?? '../data/pundit-execution-log.json',
);

let loaded = false;
let log: PunditExecution[] = [];

export function recordPunditExecution(entry: PunditExecution): PunditExecution {
  loadLog();
  log.unshift(entry);
  if (log.length > MAX_LOG_ENTRIES) log.length = MAX_LOG_ENTRIES;
  saveLog();
  return entry;
}

export function listPunditExecutions(matchId?: string): PunditExecution[] {
  loadLog();
  const entries = matchId ? log.filter((e) => e.matchId === matchId) : log;
  return entries.map((e) => ({ ...e }));
}

export function clearPunditExecutionLog() {
  loadLog();
  log.length = 0;
  saveLog();
}

function loadLog() {
  if (loaded) return;
  loaded = true;
  if (!existsSync(LOG_PATH)) {
    log = [];
    return;
  }
  try {
    const parsed = JSON.parse(readFileSync(LOG_PATH, 'utf8')) as { executions?: PunditExecution[] };
    log = Array.isArray(parsed.executions) ? parsed.executions.slice(0, MAX_LOG_ENTRIES) : [];
  } catch {
    log = [];
  }
}

function saveLog() {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  const tmpPath = `${LOG_PATH}.tmp`;
  writeFileSync(tmpPath, JSON.stringify({ executions: log }, null, 2));
  renameSync(tmpPath, LOG_PATH);
}
```

- [ ] **Step 4: Write the executor**

Create `server/src/services/punditExecutor.ts`:

```ts
/**
 * Pundit executor (DESIGN §2.1 Flow D).
 *
 * Turns a `PunditPick` into a REAL on-chain stake from the pundit's own wallet, then
 * runs the completion guard on the receipt. The pundit "thinking" (punditService) and
 * the pundit "acting" are deliberately separate: only a guard-verified execution
 * (`status: 'staked'`) may ever be reported as a success.
 *
 * NO MOCKS: without PARIMUTUEL_MARKET_ADDRESS or the pundit wallet it returns an
 * honest non-executed status and stakes nothing.
 */
import { Contract, formatUnits, isAddress, parseUnits } from 'ethers';
import { env } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';
import { deriveMarketId } from '../utils/cupIds.js';
import { getPunditSigner } from './wallet.js';
import {
  ERC20_ABI,
  PARIMUTUEL_ABI,
  parimutuelMetadata,
  readMarket,
  readSettlementToken,
  readStakeOf,
} from './parimutuelContract.js';
import { getPunditPick, type PunditOutcome } from './punditService.js';
import { verifyStakeReceipt, type StakeIntent } from './punditCompletionGuard.js';
import { recordPunditExecution } from './punditExecutionLog.js';
import { recordActivity } from './activityTracker.js';

export type PunditExecutionStatus =
  | 'contract_not_deployed'
  | 'pundit_wallet_not_configured'
  | 'no_pick'
  | 'passed'
  | 'market_not_open'
  | 'already_staked'
  | 'insufficient_balance'
  | 'staked'
  | 'stake_unverified';

export interface PunditExecution {
  matchId: string;
  marketId: string;
  label: string;
  status: PunditExecutionStatus;
  pick: PunditOutcome;
  conviction: number;
  outcome: number | null; // 1 | 2 | 3, null for PASS
  amount: string;         // base units actually staked ('0' when no tx was sent)
  amountDisplay: string;  // human-readable, e.g. '0.5 USDT'
  txHash: string | null;
  explorerUrl: string | null;
  verified: boolean;      // completion-guard verdict
  reason: string;
  executedAt: string;     // ISO timestamp
}

const OUTCOME_BY_PICK: Record<Exclude<PunditOutcome, 'PASS'>, number> = {
  HOME: 1,
  DRAW: 2,
  AWAY: 3,
};

function result(partial: Omit<PunditExecution, 'executedAt'>): PunditExecution {
  return { ...partial, executedAt: new Date().toISOString() };
}

/**
 * Execute the pundit's pick for one fixture as a verified on-chain stake.
 * Every call returns a `PunditExecution`; only `status: 'staked'` is a success.
 */
export async function executePunditPick(matchId: string): Promise<PunditExecution> {
  const marketId = deriveMarketId(matchId);
  const base = {
    matchId,
    marketId,
    label: matchId,
    pick: 'PASS' as PunditOutcome,
    conviction: 0,
    outcome: null as number | null,
    amount: '0',
    amountDisplay: '0',
    txHash: null as string | null,
    explorerUrl: null as string | null,
    verified: false,
  };

  if (!parimutuelMetadata().address) {
    return result({ ...base, status: 'contract_not_deployed', reason: 'PARIMUTUEL_MARKET_ADDRESS not set' });
  }
  if (!env.punditPrivateKey || !env.punditWalletAddress) {
    return result({
      ...base,
      status: 'pundit_wallet_not_configured',
      reason: 'PUNDIT_PRIVATE_KEY / PUNDIT_WALLET_ADDRESS not set',
    });
  }

  const pick = await getPunditPick(matchId);
  if (!pick) {
    return result({ ...base, status: 'no_pick', reason: 'no fixture / pick for this matchId' });
  }
  const enriched = { ...base, label: pick.label, pick: pick.pick, conviction: pick.conviction };

  if (pick.pick === 'PASS') {
    return result({ ...enriched, status: 'passed', reason: 'pundit issued PASS — no stake' });
  }
  const outcome = OUTCOME_BY_PICK[pick.pick];

  const market = await readMarket(marketId);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!market || !market.exists) {
    return result({ ...enriched, outcome, status: 'market_not_open', reason: 'market_not_created' });
  }
  if (market.settled) {
    return result({ ...enriched, outcome, status: 'market_not_open', reason: 'market_settled' });
  }
  if (market.closeTime <= nowSec) {
    return result({ ...enriched, outcome, status: 'market_not_open', reason: 'market_closed' });
  }

  const signer = getPunditSigner();
  const punditAddress = await signer.getAddress();

  // Idempotency: one stake per market. Never let the pundit double-bet a fixture.
  const existing = await readStakeOf(marketId, punditAddress);
  if (existing && BigInt(existing.home) + BigInt(existing.draw) + BigInt(existing.away) > 0n) {
    return result({ ...enriched, outcome, status: 'already_staked', reason: 'pundit already has a position' });
  }

  const tokenAddress = await readSettlementToken();
  if (!tokenAddress || !isAddress(tokenAddress)) {
    return result({ ...enriched, outcome, status: 'market_not_open', reason: 'settlement_token_unknown' });
  }
  const token = new Contract(tokenAddress, ERC20_ABI, signer);
  const decimals = Number(await token.decimals());
  const symbol = String(await token.symbol());
  const amountWei = parseUnits(env.punditStakeAmount, decimals);
  const amountDisplay = `${env.punditStakeAmount} ${symbol}`;

  const balance: bigint = await token.balanceOf(punditAddress);
  if (balance < amountWei) {
    return result({
      ...enriched,
      outcome,
      amountDisplay,
      status: 'insufficient_balance',
      reason: `pundit wallet holds ${formatUnits(balance, decimals)} ${symbol}, needs ${env.punditStakeAmount}`,
    });
  }

  const marketAddress = parimutuelMetadata().address as string;
  const allowance: bigint = await token.allowance(punditAddress, marketAddress);
  if (allowance < amountWei) {
    const approveTx = await token.approve(marketAddress, amountWei);
    await approveTx.wait();
  }

  const marketWrite = new Contract(marketAddress, PARIMUTUEL_ABI, signer);
  const stakeTx = await marketWrite.stake(marketId, outcome, amountWei);
  const receipt = await stakeTx.wait();
  const txHash = String(receipt?.hash ?? stakeTx.hash);
  const explorerUrl = `${X_LAYER.explorer}/tx/${txHash}`;

  const intent: StakeIntent = {
    marketId,
    staker: punditAddress,
    outcome,
    amount: amountWei.toString(),
  };
  const guard = verifyStakeReceipt(intent, receipt);
  recordActivity('cup.punditStake', `${pick.label} ${pick.pick}`);

  const execution = result({
    ...enriched,
    outcome,
    amount: amountWei.toString(),
    amountDisplay,
    txHash,
    explorerUrl,
    verified: guard.verified,
    status: guard.verified ? 'staked' : 'stake_unverified',
    reason: guard.reason,
  });
  recordPunditExecution(execution);
  return execution;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm --prefix server run test:pundit-exec`
Expected: PASS — prints `pundit executor honest-state checks passed`.

- [ ] **Step 6: Typecheck**

Run: `npm --prefix server run typecheck`
Expected: PASS — no errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/services/punditExecutor.ts server/src/services/punditExecutionLog.ts server/scripts/test-pundit-executor.ts
git commit -m "feat(pundit): executor stakes a pick on-chain and guards the result"
```

---

## Task 4: API routes

**Files:**
- Modify: `server/src/routes/cup.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add executor imports to `cup.ts`**

In `server/src/routes/cup.ts`, find the line:

```ts
import { getPunditPick, getPunditProfile, listPunditPicks } from '../services/punditService.js';
```

and insert immediately after it:

```ts
import { executePunditPick } from '../services/punditExecutor.js';
import { listPunditExecutions } from '../services/punditExecutionLog.js';
```

- [ ] **Step 2: Add the two routes to `cup.ts`**

In `server/src/routes/cup.ts`, find the line:

```ts
cupRouter.get('/pundit/:matchId', async (req: Request, res: Response) => {
```

and insert the following BEFORE it (the `executions` GET must be registered before `:matchId`, or `/pundit/executions` would be captured as a matchId):

```ts
cupRouter.get('/pundit/executions', (req: Request, res: Response) => {
  const matchId = req.query.matchId ? String(req.query.matchId) : undefined;
  res.json({ executions: listPunditExecutions(matchId) });
});

cupRouter.post('/pundit/execute', async (req: Request, res: Response) => {
  if (!requireCupWrite(req, res)) return;
  const body = req.body as { matchId?: string };
  if (!body.matchId) return res.status(400).json({ error: 'matchId required' });
  try {
    res.json(await executePunditPick(body.matchId));
  } catch (err) {
    res.status(400).json({
      error: 'pundit execution failed',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

```

- [ ] **Step 3: Document the endpoints in `index.ts`**

In `server/src/index.ts`, find the line:

```ts
      cupPundit: 'GET /api/cup/pundit',
```

and insert immediately after it:

```ts
      cupPunditExecutions: 'GET /api/cup/pundit/executions',
      cupPunditExecute: 'POST /api/cup/pundit/execute  (operator-gated, body {matchId})',
```

- [ ] **Step 4: Typecheck**

Run: `npm --prefix server run typecheck`
Expected: PASS — no errors.

- [ ] **Step 5: Verify the routes respond**

Start the server: `npm --prefix server run dev`
In a second terminal:

Run: `curl -s http://localhost:8787/api/cup/pundit/executions`
Expected: `{"executions":[]}` (or prior entries) — HTTP 200.

Run: `curl -s -X POST http://localhost:8787/api/cup/pundit/execute -H "Content-Type: application/json" -d "{}"`
Expected: `{"error":"matchId required"}` — HTTP 400.

Stop the server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/cup.ts server/src/index.ts
git commit -m "feat(pundit): operator-gated execute route + executions log endpoint"
```

---

## Self-Review

**1. Spec coverage** — the gap this plan closes is "the pundit thinks but never executes":
- Decision → on-chain action: `executePunditPick` (Task 3) stakes a real pick. ✓
- Verification before any success claim: `verifyStakeReceipt` + `claimAllowed` (Task 2). ✓
- Pundit as a real, separate participant (DESIGN §8): dedicated `getPunditSigner` wallet, distinct from the operator (Task 1). ✓
- Honest non-executed states (NO MOCKS): `contract_not_deployed`, `pundit_wallet_not_configured`, `market_not_open`, `insufficient_balance`, `already_staked` — all return without staking. ✓
- A record for the AI Pundit tab / future X-poster: `punditExecutionLog` (Task 3) + `GET /pundit/executions` (Task 4). ✓
- Idempotency (no double-bet): `readStakeOf` check before staking. ✓

**2. Placeholder scan** — every code step contains complete, runnable code; every command has expected output. No TBD / "handle errors" / "similar to". ✓

**3. Type consistency** — `PunditExecution` is defined once in `punditExecutor.ts` and imported as a type by `punditExecutionLog.ts` (type-only import — no runtime cycle). `StakeIntent` / `ReceiptLike` / `GuardResult` defined in `punditCompletionGuard.ts`, consumed unchanged by the executor and the guard test. `PunditOutcome` is the existing export from `punditService.ts`. `verifyStakeReceipt(intent, receipt)` and `claimAllowed({executed,verified,txHash})` signatures match every call site. ✓

**Out-of-scope, deliberately:** X/Twitter posting (needs X API keys) and an autonomous cron (spends OKB unattended) are separate follow-on plans. They consume this plan's output — the `verified` flag and the executions log — without changing it.
