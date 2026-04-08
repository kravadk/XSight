# XSight — Manual Test Checklist

Exhaustive walkthrough of every tab, button, input, state and edge case. Use this together with the automated test suite (`npm run test:api`) and the health-check (`npm run test:health`).

## How to use

1. Start both processes: `npm run server:dev` (terminal 1) + `npm run dev` (terminal 2)
2. Run smoke test: `npm run test:health` — should be all green
3. Run API test suite: `npm run test:api` — should pass 45/45
4. Open `http://localhost:5173/` and walk through each section below
5. Tick boxes as you verify each item

---

## Pre-flight

- [ ] `npm run test:health` exits 0
- [ ] `npm run test:api` exits 0 (45/45)
- [ ] Browser console is clean (open DevTools, no red errors on load)
- [ ] Network tab shows successful `/api/status/portfolio`, `/api/status/x402-log`, `/api/status/economy` polled every 30s

---

## A. Layout & Sidebar

### A.1 Sidebar logo (top-left)

- [ ] Click "XSight" logo → routes to **Portfolio** tab
- [ ] Beta badge is visible

### A.2 Sidebar navigation groups

- [ ] **TRADING** group label is uppercase, dim
  - [ ] **Portfolio** — clicking activates the lime left bar + light bg
  - [ ] **AI Chat** — has a pulsing lime dot (live indicator)
- [ ] **EARN** group label
  - [ ] **x402 API** — clicking opens the API tab
  - [ ] **Auto-Yield** — clicking opens the Earn tab
- [ ] **DOCS** group label
  - [ ] **Guide** — clicking opens the Guide tab
  - [ ] **Build** — clicking opens the Build tab
- [ ] Active state shows the lime accent bar on the left edge of the active item only

### A.3 Active positions list (sidebar middle)

- [ ] Lists up to 5 tokens sorted by USD value (descending)
- [ ] Each row shows the real token icon (image, not letter circle, for known tokens like OKB/USDT)
- [ ] Hovering a row highlights it
- [ ] Clicking a row navigates to **Portfolio** tab
- [ ] If wallet has 0 tokens → shows "No positions"

### A.4 Boost Earnings card (sidebar bottom-ish)

- [ ] Has a Sparkles icon, "Boost Earnings" title, "Auto-deploy yield loop" subtitle
- [ ] Hover shows a lime gradient
- [ ] Clicking navigates to **Earn** tab

### A.5 Sidebar status bar (bottom of sidebar)

- [ ] Shows a colored dot: lime+pulse when both backend and RPC are online; grey when offline
- [ ] Shows network name (e.g. "X Layer Mainnet")
- [ ] Latency in ms (color-coded: green < 200, amber 200-600, red > 600)
- [ ] Block number `#XX,XXX,XXX` updates every ~10 seconds (real RPC ping)
- [ ] Countdown "Next sync 00:23" decrements every second; resets after the 30s poll fires

---

## B. TopBar

### B.1 Search button

- [ ] "Search..." pill is visible (md+)
- [ ] Shows ⌘K hint
- [ ] Clicking opens the **Command Palette** modal (see section L)

### B.2 Notification bell

- [ ] Shows a lime badge with unread count when there are unread notifications
- [ ] Clicking opens a right-side drawer
- [ ] Drawer shows the latest notifications (newest first)
- [ ] Empty state shows "No notifications yet"
- [ ] Each notification has icon (success/info/error/event), title, body, time
- [ ] Unread items have a lime dot indicator
- [ ] Clicking an item marks it read (dot disappears)
- [ ] "Mark all read" button (CheckCheck icon) — clears the badge
- [ ] "Clear" button (X icon) — empties the drawer
- [ ] Close button (X) — closes the drawer

### B.3 Connect / Disconnect button

**State: not connected**
- [ ] "Connect" button is visible with the wallet icon
- [ ] Hover → magnetic effect (button drifts toward cursor)
- [ ] Click → modal appears with two options:
  - [ ] **MetaMask** — if installed, requests `eth_requestAccounts`; on success closes modal and shows the address in TopBar with cipher-scramble effect
  - [ ] **Demo wallet** — connects with a placeholder address; closes modal
