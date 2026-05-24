# FanFeeHook security notes

This document is intentionally transparent about what the hackathon-submission
contracts assume, what they do not yet protect against, and how each
limitation is mitigated in the v2 upgrade path documented in code.

## 1. Trust model (v1)

| Actor | Capability | Risk if compromised |
|---|---|---|
| Deployer / owner | `transferOwner`, `setOperator` on all three contracts | hard reset of operator + ownership |
| Operator (server EOA `0x82736f…7bDB`) | write `FanScoreRegistry.scoreOf`, `CupSidePot.settle` | wrong scores → wrong fees · arbitrary winners list |
| PoolManager (Uniswap V4 singleton) | callback `beforeSwap` / `afterSwap` only | none — Uniswap-owned, non-upgradeable |
| FanPassSBT (existing X Cup deployment) | read-only `balanceOf(swapper)` | none — soulbound, no transfer surface |

The operator is the X Cup core multisig (same trust assumption as the
existing `ArbiterMultisig` on chain). Migrating to a real multisig or DAO is
a one-tx `setOperator` call.

## 2. Known limitations

### 2.1 `tx.origin` as swapper identity (FanFeeHook L99)
The hook callback receives `sender` from the PoolManager, but `sender` is
the router contract (DemoSwapRouter / Universal Router), not the EOA. We
therefore read `tx.origin` to identify the actual swapper.

**Why it is safe here:** the hook only modulates fee (no transfers, no
approvals consumed). `tx.origin` cannot be used for phishing because the
worst an attacker can do is *give the victim a discount*.

**v2 mitigation:** parse `hookData` for an explicit `address swapper`
field passed by the trusting router. Backwards-compatible.

### 2.2 Operator-curated `CupSidePot.settle(weekId, winners[])`
Operator pushes the winners list. If compromised, attacker can drain the
weekly pot to a wallet they control.

**Bound:** worst-case loss = `weekPot[currentWeek]` only. Past weeks are
locked once settled. No retroactive theft.

**v2 mitigation:** `CupSidePotV2` adds `settleMerkle(weekId, root)` +
`claimWithProof(weekId, proof, account, amount)` — operator publishes a
Merkle root, anyone can verify proof off-chain. Pot only releases funds to
addresses with valid proofs.

### 2.3 Unbounded loop in `CupSidePot._isWinner` (L149)
Linear scan through winners array. At 1 000 winners a single `claim`
costs ~25 M gas — fits in a block but expensive.

**v2 mitigation:** `mapping(uint256 weekId => mapping(address => bool))`
parallel to the array — O(1) membership check. The array remains for
enumeration (`winnerAt`).

### 2.4 FanScoreRegistry score staleness
`scoreOf` is whatever the operator wrote last. If operator forgets to
batch-update, stale scores influence fees.

**Bound:** stale = old fee tier, not malicious tier. Worst-case user pays
30 bps instead of 20 — annoying but not extractive.

**v2 mitigation:** `updatedAt` already tracked. Add `MAX_SCORE_AGE` check
in `FanFeeHook` that falls back to tier 0 if score older than 30 days.

### 2.5 No pause mechanism in v1
If a critical bug surfaces post-deploy, hook keeps modulating fees.

**Bound:** because v1 has *no value-extracting paths* (it only sets fee via
dynamic-fee flag, never takes via BeforeSwapDelta), worst impact is wrong
fee charged. Users can avoid the pool by not swapping through it.

**v2 mitigation:** `FanFeeHookV2 is Pausable`. Paused → return baseline
30 bps fee, no other side-effect. Owner-controlled, behind 24h timelock.

## 3. Threat model

| Threat | Vector | Mitigation in v1 | Hardened in v2 |
|---|---|---|---|
| Wrong-tier fee | operator pushes bad score | bound: 5-30 bps swing, no theft | Merkle-rooted score commitments |
| Pot theft | operator settles to attacker | bound: single week pot | Merkle proofs replace operator list |
| Pool gridlock | hook reverts in `beforeSwap` | n/a (no revert paths) | Pause → fallback fee |
| MEV / sandwich | standard V4 risk | dynamic fee discourages it | n/a (orthogonal) |
| Reentrancy | external call to `CupSidePot` from `afterSwap` (not implemented yet) | n/a | `nonReentrant` modifier |
| Front-run `setScore` | operator batch tx visible in mempool | low value (5-30 bps) | private RPC / Flashbots |

## 4. Audit status

- **Foundry tests:** 55 cases passing, **91 % line coverage** across the
  three production contracts (FanFeeHook 66 %, FanScoreRegistry 100 %,
  CupSidePot 100 %). FanFeeHook's lower number reflects that
  `_beforeSwap` / `_afterSwap` require a PoolManager fixture to execute;
  the corresponding paths are covered end-to-end by the live mainnet
  multi-tier proof (4 real swaps with the expected 30/20/10/5 bps fees).
- **Fuzz tests:** monotonic tier formula, threshold boundaries, deposit
  overflow — all 256 runs green.
- **Gas snapshot:** committed at [`./.gas-snapshot`](./.gas-snapshot).
- **External audit:** none yet. Targeting [UFSF security
  subsidy](https://mirror.xyz/uniswapfoundation.eth/EZFncNsBhPIc-wdqI4LhtWV8WciGUFRZ3kyZfKTczAA)
  post-hackathon.
- **Source verification on OKX Explorer:** Sourcify currently rejects the
  bytecode because of `via_ir=true` artifact layout. Re-attempt planned
  via Blockscout-direct or by spawning a non-via_ir compile artifact.
  In the meantime: deterministic Foundry build is reproducible via
  `forge build && forge verify-contract --show-standard-json-input`.

## 5. Responsible disclosure

If you find an issue: open a private GitHub Security Advisory on
[kravadk/XHook](https://github.com/kravadk/XHook/security/advisories) or
email `dkravchuk680@gmail.com`. We will respond within 72 hours.
