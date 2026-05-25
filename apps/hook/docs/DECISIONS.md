# Architectural Decisions

Short-form ADRs for the FanFeeHook stack. Each entry lists the
decision, why it was made, and what would force a revisit.

## DEC-001 · `tx.origin` for swapper identity

**Decision.** `FanFeeHook._beforeSwap` reads `tx.origin` (not
`msg.sender`) to identify the swapper whose tier drives the dynamic
fee.

**Why.** The hook is the trailing recipient of a Universal Router /
Permit2 / DemoSwapRouter call chain. `msg.sender` at the hook is the
PoolManager, not the user. The UI-driven flow (HookPage → user signs
through OKX Wallet) guarantees `tx.origin` *is* the actual EOA.

**Trade-off.** Flash-loan or proxy contracts can spoof the swapper.
For a hackathon front-end this is acceptable — automated flash-loan
abuse would need to deposit into the side-pot to be worthwhile and is
caught by SECURITY.md threat model section 2.1.

**Revisit when.** A signed-intent layer (e.g. Permit2 SignatureTransfer
recipient routing) becomes the dominant entry point — then read the
actual signer from the intent rather than `tx.origin`.

## DEC-002 · Operator-curated scores in `FanScoreRegistry`

**Decision.** A single operator EOA writes scores via `setScore` /
`setScores` weekly. There is no on-chain proof of correctness.

**Why.** A trustless scoring oracle would require zk proofs of off-chain
reputation queries — infeasible for a 5-day hackathon and orthogonal to
the «identity-gated fee» narrative.

**Trade-off.** Single point of failure: a compromised operator key can
mark any wallet as oracle-grade. SECURITY.md documents key-rotation
playbook.

**Revisit when.** M5 — replace operator writes with a Merkle root
binding `(wallet, score, scoreSource)` leaves; FanScoreRegistry verifies
the proof per-call. Same pattern as CupSidePotV2's claim flow.

## DEC-003 · Side-pot instead of 100% LP rebate

**Decision.** Extra spread above the 5 bps floor flows to CupSidePot
(weekly community payout), not back to LPs as a direct rebate.

**Why.** A direct LP rebate is invisible to the *swapper* — they just
see a smaller fee. A weekly settle with a public winners list creates
a recurring community moment + visible token flow + clear «what does my
score get me» loop. Mirrors the X Cup parimutuel cadence so the same
audience engages with both.

**Trade-off.** LPs do not capture 100% of fee revenue. Counter: the
hook's lower fee tiers *bring more volume* (6× cheaper swap attracts
loyal users), so LP USD revenue can still be higher in absolute terms.

**Revisit when.** A partner pool explicitly requests pure LP rebate
mode — add a `mode` flag to the hook constructor; ECONOMICS.md gets a
new column.

## DEC-004 · X Layer as primary deploy target

**Decision.** Mainnet deployment is X Layer (chain 196), not Ethereum
mainnet or Base.

**Why.**
- OKX's 50 M user funnel — the largest distribution channel for a fan-
  token economy.
- Uniswap V4 launched on X Layer with zero interface fees just months
  before the hackathon — first-mover advantage for hooks.
- X Cup (the reputation source) already lives there with 5 production
  contracts — no cross-chain bridging required.

**Trade-off.** Smaller LP TVL than Ethereum mainnet; fewer
indexers / explorers; X Layer's RPC has a 100-block `eth_getLogs`
ceiling that required a chunked indexer.

**Revisit when.** Partner pools on other chains ask for the hook;
M5 multi-chain stretch can deploy via the same Foundry scripts (only
`POOL_MANAGER` env changes).

## DEC-005 · Generic `FanScoreRegistry`, not hardcoded SBT

**Decision.** The hook accepts any address that satisfies a minimal
`{ tierOf, updatedAt }` reader interface as its `_fanScoreRegistry`
constructor argument — it is **not** tied to the X Cup FanPass SBT.

**Why.** «Composable rails for any SBT» is the unique-column claim in
the competitive analysis. Hardcoding the SBT would lock the entire
ecosystem to X Cup and forfeit the loyalty-rails narrative.

**Trade-off.** Adapters can implement the interface badly; SECURITY.md
calls out that a misbehaving adapter (e.g. one that reverts on
unknown wallets) can grief the pool. REVIEW_POLICY.md gates third-
party adapter promotions to `verified` / `official` tiers.

**Revisit when.** Never expected — this is the protocol's primary
extensibility surface. Adapter contract examples in
[`apps/hook/contracts/examples/`](../contracts/examples/) and metadata
in [`apps/hook/adapters/`](../adapters/) demonstrate the pattern.
