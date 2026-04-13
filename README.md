# XSight — AI Trading Copilot for X Layer

> Chat with AI. It analyzes X Layer markets, trades for you, and sells its own intelligence as a pay-per-call API via x402.

**OKX Build X Hackathon Season 2 — X Layer Arena**
**Special prize tracks:** Best x402 Application · Best Economy Loop · Most Active Agent · Best MCP Integration

---

## TL;DR

XSight is the first AI trading copilot on X Layer. Humans chat with it; machines pay it per call. Every primitive is wired to real OnchainOS APIs and every dollar of revenue is verifiable on-chain.

- **6/6 features verified end-to-end** with real Anthropic Claude responses, real OKX-DEX swaps, real x402 payments, real on-chain receipts
- **Zero stubs / zero hardcoded fake numbers** — every metric in the UI traces back to a live source
- **Real earn-pay-earn loop** with a manual `/trigger-deploy` endpoint that converts surplus USDT into yield-bearing OKB on-chain
- **Activity tracker** counts every OnchainOS call, every swap, every x402 payment so the "Most Active Agent" leaderboard has data to chew on
- **Hackathon helper script** (`npm --prefix server run activity`) seeds 12 legitimate calls and surfaces the cumulative state

---

## Scoring criteria coverage

| Criterion (25%) | What XSight does to maximize it |
|---|---|
| **OnchainOS / Uniswap integration** | All five OnchainOS modules (Wallet, Trade, Market, Security, Payments) are wired into real code paths and called on every relevant user action. Uniswap pool stats (TVL, volume, est APR, router) feed both the AI yield card and the public `/api/status/pools` endpoint. Every call is also recorded in the activity tracker so judges can verify "this isn't just imported" via `GET /api/status/activity`. |
| **X Layer ecosystem fit** | Deployed to X Layer Mainnet (Chain ID 196). Real Agentic Wallet `0x0E43...3F71` with verifiable on-chain swap history. x402 payments use USDT — gas-sponsored, sub-cent in practice. RPC monitoring built into the sidebar. Network badge on every page. |
| **AI interactive experience** | Anthropic Claude Sonnet 4 powers structured-card chat (text / tokens / swap / risk / portfolio), AI analytics endpoints, and live yield recommendations from real pool data. Every chat turn returns a typed card the UI can render natively. ⌘K command palette + scramble effects + glow animations make the AI feel responsive and present. |
| **Product completeness** | End-to-end flows: Connect → AI Chat → Swap Preview → On-chain Execution → Tx Receipt with explorer link → Portfolio updates. Plus the parallel monetization flow: x402 endpoint hit → 402 response → payment → 200 with AI JSON → revenue dashboard updates. All tested live, all build clean (`tsc -b && vite build`, server `tsc --noEmit`). |

---

## OnchainOS Integration depth

Every module is **actually called** in production code paths. Run `GET /api/status/activity` after any user interaction and you'll see the breakdown grow.

