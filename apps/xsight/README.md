# XSight — AI trading copilot

An AI-powered trading copilot for X Layer. Chat to your portfolio, run
auto-yield strategies, monetize public endpoints with x402 — all from one
interface.

**Live:** [x-sight.vercel.app?product=xsight](https://x-sight.vercel.app?product=xsight)

## What's here

- **Chat** — Claude-powered copilot over your portfolio + on-chain context.
- **Portfolio** — holdings, allocation, asset charts, swap widget (OKX DEX).
- **API** — x402-monetized endpoints: market-summary, token-analysis,
  trading-signals, portfolio-advice. Pay per call with an X Layer tx hash.
- **Earn** — autonomous micro-swap strategies + on-chain heartbeat.
- **Guide / Build** — onboarding + integration docs for x402 / MCP / OKX Connect.

## Stack

- React 18 + Vite + TypeScript + Tailwind, zustand for state.
- OKX Wallet + OKX Connect WalletConnect bridge.
- Express + Claude API + ethers v6 backend (shared with the rest of the
  monorepo — see [`../../server/`](../../server/)).
- x402 payment-gated endpoints (verifier checks an X Layer tx hash).
- MCP server exposes the same data to Claude Desktop / agents.

## Develop

This product lives inside the XSight monorepo. See the umbrella
[README](../../README.md) for monorepo layout. To run XSight alone:

```
npm install
npm --prefix server install
npm run server:dev
npm run dev    # then open ?product=xsight
```

## Repo

XSight lives in the umbrella repo itself —
[`github.com/kravadk/XSight`](https://github.com/kravadk/XSight) — since the
umbrella is named after this product. No separate mirror.