- [ ] Cancel link closes modal without action
- [ ] Backdrop click closes modal

**State: connected**
- [ ] Address shows with cipher-scramble effect on first render
- [ ] USD balance displayed next to address
- [ ] "Disconnect" button visible
- [ ] Click Disconnect → toast "Disconnected", state resets

### B.4 Network badge

- [ ] Shows network name with a pulsing lime dot (`X Layer Mainnet`)

---

## C. Portfolio tab

### C.1 Sub-tabs (Overview / Holdings / History / Yield)

- [ ] Active sub-tab has lime background, others are dim grey
- [ ] Clicking switches the visible content immediately

### C.2 Portfolio Actions Bar (top right)

- [ ] **Receive** button → opens modal:
  - [ ] Shows a real QR code rendering the wallet address
  - [ ] Address text is shown with cipher-scramble effect
  - [ ] **Copy address** copies and shows toast "Address copied"
  - [ ] **Explorer** opens X Layer explorer in new tab
  - [ ] X / backdrop closes the modal
- [ ] **Deposit** → same modal + extra "Open X Layer Bridge ↗" link
- [ ] **Send** → switches to Chat tab and prefills "I want to send 50 USDT to another wallet"
- [ ] **More** → dropdown with:
  - [ ] **Refresh data** — spinning icon during fetch, toast "Portfolio refreshed"
  - [ ] **View on explorer** — opens explorer in new tab
  - [ ] **Copy address** — toast "Address copied"

### C.3 Compound Advantage banner

- [ ] Shows lime Zap icon
- [ ] "XSight Edge" title + "Why automated trading pays" subtitle
- [ ] Three numeric columns: **Baseline / With XSight / Edge** — all real values from `/api/status/economy`
- [ ] Numbers animate with CountUp on first render

### C.4 Stat cards row (4 cards)

- [ ] **Total Value** — real `$X.XX` from wallet balance
- [ ] **Holdings** — count of tokens
- [ ] **LP Yield** — `$X.XX` (or 0 if no deploy yet)
- [ ] **API Calls 24h** — count
- [ ] Each card has uppercase micro-label, big tabular number, hint, lime/colored progress bar with glow
- [ ] Loading skeletons appear briefly on first mount before backend responds

### C.5 Top Holdings (Asset Charts)

- [ ] Title "Top Holdings" + asset count badge
- [ ] **Timeframe pills (24H/12H/6H)** — clicking actually changes how many bars in the sparkline
- [ ] **Filters dropdown** — opens a panel with "Hide dust (< $1)" toggle:
  - [ ] Toggling actually filters the displayed tokens and the count badge updates
  - [ ] Filter count badge appears next to "Filters" when active
- [ ] Two TokenSpotlight cards rendered for the top 2 holdings
- [ ] Each card has real TokenIcon (image), name, X Layer label, position value, share %, amount, sparkline
- [ ] Sparkline is real (revenue cumulative series, not random)
- [ ] Top-right ↗ link opens explorer

### C.6 Allocation donut (Overview / Holdings sub-tabs)

- [ ] Donut chart renders with one slice per held token
- [ ] Center shows "TVL" label + animated USD value
- [ ] Legend below lists each token: bullet color, TokenIcon, symbol, %, USD
- [ ] Empty state if no holdings: "No allocations yet"

### C.7 Transaction Summary (Overview)

- [ ] Title "x402 Activity" + "24H" badge
- [ ] **Total earned** with AnimatedNumber
- [ ] **Calls 24h** count
- [ ] Real cumulative sparkline below
- [ ] "Quiet/Active/Peak" intensity dots in footer

### C.8 Holdings sub-tab

