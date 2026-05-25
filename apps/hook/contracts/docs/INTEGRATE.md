# Integrating FanFeeHook into your pool

End-to-end recipe for attaching `FanFeeHook` (or `FanFeeHookV2`) to a
pool you control. Targets X Layer mainnet (chain 196).

## 1. Pick the hook flavour

| Variant | When to use |
|---|---|
| `FanFeeHook` (v1) | Simplest production deploy; matches the original demo. No Pausable, no stale-score fallback. |
| `FanFeeHookV2` | Pausable + 30-day stale-score fallback. Recommended for any pool that may run unattended. |

Both v1 and v2 share the same `FanScoreRegistry`. Adopt v2 unless you
have a reason to prefer v1.

## 2. Wire your reputation source

You have two options:

### a. Reuse our `FanScoreRegistry`

Pass `0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820` as the
`_fanScoreRegistry` constructor argument. The X Cup operator EOA
writes scores weekly; your wallet inherits the X Cup tier.

### b. Plug in your own adapter

Implement the minimal interface:

```solidity
interface IFanScoreSource {
    function tierOf(address wallet) external view returns (uint8);
    function updatedAt(address wallet) external view returns (uint64);
}
```

…or use one of the shipped examples:

- [BrightID](../examples/BrightIDAdapter.sol) — verified-human → tier 3
- [Gitcoin Passport](../examples/GitcoinPassportAdapter.sol) — scaled 0..100
- [Optimism Attestation](../examples/OptimismAttestationAdapter.sol) — single-key endorsement → tier 2

See [`adapters/`](../../adapters/) for the registry + ADAPTER.md
metadata files.

## 3. Mine the hook address

V4 requires hook addresses to encode their permission bits. Use
`HookMiner.find` (already invoked in
[`script/DeployFanFeeHook.s.sol`](../script/DeployFanFeeHook.s.sol)).

For FanFeeHook v1/v2: bits `BEFORE_SWAP_FLAG | AFTER_SWAP_FLAG` = `0xC0`.
For FanBoostHook: bit `AFTER_ADD_LIQUIDITY_FLAG` = `0x400`.

## 4. Initialize the pool with DYNAMIC fee

```solidity
PoolKey memory key = PoolKey({
    currency0: USDT_OR_LOWER,
    currency1: USDC_OR_HIGHER,
    fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
    tickSpacing: 60,
    hooks: IHooks(hookAddress)
});
poolManager.initialize(key, START_SQRT_PRICE);
```

A pool initialized with any *fixed* fee will ignore the hook's
override. The dynamic flag is mandatory.

## 5. Add liquidity

Use `PositionManager.modifyLiquidities(...)` exactly as for any V4
pool. The hook does nothing during `addLiquidity` (FanFeeHook does
not implement that bit). If you also attach `FanBoostHook` on the
same pool, the boost hook will award points to FanPass-holding LPs.

## 6. Swap

Route via Universal Router or the bundled
[`DemoSwapRouter`](../src/DemoSwapRouter.sol). The hook fires
`FeeApplied(poolId, swapper, tier, feePips)` for every swap; the
PoolManager uses the returned fee for that swap.

## 7. (Optional) Wire the side-pot

Have the operator call `CupSidePotV2.depositFor(swapper, amount)`
periodically (once `afterSwap` routing is automated this becomes
on-chain native). Operator finalizes a week by publishing a Merkle
root via `settle(weekId, root)`; winners pull funds with
`claimWithProof(weekId, proof, amount)`.

## 8. Index events

The `FeeApplied` event is the canonical signal for downstream
analytics. Subscribe via your RPC's `eth_getLogs` (X Layer's default
`fromBlock` window is 100 blocks — use the server's getLogs chunker
for older windows).

ABI bundles ship from [`packages/abis`](../packages/abis/) for typed
client integration.
