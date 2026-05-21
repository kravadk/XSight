# X Cup — Build Worklog

A chronological record of the X Cup build session (chat + work history).
Branch `main` · 2026-05-21 → 2026-05-22 · agent: Claude Opus 4.7.

> Scope of this log: the autonomous build from the **test rework** through **opening
> markets on-chain** (commits `edfb242` → `cdbfc86`). Plan-1 contract substrate
> (`0de4a48`…`d550977`) predates it; commits after `cdbfc86` (pundit executor, free
> pools, leaderboard, leagues, bracket NFT) are later work, noted at the end.

---

## The brief

Continue the XSight × OKX X Cup build under a hard directive:
**NO MOCKS, NO LOCAL STAND-INS — product and tests use only real components.**
Mainnet-only (X Layer chain 196); mainnet deploy is a user-gated action.
Build, plan-by-plan: oracle pipeline → market backend + indexer → frontend → AI pundit.

---

## Phase 0 — Contract test layer reworked to no-mocks fork tests

Deleted `contracts/test/Mocks.sol`. Rebuilt `ParimutuelMarket.test.cjs` as **23 tests
against a forked X Layer mainnet** — the real `CupOracleV2`, real USDT + USDC. Test
accounts funded by Foundry-style `deal` (storage-slot probing — no whale dependency).
Kept one crafted contract: `exploit/ReentrancyAttacker.sol` — an exploit harness, since
a re-entrancy attack can only originate from the settlement token.
`ParimutuelMarket` made **token-agnostic** (`usdc` → `token`). Hardhat config given a
chain-196 hardfork history.
*Decision:* user chose USDT **+** USDC support; reentrancy test kept for security.
→ `edfb242`, `db58700` · verified: 23/23 pass.

## Plan 2 — Oracle resolution pipeline

`services/quorumResolver.ts` — idempotent orchestrator driven by real on-chain state:
a finished, 2-of-N-quorum match flows `register → propose → (challenge window) →
finalize` on `CupOracleV2`. `cupScheduler.ts` periodic pass (off by default).
`registerCupOracleMatch` + `readCupChallengeWindow` added.
*Safety:* autonomous on-chain writes double-gated (`CUP_WRITE_API_ENABLED` +
default-off `CUP_RESOLVER_ENABLED`).
→ `55a893d` · verified: typecheck + dry-run, zero txs.

## Plan 3 — Market backend + event indexer

`parimutuelContract.ts` (ABI, reads, operator writes, unsigned stake/claim calldata),
`marketIndexer.ts` (RPC `getLogs` poller, in-memory mirror + DB cache),
`marketStore.ts` (DB cache), `marketService.ts` (fixtures ⋈ on-chain state),
`routes/markets.ts`.
*Bug found & fixed:* `encodeBytes32String` overflowed on real match ids → replaced with
length-safe keccak encoding (`utils/cupIds.ts`), shared by oracle + market.
→ `cc13871`, `8167e3a` · verified: `test:market` lists 104 real World Cup 2026 fixtures.

## Plan 4 — Frontend (8 screens, World Cup design)

Reworked the React app into the X Cup prediction market. **Dark stadium / night-match**
theme (floodlit-pitch green + champion gold, `Anton` display font). Real OKX Wallet
connect (EIP-1193, X Layer network guard, `sendTx`). 8 screens — Markets, Market detail
(approve→stake), My Bets (claim), Bracket, Leaderboard, AI Pundit, FanPass, Developers —
each on real backend data. Real team flags via a FIFA→ISO map.
→ `e52881d` · verified: `tsc` + `vite build` clean, screenshot confirmed.

## Plan 5 — AI Pundit (Hermes) + deliverables

`punditService.ts` — Hermes, a Claude-backed pundit: reads a fixture + the heuristic
edge, returns a conviction-weighted verdict; honest `heuristic` fallback with no API key.
Deliverables: `LICENSE` (MIT), `README.md` (X Cup rewrite), `docs/xcup/CONTRACTS.md`.
→ `aac37ea`, `06d192b` · verified: real Claude verdicts.

## One app, two surfaces

On user request, unified XSight + X Cup under one app with a **ProductSwitch**
(XSight copilot ⇄ X Cup market); both navs restored; default opens on X Cup.
→ `c2a3d62`, `865fc80`.

## Repository

Committed the project substrate, merged `feat/xcup-prediction-market` → `main`, pushed
to **https://github.com/kravadk/XSight** (renamed from `XSight-`, `main` set default).
→ `31f6589`.

## Mainnet deploy (user-gated — executed on confirmation)

Pre-flight: signer `0x82736f84…` funded, write API enabled. `FanPassSBT` was already
deployed. Deployed **`ParimutuelMarket`** → `0xdB4F6A0CC67B3dF1f25129079E3f45b996A4B9D7`
(settles in USDT, deploy block 60609636, tx `0x05815fc4…`). Verified on-chain:
`token()` = USDT. Wrote addresses into `server/.env`.
*Bug found & fixed:* X Layer's public RPC caps `eth_getLogs` at 100 blocks; the indexer
default was 2000 → fixed (default 90, clamp ≤100).
→ `deaec53` · verified: indexer backfills and tracks the head cleanly.

## Onboarding docs + markets opened

`docs/xcup/GUIDE.md` — fan how-to-use, developer integration, FAQ (DESIGN §12 deliverable).
Opened **16 `ParimutuelMarket` markets on-chain** for the opening World Cup fixtures
(MEX v RSA … IRN v NZL) via a new `ensure:markets` operator script — the indexer picked
up all 16 `MarketCreated` events; `/api/markets` reports them `open`, staking live.
→ `878c74d`, `cdbfc86`.

---

## Deployed contracts — X Layer mainnet (chain 196)

| Contract | Address |
|---|---|
| `CupOracleV2` | `0xE4dFef03E107225f2239CFfF955a378A9a8158Be` |
| `ParimutuelMarket` | `0xdB4F6A0CC67B3dF1f25129079E3f45b996A4B9D7` (USDT) |
| `FanPassSBT` | `0x74F75532428A99E613a865C97D1084b7f38241BD` |

## Key decisions

- **No mocks** — tests run on a real fork; pre-deploy UI shows honest
  `contract_not_deployed` states, never fabricated pools.
- **Token-agnostic market** — `ParimutuelMarket` settles in any ERC20; the deployed
  instance uses USDT (matches the repo's x402 asset).
- **Length-safe ids** — keccak match-id encoding shared by oracle + market.
- **Double-gated autonomy** — resolver / market-creation writes are off by default.
- **One project** — XSight copilot and X Cup share one app via a product switch.

## Outcome at end of this session

All 5 plans built, verified, committed. Three contracts live on X Layer mainnet.
16 markets open for staking. Repo public with README / LICENSE / CONTRACTS / GUIDE.
Remaining (user-only): explorer verification, demo video, submission X account,
Google Form.

## Build continued after this session

Commits after `cdbfc86` extended the project further — pundit on-chain executor,
free-to-play pools, leaderboard, private leagues, and a bracket NFT. Those are outside
this worklog's scope; see `git log` and the per-feature plan docs.
