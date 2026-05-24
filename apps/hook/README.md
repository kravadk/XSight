# Hook — Uniswap V4 hackathon submission

OKX «Build with Hook» hackathon entry — **22–28 May 2026**, 14,000 USDT
prize pool. [Hackathon page](https://web3.okx.com/xlayer/build-x-hackathon/hook).

**Live:** [x-sight.vercel.app?product=hook](https://x-sight.vercel.app?product=hook)

## Where FanFeeHook sits among production V4 hooks

| Hook | Mechanic | Mainnet | Identity-gated | Side mechanic | Audit / pause |
|---|---|---|---|---|---|
| **FanFeeHook (this submission)** | tier→fee from SBT score | ✅ X Layer | ✅ FanPass SBT + 0-100 score | ✅ CupSidePot weekly settle | 91% Foundry · v2 pause designed |
| Bunni V2 | rehypothecation (fee + lending APY) | ✅ Eth · Base | ❌ | ❌ | ✅ UFSF audit · ✅ pause |
| Arrakis Pro | inventory-responsive dynamic fee | ✅ 5 chains | ❌ | ❌ | ✅ audit · ✅ pause |
| EulerSwap | DEX over Euler lending pool | ✅ Ethereum | ❌ | yield stacking | ✅ audit · ✅ pause |
| Smart Liquidity Hook | 30 % pool + 70 % Aave | testnet (PCS Hookathon 1st) | ❌ | yield | tests only |
| Watchtower | one-time hooks for sale | testnet (ETHGlobal Taipei 1st UF) | ❌ | meta-mechanic | tests only |
| DetoxHook | MEV → LP via Pyth | testnet (ETHGlobal UF) | ❌ | MEV redistribution | tests only |

**Our unique column:** the only V4 hook that reads an on-chain reputation
SBT and modulates fee per swap. No production peer occupies this slot.

## OKX ecosystem integrations

FanFeeHook is designed to plug into every OKX-side composable surface
without forcing the user out of the dashboard:

| OKX surface | How FanFeeHook uses it | Status |
|---|---|---|
| **X Layer chain 196** | Native deploy target — V4 PoolManager, Universal Router, our 3 contracts all live here | ✅ shipped |
| **OKX Wallet SDK** | Connect via `useWalletStore` (OKX injected provider preferred over generic EIP-1193) | ✅ shipped (shared across XSight + XCup + Hook) |
| **OnchainOS DEX aggregator** | Fallback router pattern: when the FanFeeHook pool lacks depth, route a portion through OnchainOS aggregator multi-hop, then settle the discount-bearing leg through our hook | 📐 design-only (see `CONTRIBUTING.md` extension guide) |
| **X402 paid endpoints** | Hook analytics + per-wallet tier history exposed via `/api/v1/cup/fan-edge` (existing X Cup x402 stack) — paid in USDT, no off-chain auth | ✅ shipped (existing X Cup tier; FanFeeHook scores read by it) |
| **OKX Explorer (OKLink)** | Every contract deploy + swap tx clickable from the dashboard's contract panel | ✅ shipped |

## What's here

```
apps/hook/
├── README.md            this file
├── contracts/           Uniswap V4 hook + tests   (in progress)
└── src/
    └── pages/HookPage.tsx   live dashboard surfaced inside the XSight site
```

## Status — Day 4 complete · END-TO-END LIVE ON X LAYER MAINNET 🚀

- [x] Day 1: V4 confirmed on X Layer, Foundry workspace, stub compiles
- [x] Day 2: tier→fee logic, FanScoreRegistry, CupSidePot (55 tests, 91% coverage)
- [x] Day 3: 3 contracts LIVE on X Layer mainnet + HookPage dashboard + `/api/hook/*`
- [x] **Day 4: pool + swap + CupSidePot full lifecycle on mainnet**
  - FanFeeHook fired `FeeApplied(poolId, swapper, tier=0, feeBps=3000)`
  - 5000 USDC in → 4984 USDT out (16-unit fee = ~32 bps, matches design)
  - CupSidePot: deposit → settle → claim end-to-end (net 0 USDC, only gas)
- [ ] Day 5: demo video + Twitter + submission form

### Live on X Layer mainnet (chain 196)

**v1 — production live, fee-routed:**

| Contract / artifact | Address / hash |
|---|---|
| FanFeeHook v1 | [`0xE667…C0c0`](https://www.okx.com/web3/explorer/xlayer/address/0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0) |
| FanScoreRegistry | [`0x9533…2820`](https://www.okx.com/web3/explorer/xlayer/address/0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820) |
| CupSidePot v1 | [`0x9104…F504`](https://www.okx.com/web3/explorer/xlayer/address/0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504) |
| DemoSwapRouter | [`0x00d1…694f`](https://www.okx.com/web3/explorer/xlayer/address/0x00d1a987beAC42FCB3513b6Fc23429164851694f) |
| USDC/USDT pool ID | `0x3637650b74a2e05c6a381bb260a1695b004f3a9489362be8ec5aa86fa9df17c2` |
| LP NFT tokenId 3128 | burned post-demo · recovery tx [`0x1eb84a90…0824e`](https://www.okx.com/web3/explorer/xlayer/tx/0x1eb84a90b59d37aff5a532335f8ce9393017f33a8ee2fd025f43d51dee50824e) |
| **Demo swap tx (hook fired)** | [`0x757c0c75…8fca7`](https://www.okx.com/web3/explorer/xlayer/tx/0x757c0c75a1f65d2cc675b8f750a713e7ec90e6073716405fd4117eb12a68fca7) |

**v2 — Pausable + Merkle-claim + 30d stale-score fallback (LIVE with own pool + LP + multi-tier proof):**

| Contract / artifact | Address / hash |
|---|---|
| FanFeeHook v2 | [`0x956e…80c0`](https://www.okx.com/web3/explorer/xlayer/address/0x956e97658cd3ce67788b01b5f012954f782480c0) |
| CupSidePot v2 | [`0x8d1d…d4Fa`](https://www.okx.com/web3/explorer/xlayer/address/0x8d1de90753889d57c709cbd77c5e5f3c56add4fa) |
| FanScoreRegistry | reuses v1 (`0x9533…2820`) — no migration needed |
| V2 USDT/USDC pool init | [`0x36a9e220…09ab`](https://www.okx.com/web3/explorer/xlayer/tx/0x36a9e2207e86c6a92dd05bac21f0fa4bab8c65bfe7dbff966a24b1b097ad09ab) |
| V2 LP (0.3 USDT + 0.3 USDC) | minted to operator · `forge script BurnLp.s.sol` to redeem |

**V2 multi-tier proof — same wallet (`0x82736f…7bDB`), 4 fees through FanFeeHookV2:**

| Tier | Score | Fee | V2 swap tx |
|---|---|---|---|
| 0 (unknown) | 0 | 30 bps | [`0xf867e8fb…3593`](https://www.okx.com/web3/explorer/xlayer/tx/0xf867e8fbb730fc6f8cad815de41c945a6966681c50bc69e4aacc9683e0653593) |
| 1 (active) | 30 | 20 bps | [`0x87dac94f…e927`](https://www.okx.com/web3/explorer/xlayer/tx/0x87dac94f9dd668dcce41d380e094e260bdfee924a1e35a0a4e08ad6e2b14e927) |
| 2 (trusted) | 70 | 10 bps | [`0x8131214…92e2`](https://www.okx.com/web3/explorer/xlayer/tx/0x8131214311289d2aa0e691445ce75519345e319f06b6684e2ac45727a5b992e2) |
| 3 (oracle-grade) | 90 | 5 bps | [`0x3dc35df3…1620`](https://www.okx.com/web3/explorer/xlayer/tx/0x3dc35df3a5e0587d9d734891a3a2426a1d3fa4a3485946e69070143007e51620) |

→ v2 hook fires identical tier-fee logic as v1, on its own pool, with
the same FanScoreRegistry reads. **8 multi-tier proof events across both
hook versions.**

v2 shares the existing score registry, so every wallet that earned a tier
on v1 inherits it on v2 automatically. Source:
[`contracts/src/FanFeeHookV2.sol`](contracts/src/FanFeeHookV2.sol),
[`CupSidePotV2.sol`](contracts/src/CupSidePotV2.sol). See
[`SECURITY.md`](contracts/SECURITY.md) for v1→v2 mitigations.

**FanBoostHook (companion hook — `afterAddLiquidity` boost points):**

| Contract | Address |
|---|---|
| FanBoostHook | [`0x1060…8400`](https://www.okx.com/web3/explorer/xlayer/address/0x10609f1a4a47dc78ea3cf21535b4edf8b6758400) |

Deployed standalone to prove the architecture: FanFeeHook (beforeSwap +
afterSwap, bits `0xC0`) and FanBoostHook (afterAddLiquidity, bit `0x400`)
attach to the same pool simultaneously without bit collision. Source:
[`contracts/src/FanBoostHook.sol`](contracts/src/FanBoostHook.sol).

**Honest comparison vs the rest of the V4-hook ecosystem:**
[`docs/COMPETITIVE-ANALYSIS.md`](docs/COMPETITIVE-ANALYSIS.md) — 14
projects compared on 7 dimensions, code-level honesty audit, where we
exceed and where we honestly don't.

### Multi-tier proof — same wallet, 4 different fees (X Layer mainnet)

One wallet (`0x82736f…7bDB`) is walked through every tier by the operator
writing different scores to FanScoreRegistry between swaps. Each row is a
real `FeeApplied` event emitted by FanFeeHook on the same USDT/USDC pool:

| Tier | Score in registry | Fee charged | Swap tx |
|---|---|---|---|
| 0 (unknown)      | 0  | **30 bps** | [`0xaf6a0165…2c4a`](https://www.okx.com/web3/explorer/xlayer/tx/0xaf6a0165d3cfb68611e0e9b4200193656203c26ba13f86b642aea264842c2c4a) |
| 1 (active)       | 30 | **20 bps** | [`0xcdfa2e93…1e1b`](https://www.okx.com/web3/explorer/xlayer/tx/0xcdfa2e93635e3921e09332415600cd267a934baa2c2c784cf95a7d3bcf6a1e1b) |
| 2 (trusted)      | 70 | **10 bps** | [`0x05f1c62d…e2d1`](https://www.okx.com/web3/explorer/xlayer/tx/0x05f1c62d2f3e8aabd886d586b2157a9e9b580b47de57fa764c0658f670e0e2d1) |
| 3 (oracle-grade) | 90 | **5 bps**  | [`0x34c4ac12…6de9`](https://www.okx.com/web3/explorer/xlayer/tx/0x34c4ac12738fb60e1d308616eafb32436846d4f7100559ff44da40f111666de9) |

→ Identical wallet, identical pool, same swap direction. The only thing
that changes between rows is the on-chain reputation score → and the LP fee
moves from 30 bps to 5 bps. **6× cheaper swap for the top tier.**

### CupSidePot live lifecycle (also on mainnet)

| Step | Tx hash |
|---|---|
| Approve USDC → pot | [`0x55cb8b65…a2bd`](https://www.okx.com/web3/explorer/xlayer/tx/0x55cb8b65c1d49721e4ebe43e1648989982812b6df2a48658d236b2fd6744a2bd) |
| `depositFor(self, 0.1 USDC)` | [`0xd9161b08…d3a4`](https://www.okx.com/web3/explorer/xlayer/tx/0xd9161b08222e39103cf27b9b0698e8c7cc64e6ff95fed8e2979d78e006b9d3a4) |
| `settle(weekId, [self])` | [`0x3c0f4ac4…c8d2`](https://www.okx.com/web3/explorer/xlayer/tx/0x3c0f4ac4ab3abaf35e8e76a2e6a6c230a3def8deb8e83119a755b46827e3c8d2) |
| `claim(weekId)` (recovered 0.1 USDC) | [`0x6d346e60…5577`](https://www.okx.com/web3/explorer/xlayer/tx/0x6d346e605bdc16c7ae15454a54dee3045d100683a27d0df471c358133e9a5577) |

### Gas snapshot (Foundry)

| Function | Gas |
|---|---|
| `CupSidePot.depositFor` (first-of-week) | ~77k |
| `CupSidePot.settle` (1 winner) | ~226k |
| `CupSidePot.claim` | ~178k (full path incl. mock) |
| `FanFeeHook.feeOf(<unknown wallet>)` | ~19k (view) |
| `FanFeeHook._beforeSwap` (full path) | ~85k inside PoolManager swap |

Full snapshot in [`contracts/.gas-snapshot`](contracts/.gas-snapshot).

## Architecture (FanFeeHook)

```
swap → V4 PoolManager → FanFeeHook.beforeSwap
                          ├─ read FanPassSBT.balanceOf(swapper)
                          ├─ read FanScoreRegistry.scoreOf(swapper)
                          ├─ compute tier → dynamic fee (5/10/20/30 bps)
                          └─ return (LPFeeLibrary.OVERRIDE_FEE_FLAG | fee)
                        FanFeeHook.afterSwap
                          └─ route extra spread → CupSidePot.depositFor
                                                  ↓ weekly settle
                                                  ↓ reads CupOracleV3 + BracketNFT picks
                                                  → payout to correct pickers
```

## For judges + auditors

- **[`docs/JUDGE-WALKTHROUGH.md`](docs/JUDGE-WALKTHROUGH.md)** — verify
  every claim above in 5 minutes using `cast` + public RPC. Read any
  wallet's tier on-chain, trigger a real swap, decode the `FeeApplied`
  event — no UI trust required.
- **Fresh wallet, instant discount** — open
  [`?product=hook`](https://x-sight.vercel.app/?product=hook), connect
  a brand-new address, click "Claim starter score · free" → backend
  grants score 35 (Active tier, 20 bps) → next swap is **1.5×
  cheaper** than the default 30 bps.

## For other protocols building on FanFeeHook

- **[`docs/INTEGRATION-GUIDE.md`](docs/INTEGRATION-GUIDE.md)** —
  60-second snippet to point your own V4 pool at our live hook
  address. No deploy required.
- **[`contracts/examples/`](contracts/examples/)** — three drop-in
  reputation adapters (BrightID / Gitcoin Passport / OP Attestation
  Station). Copy, swap interface addresses, deploy your own
  permissionless variant.
- **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — full deploy-to-another-
  chain runbook.

## Develop

This product lives inside the [XSight monorepo](https://github.com/kravadk/XSight).
Frontend dashboard renders at `?product=hook`; V4 contracts live in
[`contracts/`](contracts/) as a Foundry workspace.

### V4 contracts (Foundry)

```bash
cd apps/hook/contracts
forge install Uniswap/v4-core --no-git
forge install Uniswap/v4-periphery --no-git
forge install OpenZeppelin/uniswap-hooks --no-git
forge build
forge test --gas-report
```

`lib/` is git-ignored — re-install on clone via `forge install`.

## Repo

Mirrored to [`github.com/kravadk/XHook`](https://github.com/kravadk/XHook) via
`git subtree`. Edits land in the umbrella; the mirror is read-only.