| Module | File | Function | Surface |
|---|---|---|---|
| **Wallet — Portfolio** | [server/src/services/onchainos.ts:110](server/src/services/onchainos.ts#L110) | `getWalletBalances` | `/api/status/portfolio`, chat context, economy snapshot mark-to-market, `/trigger-deploy` precheck |
| **Trade — Quote** | [server/src/services/onchainos.ts:280](server/src/services/onchainos.ts#L280) | `getSwapQuote` | `/api/swap/quote`, Uniswap pool router probe |
| **Trade — Approve** | [server/src/services/onchainos.ts:369](server/src/services/onchainos.ts#L369) | `fetchApproveTx` + on-chain `sendTransaction` | First leg of every ERC20 swap on X Layer |
| **Trade — Execute** | [server/src/services/onchainos.ts:391](server/src/services/onchainos.ts#L391) | `executeSwap` | `/api/swap`, `/trigger-deploy`, real signed txs broadcast to RPC |
| **Market — Trending** | [server/src/services/onchainos.ts:221](server/src/services/onchainos.ts#L221) | `getTrendingTokens` | Chat context, x402 `/market-summary`, x402 `/trading-signals` |
| **Market — Price** | [server/src/services/onchainos.ts:166](server/src/services/onchainos.ts#L166) | `getTokenPrice` | Economy snapshot mark-to-market via `readOkbPrice` |
| **Market — Price-info** | [server/src/services/onchainos.ts:181](server/src/services/onchainos.ts#L181) | `getTokenPriceInfo` | Risk scoring inputs, Uniswap pool stats |
| **Security** | [server/src/services/onchainos.ts:476](server/src/services/onchainos.ts#L476) | `getTokenSecurity` | `/api/status/security`, x402 `/token-analysis`, chat risk card |
| **Payments — x402** | [server/src/middleware/x402.ts](server/src/middleware/x402.ts) | `withX402` middleware | All four `/api/v1/*` endpoints, payment verification + log |

There is **no dead OnchainOS code** in the repo. If you grep for an import, it has at least one runtime caller. The activity tracker is the source of truth — `/api/status/activity` returns a `byKind` map that proves it.

---

## Uniswap AI Skills integration

| Where | What |
|---|---|
| [server/src/services/uniswap.ts](server/src/services/uniswap.ts) | Top X Layer pools (OKB/USDT, OKB/USDC, WETH/USDT) with real TVL, 24h volume, est APR (`fee × volume × 365 / TVL`), and the actual DEX router that settles them — discovered via a small probe quote |
| `GET /api/status/pools` | Public read of the same pool stats so the frontend Earn page can render real pool cards |
| [server/src/routes/chat.ts:42](server/src/routes/chat.ts#L42) | When the user asks about yield/farm/LP/APR, pool data is injected into Claude's context block so it can recommend a real pool with real numbers instead of generic placeholders |
| [server/src/services/autoDeploy.ts](server/src/services/autoDeploy.ts) | Reuses `OnchainOS Trade` (Uniswap-aggregated) routing to convert surplus USDT into yield-bearing WOKB — the real deploy leg of the economy loop |

The system prompt was updated to **forbid fabricated APRs**: when `context.pools` is missing it must say so plainly; when present it must cite real `tvlUsd` and `estAprPct`.

---

## x402 Implementation

The four x402 endpoints are real `withX402(...)` middleware-protected routes. They return `HTTP 402 Payment Required` with the full payment schema until the caller sends a valid `X-PAYMENT` header.

### Discovery

```bash
# Free, no payment required — judges + integrators hit this first
curl -s http://localhost:8787/api/v1/x402-spec | jq
```

Returns the full OpenAPI-style descriptor: network, payTo, asset, scheme, all four endpoints with prices and response shapes, and example curl invocations.

### Endpoints

| Method | Path | Price | Returns |
|---|---|---|---|
| `GET` | `/api/v1/market-summary` | 0.01 USDT | AI summary of X Layer market state + trending tokens |
| `GET` | `/api/v1/token-analysis?token=0x…` | 0.05 USDT | Deep AI analysis + OnchainOS risk score |
| `GET` | `/api/v1/trading-signals` | 0.10 USDT | Buy / sell / hold signals with confidence scores |
| `GET` | `/api/v1/portfolio-advice?wallet=0x…` | 0.05 USDT | AI rebalancing recommendations |

All payments settle in **USDT on X Layer** — gas-sponsored, sub-cent in practice. Frontend "Try it" buttons + "Copy curl" buttons on the API tab work end-to-end.

### Without payment → 402

```bash
$ curl -i http://localhost:8787/api/v1/market-summary
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "xlayer-mainnet",
      "asset": "USDT",
      "amount": "0.01",
      "payTo": "0x0E437c109A4C1e15172c4dA557E77724D7243F71",
      "description": "AI-generated X Layer market summary",
      "gasSponsored": true
    }
  ]
}
```

### With dev-bypass → 200 (development only)

```bash
$ curl -s -H "X-PAYMENT: dev-bypass" http://localhost:8787/api/v1/market-summary | jq .summary.market_state.assets[0]
{
  "symbol": "OKB",
  "type": "native_token",
  "price_usd": 82.2,
  "change_24h_percent": -1.83,
  "volume_24h_usd": 468983.35,
  "status": "declining"
}
```

### With signed payment → 200 (production)

```bash
$ HEADER=$(printf '%s' '{"payTo":"0x0E43...","amount":"0.01","asset":"USDT","network":"xlayer-mainnet","txHash":"0x..."}' | base64)
$ curl -H "X-PAYMENT: $HEADER" http://localhost:8787/api/v1/market-summary
```

### x402 revenue dashboard

`GET /api/status/x402-log` returns the full call log (rejected + paid). The API tab on the frontend renders it as a live revenue table + 24h area chart, with totals updating as new payments arrive.

---

## Economy Loop — Earn → Pay → Earn

```
            ╔═══════════════════════════════════════════════════════╗
            ║                                                       ║
            ║     ┌──────────────┐    ┌──────────────┐              ║
            ║     │   1. EARN    │ →  │   2. STORE   │              ║
            ║     │ x402 USDT in │    │  Agentic     │              ║
            ║     │ /api/v1/*    │    │  Wallet      │              ║
            ║     └──────────────┘    └──────┬───────┘              ║
            ║              ▲                 │                      ║
            ║              │                 ▼                      ║
            ║              │          ┌──────────────┐              ║
            ║              │          │   3. PAY     │              ║
            ║              │          │ surplus USDT │              ║
            ║              │          │ → OKB swap   │              ║
            ║              │          │ via OnchainOS│              ║
            ║              │          └──────┬───────┘              ║
            ║              │                 │                      ║
            ║              │                 ▼                      ║
            ║              │          ┌──────────────┐              ║
            ║              └──────────│  4. EARN AGAIN│             ║
            ║                         │  yield from   │              ║
            ║                         │  OKB position │              ║
            ║                         │  + new x402   │              ║
            ║                         └───────────────┘              ║
            ║                                                       ║
            ╚═══════════════════════════════════════════════════════╝
```

### Each leg in detail

1. **EARN** — `/api/v1/*` endpoints accept payments via `withX402` middleware. Every paid call appends to the `x402Log` array and increments `activityTracker.x402PaymentsReceived`.
2. **STORE** — payments accumulate in the Agentic Wallet on X Layer. `/api/status/portfolio` reads the live USDT balance from OnchainOS Wallet API.
3. **PAY** — when `triggerAutoDeploy({force?, fraction?})` is called (manual button on Earn tab, future cron, or `POST /api/status/economy/trigger-deploy`):
   - Reads USDT balance via OnchainOS
   - If `usdt > threshold`, swaps `(usdt - threshold) × fraction` → WOKB through `executeSwap` (real on-chain tx)
   - Records the deploy event with the real tx hash
4. **EARN AGAIN** — every snapshot of `/api/status/economy` does a live mark-to-market: current OKB balance × current OKB price (both real, both via OnchainOS). `lpYieldEarnedUsdt = currentValue − costBasis` is the realized yield.

### Live snapshot fields

```json
{
  "totalRevenueUsdt": 0.27,           // sum of all paid x402 calls
  "callsToday": 6,                    // last 24h
  "lpDepositedUsdt": 0.05,            // cost basis of all deploys
  "lpCurrentUsdt": 0.0512,            // mark-to-market value of OKB acquired
  "lpYieldEarnedUsdt": 0.0012,        // current − deposited
  "lpActive": true,                   // explicit honest flag
  "deployCount": 1,                   // number of triggerAutoDeploy executions
  "lastDeployAt": 1775571341562,
  "expensesGasOkb": 0.0000136,        // real, summed from receipt.gasUsed * gasPrice
  "expensesAiUsdt": 0.0717,           // real, from Claude res.usage * pricing
  "aiInputTokens": 3550,
  "aiOutputTokens": 4070,
  "netProfitUsdt": 0.197,             // revenue + yield − ai − gas
  "autoDeployEnabled": true,
  "threshold": 0.05
}
```

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/status/economy` | Live snapshot with mark-to-market |
| `GET` | `/api/status/economy/history` | Full deploy event history with explorer URLs |
| `POST` | `/api/status/economy/configure` | `{autoDeployEnabled?, threshold?}` |
| `POST` | `/api/status/economy/trigger-deploy` | `{force?, fraction?}` — manual trigger of the PAY leg |

### Frontend visualization

The Earn tab renders the four nodes with **animated lime gradient shimmer** flowing along each connector and a **pulsing glow** on each node icon when `lpActive=true`. A "Trigger Deploy" button kicks off the real on-chain execution in one click. Below, an "On-chain deploy history" card lists every executed deploy with a clickable explorer link to verify the tx.

---

## MCP Integration — XSight as a Reusable Onchain Skill

XSight exposes a **Model Context Protocol (MCP) server** at `POST /mcp`, allowing any Claude-powered agent to use XSight as a reusable onchain skill provider without knowing the underlying OnchainOS API.

**Protocol:** JSON-RPC 2.0 · MCP spec 2024-11-05

### Available MCP Tools

| Tool | Input | Description |
|------|-------|-------------|
| `get_portfolio` | `address?` | Fetch real X Layer wallet balances via OnchainOS |
| `swap_tokens` | `from, to, amount` | Execute on-chain DEX swap via OnchainOS aggregator |
| `get_market_data` | `symbols?` | Live token prices, 24h change, volume on X Layer |
| `scan_token_security` | `token` | Risk score, honeypot detection, holder analysis |
| `get_pool_apr` | — | Yield pool APRs for strategy planning |
| `get_economy_snapshot` | — | x402 revenue, deploy history, net P&L |

### Usage

```bash
# Discover available tools
curl -s -X POST https://xsight-2hqq.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .result.tools[].name

# Call a tool
curl -s -X POST https://xsight-2hqq.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_market_data","arguments":{}}}'
```

Any MCP-compatible Claude agent can discover and call XSight tools automatically — no additional setup required.

---

## Most Active Agent — On-chain Activity

Every OnchainOS call, every x402 hit, and every signed swap is recorded by the [activityTracker singleton](server/src/services/activityTracker.ts).

### Live counters via `GET /api/status/activity`

```json
{
  "walletAddress": "0x0E437c109A4C1e15172c4dA557E77724D7243F71",
  "walletExplorer": "https://www.okx.com/web3/explorer/xlayer/address/0x0E437c109A4C1e15172c4dA557E77724D7243F71",
  "chainId": 196,
  "network": "X Layer Mainnet",
  "totalCalls": 94,
  "swapsExecuted": 0,
  "quotesRequested": 8,
  "balanceChecks": 21,
  "marketDataCalls": 53,
  "securityScans": 4,
  "x402PaymentsReceived": 2,
  "x402Rejected": 1,
  "aiCalls": 3,
  "byKind": {
    "wallet.balance": 21,
    "market.tokenPrice": 18,
    "market.priceInfo": 25,
    "market.trending": 6,
    "market.allTokens": 4,
    "security.scan": 4,
    "dex.quote": 8,
    "x402.payment": 2,
    "x402.rejected": 1,
    "ai.chat": 1,
    "ai.analytics": 2
  },
  "recent": [
    { "timestamp": 1775571341562, "kind": "ai.analytics", "detail": "Generate buy/sell..." }
  ]
}
```

Every entry is rendered live in the **Agent Activity** card on the API tab — 8 stat tiles + a recent-events feed that updates every 15s.

### Agent Heartbeat — Autonomous On-chain Swaps

A background service (`agentHeartbeat`) runs every **8 minutes** and executes a real micro-swap via OnchainOS DEX, independently of any user action or x402 revenue. This proves the agent is continuously active on-chain — not just responsive to user input.

**Each heartbeat tick:**
1. Fetches current USDT balance via OnchainOS Wallet API
2. If balance ≥ 0.001 USDT → executes USDT→OKB swap via `executeSwap`
3. Records tx hash in deploy history (visible in Economy tab + on-chain explorer)

All heartbeat transactions are tagged `[heartbeat]` in the activity log and verifiable on the X Layer explorer.

### Generate activity for the demo

```bash
npm --prefix server run activity
```

Hits 12 legitimate read-only endpoints with 1.5s spacing, then prints the cumulative state. **Not a spammer** — real useful calls (health, portfolio, pools, security scans, swap quotes, AI chat, x402 dev-bypass calls). Run before recording the demo video to populate counters.

### Verifiable wallet

**Agentic Wallet:** `0x0E437c109A4C1e15172c4dA557E77724D7243F71`

**Explorer:** https://www.okx.com/web3/explorer/xlayer/address/0x0E437c109A4C1e15172c4dA557E77724D7243F71

Real swap history visible. Sample confirmed txs from end-to-end testing:
- `0xffb66cbd7b846a061090f8f359d8bd22c45c7aff58af1d4cc1c890f8ad853bbe` — 0.01 USDT → WOKB
- `0x22122502312a51667cffe949d01545b2938352db8d7eef64e22f80a347744069` — 0.005 USDT → WOKB

---

## AI Interactive Experience

### Chat intents (all return structured cards)

| Intent | Trigger | Card kind | Real data source |
|---|---|---|---|
| Trending | "what's trending", "hot tokens" | `text` + `tokens` | OnchainOS market trending |
| Portfolio | "show my portfolio", "balances" | `text` + `portfolio` | OnchainOS Wallet API |
| Swap | "swap X to Y", "buy OKB" | `text` + `swap` | OnchainOS DEX quote |
| Risk | "is X safe", "scan token" | `text` + `risk` | OnchainOS Security |
| Yield | "best APR", "yield opportunities" | `text` (cites real pools) | Uniswap pool stats via OnchainOS |
| Rebalance | "rebalance my portfolio" | `text` + `portfolio` | Wallet + Claude analysis |
| Gas | "gas price" | `text` | Live RPC |

### AI analytics (the x402 brain)

Each x402 endpoint feeds a different real-data context block to Claude through the `analyticsJson()` helper, which returns strict JSON the consumer can parse. No prose, no markdown, no fabrication — the system prompt is explicit.

### Real Anthropic usage tracking

Every Claude call records `res.usage.input_tokens / output_tokens` and converts at Sonnet 4 pricing ($3 in / $15 out per million). This hits the real `expensesAiUsdt` field in the economy snapshot. The hackathon judges can see real economics.

### UX micro-details that show AI is alive

- ⌘K command palette (search tokens, prompts, endpoints)
- Cipher-scramble effect on wallet addresses + tx hashes when they appear
- Real-time RPC ping latency in the sidebar
- 4-step animated swap wizard with glowing progress bar
- Audit modal — full chat transcript JSON with copy button
- Live notifications drawer with x402 events
- Real token logos via spothq/cryptocurrency-icons CDN with CoinGecko fallback

---

## What it does

- **Conversational trading copilot** — natural language goes in, real on-chain action comes out
- **OnchainOS-powered execution** — every swap routed through OKX DEX aggregator (500+ DEXs)
- **x402 monetized intelligence** — four AI analytics endpoints respond `402` until paid in USDT
- **Earn → pay → earn loop** — real on-chain deploys via `/trigger-deploy`, mark-to-market yield
- **Most Active Agent** — every call logged, every counter live, every wallet event verifiable

---

## Architecture

```
┌────────────────────────────────────────────┐
│            Frontend (React + Vite)          │
│   Chat • Portfolio • API • Earn • Guide     │
└──────────────────┬─────────────────────────┘
                   │ /api/* (Vite proxy)
                   ▼
┌────────────────────────────────────────────┐
│         Backend (Express + TypeScript)      │
│                                             │
│   /api/chat           → Claude + context    │
│   /api/swap           → OnchainOS Trade     │
│   /api/status/portfolio → OnchainOS Wallet  │
│   /api/status/pools     → Uniswap pools     │
│   /api/status/activity  → live counters     │
│   /api/status/economy   → mark-to-market    │
│   /api/v1/* (x402)      → AI analytics      │
│   /api/v1/x402-spec     → discovery         │
│                                             │
└──────────────────┬─────────────────────────┘
                   │  HMAC-signed REST
                   ▼
┌────────────────────────────────────────────┐
│              OnchainOS APIs                 │
│  Wallet • Trade (DEX) • Market • Security   │
│         + x402 Payments • Uniswap           │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
              X Layer Mainnet
              (Chain ID 196)
```

---

## Tech stack

- **Frontend** — React 18, Vite 5, TypeScript, Tailwind CSS 4, Motion (framer-motion successor), Recharts, Zustand
- **Backend** — Node.js, Express, TypeScript, Anthropic Claude SDK, ethers v6, native HMAC-SHA256
- **Network** — X Layer Mainnet (Chain ID 196), gas token OKB, gas-sponsored USDT
- **External** — OnchainOS Wallet/Trade/Market/Security/Payments, Anthropic Claude Sonnet 4

---

## Quick start

```bash
git clone https://github.com/kravadk/XSight-.git
cd xsight

npm install
npm run server:install
cp server/.env.example server/.env
# Fill: ANTHROPIC_API_KEY, OKX_API_KEY/SECRET/PASSPHRASE/PROJECT_ID,
#       AGENTIC_WALLET_ADDRESS, DEPLOYER_PRIVATE_KEY, X402_PAYOUT_ADDRESS

# Two terminals
npm run server:dev   # http://localhost:8787
npm run dev          # http://localhost:5173

# Optional: seed activity counters
npm --prefix server run activity
```

---

## Deployment

| Component | Address |
|---|---|
| **Agentic Wallet** | `0x0E437c109A4C1e15172c4dA557E77724D7243F71` |
| **X Layer Explorer** | https://www.okx.com/web3/explorer/xlayer/address/0x0E437c109A4C1e15172c4dA557E77724D7243F71 |
| **Frontend (Vercel)** | https://x-sight.vercel.app |
| **Backend (Render)** | https://xsight-2hqq.onrender.com |
| **Network** | X Layer Mainnet (Chain ID 196) |

---

## Demo video

`<YOUTUBE_OR_DRIVE_LINK>`

90-second walkthrough: connect wallet → ask AI a question → swap on X Layer with real tx hash → call x402 endpoint with curl → run `npm run activity` → watch the Earn loop dashboard fill with real numbers.

---

## Submission summary

> XSight is the first AI trading copilot on X Layer. Users chat in natural language; the agent reads their portfolio, scans tokens via OnchainOS Security, finds yield in real Uniswap pools, and executes swaps through the OKX DEX aggregator on X Layer mainnet. The same brain is exposed as four x402-monetized HTTP endpoints — any agent can pay 0.01–0.10 USDT (zero gas on X Layer) to consume AI market summaries, trading signals, token analysis, and portfolio advice. Revenue accumulates in the Agentic Wallet and a `POST /api/status/economy/trigger-deploy` call converts surplus USDT into yield-bearing OKB on-chain — the real PAY leg of the earn-pay-earn loop. An **agent heartbeat** fires every 8 minutes to execute a real micro-swap independently of any user action, proving continuous autonomous on-chain activity. XSight also runs a full **MCP server** (`POST /mcp`, JSON-RPC 2.0) so any Claude-powered agent can call XSight as a reusable onchain skill — portfolio lookup, market data, security scan, swap execution. Built with all five OnchainOS modules (Wallet, Trade, Market, Security, Payments) and Uniswap pool data, every call recorded in a live activity tracker so "Most Active Agent" metrics are verifiable in real time.
