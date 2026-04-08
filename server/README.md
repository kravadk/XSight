# XSight server

Express + TypeScript backend for XSight — AI trading copilot for X Layer.

## Layout

- `src/index.ts` — Express entry, mounts all routes
- `src/routes/chat.ts` — `POST /api/chat` for the frontend chat UI
- `src/routes/swap.ts` — `GET /api/swap/quote`, `POST /api/swap`
- `src/routes/status.ts` — health, portfolio, x402 call log, economy snapshot
- `src/routes/analysis.ts` — x402-monetized analytics API (`/api/v1/*`)
- `src/middleware/x402.ts` — x402 payment verification middleware
- `src/services/ai.ts` — Anthropic Claude client (chat + structured-JSON modes)
- `src/services/onchainos.ts` — OnchainOS REST client with HMAC-SHA256 signing
- `src/services/economyLoop.ts` — economy snapshot derived from x402 call log
- `src/types/index.ts` — shared response/payload types
- `src/utils/prompts.ts` — system prompts
- `src/utils/xlayer.ts` — X Layer chain constants

## Setup

```bash
cd server
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY, OKX_API_KEY/SECRET/PASSPHRASE,
#         AGENTIC_WALLET_ADDRESS, X402_PAYOUT_ADDRESS
npm run dev
```

The server requires all four credential blocks (Anthropic, OKX API key/secret/passphrase/project, Agentic Wallet, x402 payout). Missing or invalid credentials cause the affected routes to return `503 Service Unavailable` with the upstream error — no fake data is ever returned.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/`                          | public            | service info |
| GET  | `/api/status/health`         | public            | configured-keys check |
| GET  | `/api/status/portfolio`      | public            | Agentic Wallet balances |
| GET  | `/api/status/x402-log`       | public            | recent x402 call log |
| GET  | `/api/status/economy`        | public            | economy-loop snapshot |
| POST | `/api/chat`                  | public            | conversational AI for the chat UI |
| GET  | `/api/swap/quote`            | public            | swap quote (read-only) |
| POST | `/api/swap`                  | public            | execute swap via OnchainOS DEX aggregator |
| GET  | `/api/v1/market-summary`     | **x402 0.01 USDT** | AI X Layer market summary |
| GET  | `/api/v1/token-analysis`     | **x402 0.05 USDT** | deep token analysis + risk |
| GET  | `/api/v1/trading-signals`    | **x402 0.10 USDT** | buy/sell signals with confidence |
| GET  | `/api/v1/portfolio-advice`   | **x402 0.05 USDT** | rebalancing recommendations |

In development mode the `X-PAYMENT: dev-bypass` header skips on-chain verification for the x402 routes; in production only base64-encoded payment proofs whose `payTo`, `amount`, `network`, and `asset` match the configured payout address are accepted.