- [ ] Header shows "Holdings", token count, **CSV export** button
- [ ] CSV export downloads a `xsight-holdings-YYYY-MM-DD.csv` file, toast "Holdings exported"
- [ ] Sortable columns: Token / Amount / USD Value (clicking header toggles direction)
- [ ] Each row: TokenIcon, symbol, formatted amount, formatted USD
- [ ] Empty state with "Connect wallet" + "Try AI swap" CTAs
- [ ] Loading shows 5 skeleton rows

### C.9 History sub-tab

- [ ] Title "Recent activity" + CSV export button
- [ ] If recentCalls is empty: empty state with "Open AI Chat" CTA
- [ ] Each row: endpoint, timestamp, paid/rejected badge, amount + asset
- [ ] CSV export downloads `xsight-activity-YYYY-MM-DD.csv`

### C.10 Yield sub-tab

- [ ] Stat cards row (same as overview but inside this layout)
- [ ] SwapWidget on the right side

---

## D. Swap Widget (Portfolio / Yield)

### D.1 Selectors

- [ ] **From token** dropdown — clicking opens a list of supported tokens (USDT/OKB/WETH/USDC); each row has TokenIcon
- [ ] **To token** dropdown — same
- [ ] **Flip** button (↕) swaps from/to

### D.2 Amount input

- [ ] Numeric input — only digits allowed
- [ ] If wallet has the from-token: shows balance + 25% / 50% / MAX preset pills
  - [ ] Click 25% → input becomes 25% of balance
  - [ ] Click MAX → input becomes 100% of balance
  - [ ] Decimal precision is sane (no `1.00000000000001`)

### D.3 Live quote

- [ ] As you change amount or tokens, the To-amount field shows the live OKX-DEX quote
- [ ] Rate text below shows `Rate: X` while quoting → real value once arrived
- [ ] If from === to → shows "—" and Swap button is disabled

### D.4 Swap button

- [ ] Disabled when amount is 0 or empty
- [ ] Disabled while submitting
- [ ] Click → switches to Chat tab + executes swap via backend
- [ ] On success → TxPending card → TxSuccess card with real tx hash + explorer link
- [ ] On failure → error card with detail message

### D.5 Advanced (multi-step wizard)

- [ ] "Advanced" button (top-right of widget) opens the SwapWizard modal
- [ ] Wizard has 4 numbered steps (PAIR / AMOUNT / PREVIEW / CONFIRM)
- [ ] Top progress bar fills with lime + glow as you advance
- [ ] **Step 1 PAIR**: from + to selectors with TokenIcons; flip button between
- [ ] **Step 2 AMOUNT**: large numeric input + preset pills 25/50/100/500
- [ ] **Step 3 PREVIEW**: from→to row, real quote details (rate, route, gas, price impact)
- [ ] **Step 4 CONFIRM**: lime-tinted summary block; "Execute swap" button
- [ ] **← Back** at any step
- [ ] **Cancel** at step 1 closes
- [ ] **Continue** disabled until valid input on each step

---

## E. AI Chat tab

### E.1 Empty state

- [ ] Subtle hex grid background overlay
- [ ] Sparkles icon + "XSight AI Copilot" headline + description
- [ ] Status row: "Connected to backend · ⌘K for command palette"
- [ ] Three suggestion pills: Swap / Scan / Yield — clicking each sends the corresponding prompt

### E.2 Chat input

- [ ] Quick-action pills above input: Trending / Portfolio / Best yield / Trade / Scan token / Gas — clicking sends real message
- [ ] Pills scroll horizontally on small screens, no wrap
- [ ] Input accepts text
- [ ] Placeholder reads "Ask XSight anything..."
- [ ] Enter key sends
- [ ] Send button (lime) sends; disabled when empty or while typing
- [ ] After send → user message appears in bubble + typing indicator (3 pulsing dots)
- [ ] AI response appears as a structured card

### E.3 Cards rendered for each intent

| Prompt | Expected cards |
|---|---|
| "What's trending?" | text + tokens (with TokenIcons) |
| "Show portfolio" | text + portfolio (real balances) |
| "Swap 50 USDT to OKB" | text + swap preview |
| "Is OKB safe?" | text + risk |
| "Best APR pool?" | text (cites real pool TVL + APR from `/api/status/pools`) |
| "Gas price" | text |
| garbage like "asdf" | text fallback |

