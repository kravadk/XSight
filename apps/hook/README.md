# Hook — Uniswap V4 hackathon submission

OKX «Build with Hook» hackathon entry — **22–28 May 2026**, 14,000 USDT
prize pool. [Hackathon page](https://web3.okx.com/xlayer/build-x-hackathon/hook).

**Live:** [x-sight.vercel.app?product=hook](https://x-sight.vercel.app?product=hook)

## What's here

```
apps/hook/
├── README.md            this file
├── contracts/           Uniswap V4 hook + tests   (in progress)
└── src/
    └── pages/HookPage.tsx   live dashboard surfaced inside the XSight site
```

## Status

Day-1 scaffold complete (2026-05-23):

- [x] **V4 confirmed on X Layer mainnet** — PoolManager `0x360e68fa…fb32`,
      Universal Router 2.1.1 `0x8b844f88…1e6b`
- [x] Foundry workspace + remappings + v4-core/v4-periphery/OZ hooks installed
- [x] `FanFeeHook.sol` stub compiles (`forge build` green)
- [x] Sanity test passes (`forge test` green)
- [ ] Day 2: `_beforeSwap` tier→fee logic + `FanScoreRegistry` + `CupSidePot`
- [ ] Day 3: HookMiner + deploy on X Layer mainnet + pool init
- [ ] Day 4: side-pot weekly settle loop + backtest
- [ ] Day 5: demo video + Twitter + submission form

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
