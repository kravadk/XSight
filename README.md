# XSight monorepo

This umbrella workspace hosts three independent products on a single site
([x-sight.vercel.app](https://x-sight.vercel.app)) and a single shared backend
([xsight-lpov.onrender.com](https://xsight-lpov.onrender.com)). Each product
has its own GitHub repository, README and release cadence.

## Products

| Product | Surface | GitHub | Deep link |
|---|---|---|---|
| **XSight** — AI trading copilot | [`apps/xsight/`](apps/xsight/) | [kravadk/XSight-AI](https://github.com/kravadk/XSight-AI) | [`?product=xsight`](https://x-sight.vercel.app?product=xsight) |
| **X Cup** — World Cup 2026 prediction market on X Layer | [`apps/xcup/`](apps/xcup/) | [kravadk/X-Cup](https://github.com/kravadk/X-Cup) | [`?product=xcup`](https://x-sight.vercel.app?product=xcup) |
| **Hook** — Uniswap V4 hook for OKX «Build with Hook» (May 2026) | [`apps/hook/`](apps/hook/) | [kravadk/Hook](https://github.com/kravadk/Hook) | [`?product=hook`](https://x-sight.vercel.app?product=hook) |

## Layout

```
apps/xsight/         XSight pages + components  (mirrored → kravadk/XSight-AI)
apps/xcup/           X Cup pages + components   (mirrored → kravadk/X-Cup)
apps/hook/           Hook page + V4 contracts   (mirrored → kravadk/Hook)
packages/shared/     wallet, layout, common UI, stores, config, hooks
server/              one Express backend serving all three products
contracts/           X Cup Solidity (Parimutuel, Oracle, FanPass, BracketNFT)
src/                 shell: App.tsx + main.tsx + DocsPage + DevelopersPage
```

## Run locally

```
npm install
npm --prefix server install
npm run server:dev   # one terminal — Express on :8787
npm run dev          # another — Vite on :5173
```

Switch products from the sidebar (XSight ↔ X Cup ↔ Hook) or open
`?product=hook` / `?product=xcup` / `?product=xsight` directly.

## Mirroring to product repos

The three `apps/*` folders are `git subtree`-mirrored to standalone GitHub
repos so each product is consumable on its own (separate stars, issues,
commit history, README). Run from repo root:

```
npm run mirror
```

The umbrella repo stays the canonical source. Edit code here; the mirror is
read-only on GitHub.
