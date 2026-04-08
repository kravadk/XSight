# XSight — Test Scenarios & Edge Cases

Companion to `TESTING.md`. This file enumerates explicit scenarios and edge cases organized as `Given / When / Then` so you can run each one deterministically and verify behavior.

---

## SECTION 1 — AI Chat scenarios

### S1.1 Happy path: trending intent

- **Given** the backend is up and `ANTHROPIC_API_KEY` + `OKX_*` are configured
- **When** the user types "What's trending on X Layer?" and presses Enter
- **Then** within ~3s a Claude response renders with at least one `text` card and ideally a `tokens` card listing real X Layer symbols (OKB, USDT, USDC, WETH)
- **Verify** `byKind["market.trending"]` in `/api/status/activity` increased by 1; `byKind["ai.chat"]` increased by 1

### S1.2 Yield intent uses real pools

- **Given** the chat is empty
- **When** user sends "Best APR pool on X Layer right now?"
- **Then** AI answer mentions a specific pair (e.g. "OKB/USDT") with a real APR percentage (e.g. "0.93%") and a TVL number (e.g. "$56.5M") taken from `/api/status/pools`
- **Anti-test** AI must NOT make up an APR. If `getTopPools` failed it must say so plainly. Confirm by killing OKX network briefly (e.g. block via firewall) and re-asking.

### S1.3 Risk scan fans out to OnchainOS Security

- **Given** chat is on
- **When** user sends "Is OKB safe?"
- **Then** AI returns text + `risk` card; the card on render fetches `/api/status/security?token=OKB` and renders the real score (0-100) + LOW/MEDIUM/HIGH level
- **Verify** activity `byKind["security.scan"]` increased by 1

### S1.4 Swap intent → preview → execution

- **Given** wallet has ≥0.01 USDT
- **When** user sends "Swap 0.005 USDT to OKB"
- **Then** AI returns `swap` card; clicking **Execute** triggers `POST /api/swap` → real on-chain tx → TxSuccess card with hash
- **Anti-test** if backend `executeSwap` returns 503, the chat shows error card "Swap failed: <reason>" — never silent fail

### S1.5 Empty message rejected

- **Given** input field is empty
- **When** user clicks Send
- **Then** Send button is disabled (cannot fire); programmatically `POST /api/chat` with `{message:""}` returns 400

### S1.6 Cancel mid-typing

- **Given** AI is typing (typing indicator active)
- **When** user clicks any quick-action pill
- **Then** disabled state prevents the click (pills disabled while `typing=true`)

### S1.7 Clear conversation

- **Given** chat has 5+ messages
- **When** user clicks **Clear**
- **Then** all messages are removed, chat returns to empty state with hex grid, suggestion pills

### S1.8 Audit transcript

- **Given** chat has multi-turn conversation
- **When** user clicks **Audit**
- **Then** modal opens with full JSON of `messages` array; "Copy JSON" copies to clipboard; close button works

---

## SECTION 2 — Swap scenarios

### S2.1 Quote happens on every input change

- **Given** SwapWidget is open
- **When** user types or pastes a different amount
- **Then** within ~1s a new quote arrives and the To-amount field updates

### S2.2 Same from === to is rejected

- **Given** from = USDT
- **When** user picks USDT in the To selector
- **Then** Swap button is disabled OR the quote returns an error; clicking Swap shows toast "Pick different tokens"

### S2.3 Insufficient balance

- **Given** wallet has 0.01 USDT
- **When** user sets amount = 100 USDT and clicks Swap
- **Then** backend swap returns an error from OKX/router; UI shows error card with detail

### S2.4 MAX preset

- **Given** wallet USDT balance = 0.027683
- **When** user clicks **MAX**
- **Then** the input becomes `0.027683` exactly (or close to it after string formatting)

### S2.5 Approve + swap two-leg flow

- **Given** the agentic wallet has not approved the OKX router for USDT yet
- **When** user executes a USDT swap
- **Then** backend first sends an `approve` tx, waits for confirmation, then sends the `swap` tx; both gas costs are recorded in `expensesGasOkb`; subsequent swaps skip the approve step

### S2.6 Wizard navigation

- **Given** SwapWizard is open at step 1
- **When** user picks tokens and clicks Continue → enters amount → Continue → reviews preview → clicks Back twice
- **Then** state is preserved across step changes; clicking Cancel from any step closes the modal

