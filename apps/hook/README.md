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

In progress — repo will fill out during the hackathon week:

- [ ] V4 hook contract (Solidity 0.8.x)
- [ ] Foundry / Hardhat test suite
- [ ] Deployment script for X Layer mainnet
- [ ] Dashboard: live hook activity + pool stats + tx links
- [ ] Submission writeup

## Develop

This product lives inside the [XSight monorepo](https://github.com/kravadk/XSight).
The dashboard page renders inside the unified site; the V4 contracts live in
`apps/hook/contracts/` and are tested standalone.

## Repo

Mirrored to [`github.com/kravadk/Hook`](https://github.com/kravadk/Hook) via
`git subtree`. Edits land in the umbrella; the mirror is read-only.