### E.4 Token card (in chat)

- [ ] Real TokenIcon
- [ ] Real price (CoinGecko) + 24h change pill (green if +, red if −)
- [ ] Sparkline color matches direction
- [ ] Real balance + USD value (if held)
- [ ] **Buy** button — sends "Swap 50 USDT to <token>"
- [ ] **Details** — sends "Tell me more about <token>"
- [ ] **Risk** — sends "Risk scan <token>"

### E.5 Swap preview card

- [ ] Shows Pay / Receive boxes with token + amount
- [ ] Rate, network info
- [ ] **Cancel** button — replaces card with "Swap cancelled"
- [ ] **Execute Swap** — runs the real swap on-chain
- [ ] During exec → button text changes to "Submitting..." and is disabled

### E.6 Tx pending → Tx success flow

- [ ] After Execute → TxPending card appears (loader, from→to summary)
- [ ] After confirmation → TxSuccess card replaces it
- [ ] Tx hash renders with cipher-scramble effect on first appearance
- [ ] Explorer link works (opens X Layer in new tab)

### E.7 Risk card

- [ ] Real TokenIcon
- [ ] "Risk Scan: SYMBOL" header
- [ ] Color-coded shield icon (LOW/MEDIUM/HIGH)
- [ ] Real risk score + level
- [ ] Warnings list (if any)
- [ ] Verdict block with real OnchainOS data
- [ ] Buy button → triggers swap intent

### E.8 Portfolio card (chat)

- [ ] Real total USD with AnimatedNumber
- [ ] Holdings list with TokenIcons
- [ ] Advice block with AI text
- [ ] **Rebalance** button → sends "Rebalance my portfolio"

### E.9 Audit + Clear toolbar

- [ ] When messages exist, top-right shows **Audit** + **Clear** buttons
- [ ] **Audit** opens modal with full JSON transcript of session
  - [ ] "Copy JSON" button copies to clipboard
  - [ ] Local-only note in footer
  - [ ] Close button closes
- [ ] **Clear** removes all messages from store; chat returns to empty state

---

## F. x402 API tab

### F.1 Hero section

- [ ] Title "XSight x402 API"
- [ ] Description text
- [ ] **⚡ Zero gas USDT on X Layer** badge (green)
- [ ] **Powered by Claude + OnchainOS** badge (purple)
- [ ] **/v1/x402-spec ↗** link (lime) — opens the public spec JSON in a new tab
- [ ] BASE_URL pill with copy button (toast on copy)
- [ ] **Active** badge top-right

### F.2 Stat cards (4)

- [ ] Total Revenue (real $)
- [ ] Calls 24h (count)
- [ ] Recent Calls (count)
- [ ] Endpoints (4)
- [ ] All have icon, micro label, big number, hint, progress bar

### F.3 Activity card

- [ ] Title "Agent Activity" + lime activity icon
- [ ] **Wallet → Explorer** link top-right opens X Layer explorer
- [ ] 8 stat tiles: total / swaps / quotes / balance / market / security / x402 / ai
- [ ] Each tile: micro label + animated number (colored)
- [ ] Recent events list below: kind (lime mono) + timestamp (right)
- [ ] Auto-refreshes every 15s

### F.4 Revenue chart

- [ ] 24h area chart with lime gradient
- [ ] X axis shows hour buckets
- [ ] Tooltip on hover shows the value

### F.5 Endpoint cards (4)

For each (`/market-summary`, `/token-analysis`, `/trading-signals`, `/portfolio-advice`):

- [ ] Method badge (GET green/POST blue)
- [ ] Path code text
- [ ] Price tag in lime
- [ ] Description text
- [ ] **Try it →** button:
  - [ ] Click opens a TerminalLog inside the card
  - [ ] Shows the full URL with sample query params (for token-analysis and portfolio-advice)
  - [ ] Shows `> X-PAYMENT: dev-bypass` line
  - [ ] Then the response status, latency, and JSON body