### S2.7 Wizard quote arrives at step 3

- **Given** wizard advances to PREVIEW step
- **When** the step renders
- **Then** within ~1s the quote details (rate / route / gas / impact) are populated; "..." until then

### S2.8 Wizard execute

- **Given** wizard is on CONFIRM step with valid quote
- **When** user clicks **Execute swap**
- **Then** wizard closes, switches to Chat, the swap fires through `useSwap.execute`, and TxSuccess appears in chat

---

## SECTION 3 — x402 payment scenarios

### S3.1 First call returns 402 with full schema

```bash
curl -i http://localhost:8787/api/v1/market-summary
```
- **Then** status is 402; body contains `x402Version`, `accepts[0]` with `scheme/network/asset/amount/payTo/description/gasSponsored`

### S3.2 Wrong base64 in X-PAYMENT

```bash
curl -i -H "X-PAYMENT: not-base64" http://localhost:8787/api/v1/market-summary
```
- **Then** still 402, with `error: "invalid_payment_header"`

### S3.3 Wrong network in proof

```bash
HEADER=$(printf '%s' '{"payTo":"0x0E437c109A4C1e15172c4dA557E77724D7243F71","amount":"0.01","asset":"USDT","network":"ethereum"}' | base64)
curl -i -H "X-PAYMENT: $HEADER" http://localhost:8787/api/v1/market-summary
```
- **Then** 402 with `error: "payment_verification_failed"` because network mismatches `xlayer-mainnet`

### S3.4 Underpayment

```bash
HEADER=$(printf '%s' '{"payTo":"0x0E43...","amount":"0.001","asset":"USDT","network":"xlayer-mainnet"}' | base64)
```
- **Then** 402 with `payment_verification_failed` because `paid < required`

### S3.5 dev-bypass works only when NODE_ENV ≠ production

```bash
curl -H "X-PAYMENT: dev-bypass" http://localhost:8787/api/v1/market-summary
```
- **Then** 200 + AI JSON. With `NODE_ENV=production` the same call would treat `dev-bypass` as garbage and return 402.

### S3.6 Response shape verified for each endpoint

- `/market-summary` → `{generatedAt, trending[], summary{}}`
- `/token-analysis?token=0x...` → `{token, risk{}, analysis{}}`
- `/trading-signals` → `{generatedAt, signals[]}`
- `/portfolio-advice?wallet=0x...` → `{wallet, portfolio[], advice{}}`

### S3.7 Missing query param

- `/token-analysis` without `?token=` → 400
- `/portfolio-advice` without `?wallet=` → 400

### S3.8 Public spec is reachable without payment

- `/api/v1/x402-spec` → 200 with full descriptor; useful for integrators

---

## SECTION 4 — Economy loop scenarios

### S4.1 Empty initial state

- **Given** server just started, no swaps performed
- **When** GET `/api/status/economy`
- **Then** `lpActive=false`, `deployCount=0`, `lastDeployAt=0`, `lpDepositedUsdt=0`, `lpYieldEarnedUsdt=0`

### S4.2 First trigger deploy with auto-deploy disabled

- **Given** `autoDeployEnabled=false`
- **When** POST `/api/status/economy/trigger-deploy` with empty body
- **Then** 409 + `{ok:false, reason:"auto-deploy disabled (...)"}`

### S4.3 Trigger with insufficient balance

- **Given** `autoDeployEnabled=true`, threshold = 999999, balance = 0.017 USDT
- **When** POST trigger-deploy
- **Then** 409 + `{ok:false, reason:"USDT balance 0.017000 below threshold 999999"}`

### S4.4 Successful deploy (only run once for the demo!)

- **Given** wallet has > threshold USDT (e.g. 0.05) and auto-deploy enabled
- **When** POST trigger-deploy with default fraction
- **Then** real on-chain swap fires (USDT → WOKB), tx confirms, response is `{ok:true, txHash, fromAmountUsdt, toAmountOkb, explorerUrl}`
- **Then** `/api/status/economy` reflects: `lpActive=true`, `deployCount=1`, `lpDepositedUsdt=fromAmount`, `lpCurrentUsdt = walletOkbBalance × okbPrice`
- **Then** `/api/status/economy/history` returns one entry with explorerUrl

