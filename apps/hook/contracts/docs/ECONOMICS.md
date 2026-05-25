# FanFeeHook · Economics

How LP fees, side-pot allocations and protocol revenue flow through
the FanFeeHook stack.

## Tier → fee table

| Tier | Score band | LP fee | Notes |
|---|---|---|---|
| 0 unknown | 0–27 | **30 bps** | Default for any wallet without FanScore + without FanPass |
| 1 active | 28–63 | **20 bps** | A FanPass holder gets at least tier 1 even with score 0 |
| 2 trusted | 64–81 | **10 bps** | |
| 3 oracle-grade | 82–100 | **5 bps** | 6× cheaper than baseline |

Pool must be initialized with `LPFeeLibrary.DYNAMIC_FEE_FLAG`. The
hook returns `feePips | OVERRIDE_FEE_FLAG` from `beforeSwap`, which
the PoolManager honors for that swap only.

## Where the fee goes

```
swap fee  ──►  100% to LPs (standard V4 dynamic-fee path)
              │
              └── intended Day-4+ routing (planned, not yet on-chain):
                  · 50% of "extra spread above 5 bps" → CupSidePot
                  · 49% stays with LPs as usual
                  ·  1% → DAO treasury (protocol fee)
```

«Extra spread above 5 bps» means: if the wallet would have paid 30
bps but only pays 5 bps as an oracle-grade fan, the *saved* 25 bps is
the spread. Half of that flows into the weekly CupSidePot; LPs still
receive the actual 5 bps. The on-chain routing is wired via
`BeforeSwapDelta` in `FanFeeHookV2` and is currently invoked via a
manual `CupSidePot.depositFor(...)` from the demo operator. Automatic
afterSwap routing is the M3→M4 roadmap item.

## CupSidePot payout cycle

| Phase | Who | What happens |
|---|---|---|
| Deposit | hook / operator | Anyone calls `depositFor(swapper, amount)` to grow the current week's pot. |
| Settle | operator (v1) / Merkle root (v2) | Operator publishes the winners list (v1) or a Merkle root binding `(weekId, account, amount)` leaves (v2). |
| Claim | winner | v1: `claim(weekId)` for pro-rata share. v2: `claimWithProof(weekId, proof, amount)`. |

Dust from integer division (v1) stays in the contract and rolls into
future weeks. v2 eliminates dust via exact per-leaf amounts.

## FanBoostHook (companion)

`afterAddLiquidity` awards boost points to FanPass-holding LPs equal
to `|liquidityDelta|`. Points are purely an off-chain consumable
signal (no token minted on-chain), surfaced in the loyalty UI.

## Revenue model (post-hackathon)

- **Treasury cut:** 1 bp protocol fee on the *extra spread* — DAO
  treasury accumulates as more pools attach the hook.
- **Permissionless deployment:** anyone can attach `FanFeeHook` to
  their pool (no royalty, no permission).
- **B2B integration tier:** custom adapter wiring + indexing services
  for protocols that want bespoke SBT integration.

## Invariants enforced on-chain

- `FanScoreRegistry`: `score ≤ 100` always.
- `FanScoreRegistry`: tier monotone in score across documented bands
  (verified by `FanScoreRegistry.invariants.t.sol`, 128k fuzz inputs,
  0 reverts).
- `FanScoreRegistry`: tier ∈ {0, 1, 2, 3}.
- `FanScoreRegistry`: `updatedAt > 0` for any wallet ever written.
- `CupSidePotV2`: per-week per-account claim is O(1) double-claim
  guarded (mapping, not array scan).

See [SECURITY.md](../SECURITY.md) for trust model + threat analysis.