- [ ] **Copy curl** button:
  - [ ] Toast "Copied curl"
  - [ ] Pasted command actually works in shell

### F.6 Recent calls table

- [ ] If empty → empty state with Activity icon
- [ ] If non-empty → table with Time / Endpoint / Caller / Amount / Status
- [ ] Status has paid (green) / rejected (red) badges
- [ ] **CSV export** button downloads `xsight-x402-calls-YYYY-MM-DD.csv`

---

## G. Earn tab

### G.1 Yield Loop banner

- [ ] Title "Automated Yield Loop" + RefreshCw icon
- [ ] **Trigger Deploy** button (lime, top-right)
  - [ ] Click → calls `POST /api/status/economy/trigger-deploy`
  - [ ] If `autoDeployEnabled=false` or balance below threshold → toast with the reason
  - [ ] If successful → toast "Deployed X.XXXX USDT → Y.YYYY OKB"
  - [ ] On success the deploy history and snapshot refresh
- [ ] 4 nodes with icons (Terminal/Wallet/Coins/Sparkles): x402 Revenue / Agent Wallet / Auto-Deploy / Yield
- [ ] Each node has live data (real $ values, counts, status)
- [ ] When `lpActive=true` → nodes have a pulsing lime glow and animated lime gradient flowing along the connectors
- [ ] When `lpActive=false` → static, "no position yet" subtitle on Yield node

### G.2 Deploy history card

- [ ] Only renders when `deploys.length > 0`
- [ ] Lists each deploy: amount in/out, timestamp, **TX ↗** link to explorer
- [ ] Click TX → opens X Layer explorer in new tab

### G.3 LP Position card

- [ ] If `lpActive=false` → shows "No position yet" message + "Auto-deploy is armed/disabled" hint
- [ ] If `lpActive=true` → shows Deposited / Current Value bars with real values
- [ ] APR shows `—` when no position, real `X.X%` when active
- [ ] **Withdraw** → switches to Chat with "Withdraw my OKB/USDT LP position"
- [ ] **Add More** → switches to Chat with "Add 100 USDT of liquidity..."

### G.4 Auto-Deploy Settings card

- [ ] **Refresh** icon (top-right) — pulls fresh `/api/status/economy`, shows toast
- [ ] **Auto-Compound toggle** — clicking flips state (just local until Save)
- [ ] **Threshold input** — accepts a number, shows "USDT" suffix
- [ ] **Save Configuration** button (lime):
  - [ ] Validates threshold ≥ 0
  - [ ] Calls `POST /api/status/economy/configure` with both fields
  - [ ] Toast "Auto-deploy configuration saved"
  - [ ] Refreshes economy snapshot

### G.5 Revenue Breakdown row (4 stat cards)

- [ ] Revenue ($USDT, lime green)
- [ ] Gas (OKB, grey)
- [ ] AI cost ($, purple)
- [ ] Net Profit ($, lime)
- [ ] All animate with CountUp; values come from real `/api/status/economy`

---

## H. Guide tab

- [ ] Top progress bar (scroll progress within current article) fills as you scroll the content panel
- [ ] Sidebar TOC on the left (lg+):
  - [ ] **Search docs...** input filters articles by title and body content
  - [ ] 5 collapsible sections: Getting Started / Trading via AI / x402 API / Auto-Yield Loop / FAQ
  - [ ] Each section header has an icon, uppercase title, chevron (rotates when expanded)
  - [ ] Click section header → expand/collapse
  - [ ] Click an article title → loads that article in the content panel + highlights the active item with lime border
- [ ] Content panel (right):
  - [ ] Renders selected article title (extrabold) + body paragraphs
  - [ ] Switching articles resets scroll to top
  - [ ] Empty search returns "No article matches your search"
- [ ] All 16 articles load and render correctly

---

## I. Build tab

### I.1 Hero

- [ ] Title "Build with XSight"
- [ ] Description
- [ ] BASE_URL code pill