### S4.5 Configure persists threshold

- POST `/api/status/economy/configure` with `{threshold:0.07}`
- GET `/api/status/economy` → `threshold` is `0.07`
- POST again with `{threshold:-1}` (invalid)
- GET → still `0.07` (negative ignored by validator)

### S4.6 Net profit calculation

- After x402 calls + a real swap, GET `/api/status/economy` returns
- `netProfitUsdt = totalRevenueUsdt + lpYieldEarnedUsdt − expensesAiUsdt − (expensesGasOkb × okbPrice)`
- Verify by hand: e.g. `0.27 + 0 − 0.0717 − (0.0000136 × 80) ≈ 0.197` ✓

### S4.7 Snapshot uses live OKB price for mark-to-market

- **Given** a deploy event exists with `toAmountOkb=0.0001`
- **When** OKB price changes (~minute later via OKX market refresh)
- **Then** `lpCurrentUsdt` in the next snapshot reflects the new price

---

## SECTION 5 — Activity tracker scenarios

### S5.1 Counter persists during the session

- **Given** server has been up for some time
- **When** consecutive `/api/status/activity` calls
- **Then** counters only grow (never decrease) until restart

### S5.2 Counter resets on server restart

- **Given** counters are at e.g. 147
- **When** server is killed and restarted (`tsx watch` reloads on file edit)
- **Then** counters drop back to 0 (intentional — in-memory only)

### S5.3 Specific kinds counted correctly

| Action | Expected `byKind` increment |
|---|---|
| GET `/api/status/portfolio` | `wallet.balance += 1` |
| GET `/api/swap/quote` | `dex.quote += 1` |
| Real swap with new approval | `dex.approve += 1`, `dex.swap += 1` |
| Real swap (already approved) | `dex.swap += 1` |
| GET `/api/status/security?token=X` | `security.scan += 1` |
| GET `/api/status/pools` | `market.priceInfo += N` (one per pool) |
| POST `/api/chat` | `ai.chat += 1` + many market/wallet calls |
| Paid x402 hit | `x402.payment += 1` + downstream OnchainOS calls |
| Rejected x402 (no header / bad proof) | `x402.rejected += 1` |

### S5.4 Recent events feed

- **Given** server logged 100+ events
- **When** GET `/api/status/activity`
- **Then** `recent` array contains the last 50 events newest-first; older events drop off

### S5.5 Generate-activity script populates everything

```bash
npm --prefix server run activity
```
- **Then** all 12 steps complete; final activity snapshot shows nonzero in: `balanceChecks`, `quotesRequested`, `securityScans`, `marketDataCalls`, `aiCalls`, `x402PaymentsReceived`

---

## SECTION 6 — Wallet & UI state scenarios

### S6.1 First mount with no wallet

- **Given** browser localStorage is clear
- **When** opening the app
- **Then** TopBar shows **Connect** button; sidebar positions show "No positions"; portfolio stat cards show 0 / —

### S6.2 Demo wallet connect

- **When** clicking Connect → Demo wallet
- **Then** address `0x0000...DEAD` shown in TopBar with scramble effect; toast "Connected (demo)"

### S6.3 MetaMask connect (real)

- **Given** MetaMask installed and unlocked on X Layer
- **When** clicking Connect → MetaMask
- **Then** `eth_requestAccounts` requested; on approval the real address shows in TopBar with scramble; toast success

### S6.4 MetaMask not installed

- **Given** no `window.ethereum`
- **When** clicking Connect → MetaMask
- **Then** toast error "MetaMask not detected"; modal stays open

### S6.5 Disconnect

- **Given** connected
- **When** clicking Disconnect
- **Then** address cleared from TopBar; "Connect" button reappears; toast "Disconnected"

### S6.6 Backend goes offline mid-session

- **Given** Vite + Backend both running, app loaded
- **When** kill the backend
- **Then** within 30s the next poll fails; sidebar status dot turns grey; "Next sync 00:00"; subsequent stat cards show stale values (last successful poll); toasts may show errors

### S6.7 Backend comes back online

- **When** restart backend
- **Then** within 30s the next poll succeeds; status dot turns lime+pulse again; counters/balances refresh

---

