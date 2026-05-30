# Hook contracts — Uniswap V4 hook for OKX «Build with Hook»

Foundry workspace for the Solidity side of the
[Hook hackathon submission](../README.md). Identity-gated swap fee on
Uniswap V4 / X Layer mainnet.

## Contracts

| Contract | Purpose |
|---|---|
| [`FanFeeHook`](src/FanFeeHook.sol) (v1) | Dynamic LP fee per swap based on a 4-tier table; reads `FanScoreRegistry` + `FanPassSBT`. |
| [`FanFeeHookV2`](src/FanFeeHookV2.sol) | v1 + Pausable + 30-day stale-score fallback. |
| [`FanScoreRegistry`](src/FanScoreRegistry.sol) | Operator-curated 0..100 score cache, tier thresholds 28/64/82. |
| [`CupSidePot`](src/CupSidePot.sol) (v1) | Weekly-settled prediction-market side pool; operator publishes winners list. |
| [`CupSidePotV2`](src/CupSidePotV2.sol) | v1 + Pausable + Merkle-proof claim path. |
| [`FanBoostHook`](src/FanBoostHook.sol) | Companion `afterAddLiquidity` hook awarding boost points to FanPass-holding LPs. |
| [`DemoSwapRouter`](src/DemoSwapRouter.sol) | Minimal swap router used by demo scripts (UI uses Universal Router). |

Adapter reference implementations live in [`examples/`](examples/),
with metadata in [`apps/hook/adapters/`](../adapters/).

## Deployments

**X Layer mainnet (chain 196)** — verified on OKLink:

| Layer | Address |
|---|---|
| Uniswap V4 PoolManager | `0x360e68faccca8ca495c1b759fd9eee466db9fb32` |
| Universal Router 2.1.1 | `0x8b844f885672f333bc0042cb669255f93a4c1e6b` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| `FanFeeHook` v1 | [`0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0`](https://www.okx.com/web3/explorer/xlayer/address/0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0) |
| `FanFeeHookV2` | [`0x956e97658cd3ce67788b01b5f012954f782480c0`](https://www.okx.com/web3/explorer/xlayer/address/0x956e97658cd3ce67788b01b5f012954f782480c0) |
| `FanScoreRegistry` (shared) | [`0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820`](https://www.okx.com/web3/explorer/xlayer/address/0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820) |
| `CupSidePot` v1 | [`0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504`](https://www.okx.com/web3/explorer/xlayer/address/0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504) |
| `CupSidePotV2` | [`0x8d1de90753889d57c709cbd77c5e5f3c56add4fa`](https://www.okx.com/web3/explorer/xlayer/address/0x8d1de90753889d57c709cbd77c5e5f3c56add4fa) |
| `FanBoostHook` | [`0x10609f1a4a47dc78ea3cf21535b4edf8b6758400`](https://www.okx.com/web3/explorer/xlayer/address/0x10609f1a4a47dc78ea3cf21535b4edf8b6758400) |
| Existing `FanPassSBT` (read-only) | [`0x74F75532428A99E613a865C97D1084b7f38241BD`](https://www.okx.com/web3/explorer/xlayer/address/0x74F75532428A99E613a865C97D1084b7f38241BD) |

On-chain verification (read-only `cast call`):
- `FanScoreRegistry.operator()` → `0x82736f...bDB` ✓
- `CupSidePot.token()` → USDC `0x74b7F1...d22` ✓
- `FanFeeHook.feeOf(<unknown wallet>)` → `3000` = 30 bps ✓

## Development

Foundry workspace. solc 0.8.30, evm cancun (V4 needs transient
storage).

```bash
# install deps (lib/ is git-ignored)
forge install Uniswap/v4-core --no-git
forge install Uniswap/v4-periphery --no-git
forge install OpenZeppelin/uniswap-hooks --no-git

# build + test
forge build              # ~40 files, <2s warm
forge test               # 59/59 PASS (55 unit + 4 invariants × 128k fuzz)
forge test --gas-report  # gas snapshot
forge coverage           # ~91% on core paths
```

Deploy scripts under [`script/`](script/):

| Script | Purpose |
|---|---|
| `DeployFanFeeHook.s.sol` | Mainnet v1 deploy (CREATE2 mined address) |
| `DeployV2.s.sol` | Mainnet v2 + companion CupSidePotV2 |
| `DeployFanBoost.s.sol` | Mainnet companion afterAddLiquidity hook |
| `DeployTestnet.s.sol` | Sepolia / fork deploy with mock USDC for adapter testing |
| `InitTestPool.s.sol` · `MintLp.s.sol` · `BurnLp.s.sol` | Pool + liquidity lifecycle |
| `MultiTierDemo.s.sol` · `BatchDemo.s.sol` | Multi-swap demos that fire `FeeApplied` events at every tier |
| `PotDemo.s.sol` · `SwapDemo.s.sol` | End-to-end demo flows |

## Audit

No external audit yet. Internal verification:
- 59/59 Foundry tests pass (55 unit + 4 invariants).
- Invariant fuzzer: 128k inputs per invariant, 0 reverts.
- 15+ live `FeeApplied` events on mainnet across all 4 tiers.

External audit + a formal verification pass are M5 roadmap items.

## TypeScript / JS bindings

Typed ABI bundles for `viem` / `wagmi` / `ethers` ship from
[`packages/abis`](packages/abis/) → published as `@xtariff/hook-abis`.

```ts
import { FanFeeHook } from '@xtariff/hook-abis';
```

Regenerate after a contract change: `cd packages/abis && npm run build`.

## License

Licensed under either of **Apache License, Version 2.0**
([LICENSE-APACHE](../LICENSE-APACHE)) or **MIT license**
([LICENSE-MIT](../LICENSE-MIT)) at your option.

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in the Work by you, as defined in the Apache-2.0
license, shall be dual-licensed as above, without any additional terms
or conditions.