### I.2 Endpoint reference table (left column)

- [ ] Header "Endpoint Reference" + Database icon
- [ ] Table with Method / Path / Price columns for all 4 x402 endpoints
- [ ] Method badges color-coded (GET blue, POST green)
- [ ] Hover row → subtle background

### I.3 On-chain contracts list (left column)

- [ ] 3 contract cards: OnchainOS Router / OKB / USDT
- [ ] Each shows name, description, address (truncated)
- [ ] **Copy** icon → copies full address, toast "Address copied"
- [ ] **External link** icon → opens X Layer explorer

### I.4 Code examples (right column)

- [ ] 5 CodeBlocks: curl / fetch / viem / python / express webhook
- [ ] Each block has language tag (top-left) + Copy button (top-right)
- [ ] Click Copy → check icon + toast "Copied to clipboard"; reverts after 2s
- [ ] All snippets use `X-PAYMENT: dev-bypass` (not the old wrong header)

---

## J. Bottom Tab Bar (mobile, < md width)

- [ ] Visible only on mobile width (resize browser to < 768px)
- [ ] 4 tabs: Portfolio / Chat / API / Earn
- [ ] Active tab is lime, others grey
- [ ] Clicking switches the page

---

## K. Toasts

- [ ] Toasts appear bottom-right
- [ ] Animate in (slide from right) and out
- [ ] Auto-dismiss after 3.5s
- [ ] X button dismisses immediately
- [ ] Three kinds: success (green check) / error (red triangle) / info (lime info)

---

## L. Command Palette (⌘K / Ctrl+K)

### L.1 Open/close

- [ ] Press ⌘K (or Ctrl+K) → modal opens with backdrop blur
- [ ] Click TopBar Search button → same effect
- [ ] Press Esc → closes
- [ ] Click backdrop → closes

### L.2 Search

- [ ] Auto-focuses input
- [ ] Typing filters across groups in real-time
- [ ] Empty results show "No matches"

### L.3 Groups + actions

- [ ] **Navigate** group: Portfolio / AI Chat / x402 API / Earn
  - [ ] Each item: clicking switches to that tab and closes palette
- [ ] **Your tokens** group: lists each held token with balance, "Analyze X"
  - [ ] Clicking switches to Chat and sends "Tell me more about X"
- [ ] **AI prompts** group: from QUICK_ACTIONS
  - [ ] Clicking switches to Chat and sends the prompt
- [ ] **API endpoints** group: from X402_ENDPOINTS
  - [ ] Clicking switches to API tab

### L.4 Keyboard nav

- [ ] ↓ / ↑ moves highlighted item
- [ ] Enter activates highlighted
- [ ] Highlight has lime accent + arrow on right

---

## M. Backend dependencies & expected error states

| Action | Hard dependency | If missing → user sees |
|---|---|---|
| Open any tab | Backend `/api/status/health` | Sidebar status dot turns grey, "0:00" countdown, blank stat cards |
| AI Chat send | `ANTHROPIC_API_KEY` | Error card "Connection error: AI service not configured" |
| Swap quote | `OKX_API_KEY/SECRET/PASSPHRASE/PROJECT_ID` | "OnchainOS unavailable" error in toast / card |
| Swap execute | `DEPLOYER_PRIVATE_KEY` matching `AGENTIC_WALLET_ADDRESS` | "Signer unavailable" error |
| Trigger Deploy | `autoDeployEnabled=true` AND USDT balance ≥ threshold | Toast with the specific reason |
| Risk scan | OnchainOS Security API reachable | "Security data unavailable" message |
| x402 endpoints | `X402_PAYOUT_ADDRESS` configured | Backend startup OK; no payments accepted otherwise |
| Real RPC ping | RPC `https://rpc.xlayer.tech` reachable | Sidebar latency shows red, no block number |
| Token logos | jsDelivr + CoinGecko CDNs reachable | Falls back to colored letter circles |
| Live token price (TokenCard) | CoinGecko/CryptoCompare reachable | "—" shown instead of price |