## SECTION 7 — Cross-tab state propagation

### S7.1 Trigger Deploy on Earn → Activity card on API tab

- **Given** API tab is open in another browser tab/window
- **When** triggering a deploy on Earn
- **Then** within 15s the API tab's ActivityCard `swapsExecuted` increments

### S7.2 Real swap from Chat → Earn deploy history

- **Given** a swap is performed via Chat (regular swap, not trigger-deploy)
- **When** Earn tab is opened
- **Then** the swap does NOT appear in deploy history (only triggerAutoDeploy records there)
- **But** activity counters DO show the swap (`dex.swap += 1`)

### S7.3 Theme + state survive tab switch

- **Given** user toggles a setting on Earn tab
- **When** switching to Chat and back
- **Then** the local UI state is preserved (selected sub-tab, scroll position depends on browser)

---

## SECTION 8 — UI input validation

### S8.1 Threshold input

- Accepts: `0.05`, `100`, `0`
- Rejects (toast / validation): `-1`, `abc`, empty
- Rounds reasonably for display

### S8.2 SwapWidget amount

- Allows decimal: `0.005`, `100`
- Strips non-numeric: `12abc` becomes `12`
- Multi-dot guard: `1.2.3` becomes `1.23`

### S8.3 Try-it endpoint cards

- For `/token-analysis`, the sample query auto-fills with a real OKB token address
- For `/portfolio-advice`, the sample query auto-fills with the agentic wallet address
- For others, no query needed

---

## SECTION 9 — Error visibility (anti-silent-fail)

For each of these, an error must be visible to the user (toast, error card, or red status). Silent failures are bugs.

| Failure | Where visible |
|---|---|
| Backend offline | Sidebar grey dot, blank sync countdown, toast on next poll attempt |
| OKX API rate limit | Error card "OnchainOS unavailable: ..." in chat or toast in widget |
| Anthropic 5xx | Error card "Connection error: AI service unavailable" in chat |
| Swap signer not configured | Error card "Signer unavailable: DEPLOYER_PRIVATE_KEY missing" |
| Tx reverted on chain | Error card "approve transaction failed: 0x..." or "swap..." |
| QR generation failed | "QR error" placeholder in modal |
| Token logo CDN blocked | TokenIcon falls back to letter circle (graceful, not an error) |
| Real spot price feed blocked | TokenCard shows "—" instead of price |
| Trigger deploy with no surplus | Toast with the exact reason |
| Configure with invalid threshold | Toast "Threshold must be a positive number" |

---

## SECTION 10 — Performance expectations

| Operation | Expected p50 / p99 |
|---|---|
| Sidebar status update | < 50ms (local) |
| `/api/status/health` | < 30ms |
| `/api/status/portfolio` (cached) | < 50ms |
| `/api/status/portfolio` (cold) | < 1500ms |
| `/api/swap/quote` | 200-1000ms |
| `/api/chat` (Anthropic Sonnet 4) | 1-5s |
| `/api/v1/*` x402 endpoints | 1-6s (Claude analyticsJson is the slow leg) |
| `/api/swap` (real on-chain) | 5-20s (approve + swap + receipt) |
| First page paint (vite dev) | < 1s |
| Build (tsc + vite) | < 5s |

---

## SECTION 11 — Demo recording checklist

Before hitting "record":

- [ ] `npm run test:health` is green
- [ ] `npm run test:api` is 45/45
- [ ] Wallet has ≥ 0.05 USDT (so trigger-deploy can succeed live)
- [ ] Cleared chat (`Clear` button) so empty state shows
- [ ] Browser DevTools closed
- [ ] Toaster is empty
- [ ] Run `npm --prefix server run activity` 30 seconds before recording so counters are non-zero
- [ ] Have https://www.okx.com/web3/explorer/xlayer/address/0x0E437c109A4C1e15172c4dA557E77724D7243F71 open in another tab to show real wallet history

---

## SECTION 12 — Submission verification

Before submitting:

- [ ] README.md "Deployment" section has the deployed Vercel + Railway URLs filled in
- [ ] README.md "Demo video" link is filled in
- [ ] `git status` is clean
- [ ] Last commit message references the hackathon
- [ ] `.env` is gitignored (never committed)
- [ ] `server/.env.example` is up-to-date with all required variables
