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

## Status — Day 3 complete (deployed on X Layer mainnet)

- [x] Day 1: V4 confirmed on X Layer, Foundry workspace, stub compiles
- [x] Day 2: tier→fee logic, FanScoreRegistry, CupSidePot (55 tests, 91% coverage)
- [x] **Day 3: 3 contracts LIVE on X Layer mainnet** ([explorer](https://www.okx.com/web3/explorer/xlayer/address/0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0))
  - FanFeeHook `0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0`
  - FanScoreRegistry `0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820`
  - CupSidePot `0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504`
- [x] Day 3: HookPage live dashboard + `/api/hook/*` routes
- [ ] Day 4: init USDC/USDT pool with hook + side-pot weekly settle + backtest
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