---

## N. Logical dependency map

```
                     ┌─────────────────┐
                     │  npm run dev    │
                     │  (vite :5173)   │
                     └────────┬────────┘
                              │  /api/* proxy
                              ▼
                     ┌─────────────────┐
                     │ npm run server  │
                     │  (express :8787)│
                     └────────┬────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
  ┌─────────┐           ┌──────────┐          ┌──────────┐
  │ OnchainOS│           │ Anthropic│          │ X Layer  │
  │ (OKX API)│           │ (Claude) │          │ RPC      │
  └─────────┘           └──────────┘          └──────────┘
       │                      │                      │
   wallet/                  chat/                ethers
   trade/                   analytics            sendTransaction
   market/                                       gas tracking
   security/
       │
       ▼
  ┌────────────────┐
  │ activityTracker│ ← every call increments counters
  └────────────────┘
       │
       ▼
  ┌──────────┐    ┌──────────┐    ┌──────────────┐
  │ x402 log │    │ economy  │    │ /api/status/ │
  │          │    │ snapshot │    │ activity     │
  └──────────┘    └──────────┘    └──────────────┘
       ▲                ▲                  ▲
       │                │                  │
       └────────────────┴──────────────────┘
                        │
                Polled by useBackendSync (30s)
                        │
                        ▼
                Frontend stores (apiStore, walletStore, syncStore)
                        │
                        ▼
                React components (live re-render)
```

### N.1 Important transitive dependencies

- **Connect Wallet → Holdings table render**: requires `useBackendSync` to have completed at least one `/api/status/portfolio` poll
- **Trigger Deploy → Earn loop animation lights up**: requires `lpActive=true` which only flips after a successful deploy event is recorded
- **Yield chat intent → real pool data in answer**: requires `getTopPools()` to have succeeded; check `byKind["market.priceInfo"]` is increasing in `/api/status/activity`
- **API tab Try-it → terminal log shows JSON**: requires `X-PAYMENT: dev-bypass` header (NOT `x-dev-bypass: 1` — the old wrong header would return 402)
- **Activity counters bump → frontend ActivityCard updates**: 15s polling interval, may need to wait that long after triggering

---

## O. Run the demo flow (≈ 90 seconds)

This is the recommended order for a recording:

1. `npm run test:health` — show all green
2. Open `http://localhost:5173/`, sit on Portfolio
3. Show CompoundAdvantage banner + stat cards + Top Holdings + Allocation donut
4. Click **Receive** → show QR + address with scramble effect → close
5. Switch to **AI Chat**, send "What's the best APR pool on X Layer?"
6. AI responds citing real pool TVL + APR — point at the numbers
7. Send "Swap 0.005 USDT to OKB" → SwapPreview card appears → click **Execute**
8. Watch TxPending → TxSuccess; click the explorer link to prove it's real
9. Switch to **Earn** tab → click **Trigger Deploy** → show new event in deploy history
10. Switch to **API** tab → click **Try it** on `/market-summary` → terminal log shows real Claude response
11. Run `npm --prefix server run activity` in a side terminal — show counters incrementing on the API tab

---

## P. Known transient issues

- **OKX rate limit**: rapid sequential calls (e.g. running tests + a chat at the same time) can cause `503` upstream. The test suite uses retry-on-503 (4 attempts, 500ms backoff). UI shows the toast detail.
- **Token logos**: spothq/cryptocurrency-icons doesn't have OKB or WETH; both use CoinGecko fallback. WBTC/BTC/USDT/USDC/ETH use spothq.
- **In-memory state**: x402 log, activity counters, and economy expense counters reset when the server restarts. Use persistent storage if you need cross-restart accumulation.

---

## Q. After full pass

If every box is ticked and `npm run test:api` is 45/45 green and one real on-chain swap is in the deploy history, the project is demo-ready and submission-ready for the OKX Build X Hackathon X Layer Arena (with all three special prize tracks: Best x402, Best Economy Loop, Most Active Agent).
