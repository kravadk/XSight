# Hook — Uniswap V4 hackathon submission

<p align="center">
  <img src="docs/cover.svg" alt="FanFeeHook — identity-gated swap fees on X Layer" width="100%"/>
</p>

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

| Contract / artifact | Address / hash |
|---|---|
| FanFeeHook | [`0xE667…C0c0`](https://www.okx.com/web3/explorer/xlayer/address/0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0) |
| FanScoreRegistry | [`0x9533…2820`](https://www.okx.com/web3/explorer/xlayer/address/0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820) |
| CupSidePot | [`0x9104…F504`](https://www.okx.com/web3/explorer/xlayer/address/0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504) |
| DemoSwapRouter | [`0x00d1…694f`](https://www.okx.com/web3/explorer/xlayer/address/0x00d1a987beAC42FCB3513b6Fc23429164851694f) |
| USDC/USDT pool ID | `0x3637650b74a2e05c6a381bb260a1695b004f3a9489362be8ec5aa86fa9df17c2` |
| LP NFT tokenId | `3128` (held by deployer) |
| **Demo swap tx (hook fired)** | [`0x757c0c75…8fca7`](https://www.okx.com/web3/explorer/xlayer/tx/0x757c0c75a1f65d2cc675b8f750a713e7ec90e6073716405fd4117eb12a68fca7) |

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
