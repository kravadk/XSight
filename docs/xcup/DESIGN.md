# XSight × OKX X Cup — Дизайн, архітектура та план збірки

> Хакатон **OKX X Cup** (World Cup-themed, X Layer, дедлайн 28.05.2026). Версія 2026-05-21.
> Ціль деплою: **тільки X Layer mainnet (chain 196)** — окремої public-testnet фази нема.
> Структура за dApp-чеклистом: концепт → флоу → дані → архітектура → вайрфрейм →
> контракти → фронт → індексація → mainnet → docs.

---

## §0. Концепт (TL;DR)

**XSight — World Cup prediction market на X Layer: real-money parimutuel-пули на
результати футбольних матчів, засетлені власним trustless-оракулом, з AI-пундитом-
суперником і free-to-play воронкою.**

- **Герой** — real-money USDC parimutuel-ринок (не F2P-гра, не CLOB, не AMM).
- **Ядро** — `CupOracleV2`: multi-source · quorum · UMA-style dispute. Ринок тільки
  читає фіналізований результат → виплати un-riggable.
- **F2P-шар** (брекети, ліги, безкоштовні пули) — воронка для грошового ядра.
- **AI-пундит** = автономний Hermes-агент — суперник, автопостить у X.
- World Cup 2026 — герой; движок competition-agnostic.
- **Чому блокчейн, а не звичайний бек:** без trustless-резолюції лідерборд і виплати =
  «повірте нам»; on-chain оракул + parimutuel-контракт роблять результат і гроші
  такими, що їх не може підкрутити навіть оператор. Це передумова, а не прикраса.
- **Non-goals:** CLOB, AMM/LMSR, власний токен, кастодіальний «дім», автономний
  беттінг від імені юзера без підтвердження, окрема public-testnet фаза.

---

## §1. Product Architecture

**Адаптовано під кінцевого юзера-фана. ~70/30 user/dev.**

**Capability-мапа:**
| Група | Спроможність |
|---|---|
| Predict & Stake | переглянути ринки, стейк USDC у бакет, free-пули, брекет ЧС |
| Resolve & Settle | oracle-verified результат, pro-rata виплата, claim, refund при void |
| Compete | глобальний лідерборд, ліги друзів, head-to-head «обіграй AI» |
| Reputation | FanPass SBT — on-chain «футбольний IQ» з точності піків |
| AI Companion | per-match AI-read, автономний AI-пундит-суперник |
| Developer Surface | x402 платний доступ до oracle-даних, MCP-тули, oracle explorer |

**Актори:** Фан (первинний, ~70%) · AI-пундит (наш Hermes, нелюдський «юзер») ·
Дев/AI-агент (майбутня аудиторія, x402/MCP) · Система (бекенд-оператор: інжест,
кворум, propose/finalize, createMarket).

**Value-loop:** фан заходить через free/AI-піки → стейк USDC → матч резолвиться
оракулом → виграш + репутація → лідерборд/ліга → кличе друзів → power-фан.

---

## §2. User Flows + On-chain / Off-chain split

### 2.1 Покрокові юзер-флоу

**Flow A — Перша ставка (cold fan):**
1. Відкрив застосунок → Markets (дефолт).
2. `Connect wallet` (OKX Wallet) → guard мережі → `Switch to X Layer` якщо треба.
3. Браузить ринки → відкриває Market detail.
4. Читає AI-read пундита (conviction + пояснення).
5. Обирає outcome → вводить суму USDC.
6. `Approve USDC` (tx 1) → `Stake` (tx 2) → позиція зʼявляється в My Bets.
7. Матч грає → бекенд інжестить результат → оракул propose → challenge → finalize.
8. `ParimutuelMarket.settle` → My Bets показує `won_claimable`.
9. `Claim` (tx) → USDC на гаманець → FanPass-репутація +.

**Flow B — Free-to-play (no money):** відкрив → (опц. connect) → Free-пул / Bracket →
піки (off-chain, без tx) → матч резолвиться → лідерборд оновився → промпт «спробуй
USDC-пул».

**Flow C — Повернення:** відкрив → My Bets → `Claim` pending-виграші → нові ринки.

**Flow D — AI-пундит (автономно):** Hermes cron → fetch фікстур → ресерч → рішення →
`stake` on-chain зі свого гаманця → пост у X.

**Flow E — Дев/агент:** discover оракул → x402-виклик (платить) → верифікований
результат JSON; або MCP-тул.

**Flow F — Резолюція (система):** матч завершився → інжест результату з 3 джерел →
кворум → `proposeResult` → challenge-window → `finalizeResult` → settle доступний.

### 2.2 On-chain vs Off-chain

| On-chain (X Layer) | Off-chain (backend/DB) |
|---|---|
| USDC-стейк, облік пулу, claim/виплата (`ParimutuelMarket`) | інжест+кеш фікстур |
| propose/challenge/finalize + match-record + evidence-хеші (`CupOracleV2`) | обчислення AI-edge |
| FanPass SBT mint, Bracket NFT mint | free-пули (поінти) |
| — | лідерборд (derive), ліги друзів |
| — | піки/предикшени (record), сирі source-payloads (on-chain лише хеші) |
| — | AI-пундит ресерч, X-постинг |

Правило: **гроші й результат — on-chain**; усе off-chain — кеш/похідне.

---

## §3. Data Model + Source-of-Truth

### 3.1 DB-схема (PostgreSQL; розширює наявні `cup_*` таблиці)
| Таблиця | Ключові поля | Canonical? |
|---|---|---|
| `competitions` | id, name, type(cup\|league), country, season, status, priority | DB |
| `fixtures` | id(matchId), competition_id, home, away, kickoff_utc, status, home_score, away_score, updated_at | DB (кеш «які матчі є») |
| `fixture_sources` | id, fixture_id, source, source_url, fetched_at, raw_payload(jsonb), payload_hash, reported_outcome, reported_score | DB |
| `markets` | id(marketId), fixture_id, match_id(bytes32), close_time, status, winning_outcome, created_at | **on-chain** (DB = кеш) |
| `stakes` | id, market_id, wallet, outcome, amount_usdc, tx_hash, block_number, created_at | **on-chain** (кеш з події) |
| `claims` | id, market_id, wallet, amount_usdc, tx_hash, created_at | **on-chain** (кеш) |
| `free_pools` / `free_picks` | pool: id, fixture_id, status · pick: id, pool_id, wallet, outcome, points, created_at | DB |
| `predictions` | id, wallet, fixture_id, market_id?, outcome, kind(market\|free\|bracket), resolved_correct?, created_at | DB |
| `brackets` | id, wallet, competition_id, picks(jsonb), nft_token_id?, score, created_at | DB (NFT — on-chain) |
| `users` | wallet(pk), display_name, x_handle?, created_at | DB |
| `leagues` / `league_members` | league: id, name, owner_wallet, invite_code · member: league_id, wallet, joined_at | DB |
| `reputation` | wallet, picks_total, picks_correct, accuracy, streak, tier, score, sbt_token_id?, updated_at | DB (бейдж — on-chain) |
| `leaderboard_cache` | wallet, scope(global\|league_id), period, rank, score, accuracy, pnl_usdc, updated_at | DB (derive) |
| `settlement_log` | id, fixture_id, match_id, action(propose\|challenge\|finalize), outcome, source_count, evidence_hash, tx_hash, created_at | DB (кеш) |
| `oracle_matches` | match_id, state, final_outcome, source_hash, evidence_hash, challenge_deadline, updated_at | **on-chain** (кеш) |

### 3.2 Source-of-Truth
- **On-chain canonical** — гроші й результати: `CupOracleV2` (результат),
  `ParimutuelMarket` (пули/виплати), `FanPassSBT`. DB тут — лише кеш/індекс.
- **DB canonical** — off-chain продукт: фікстури-кеш, free-пули, ліги, піки, лідерборд.
- Конфлікт on-chain vs DB → **on-chain перемагає**; DB пере-синкається з подій (індексер).

### 3.3 State-машини
- **Fixture:** `scheduled → live → finished → result_pending → (quorum_met |
  conflicting_sources | quorum_unavailable) → proposed → challenge_window → finalized`.
- **Market:** `created → open → closed(кікоф) → awaiting_settlement → settled →
  claimable` · гілка `→ refund` (void / нема переможців).

---

## §4. System Architecture (+ Indexer)

```
ФРОНТЕНД (React+Vite, src/) ──HTTP──▶ БЕКЕНД (Node/Express, server/)
  wallet · approve+stake · claim          ingestion · quorum · marketService
        │                                 aiEdge · oracle/parimutuel contract svc
        │                                 x402 + MCP · scheduler(cron)
        ▼                                        │ signer txs / reads
ON-CHAIN (X Layer 196)  ◀──────────────── INDEXER (event → DB)
  CupOracleV2 · ParimutuelMarket               слухає Staked/Settled/Claimed/
  FanPassSBT · BracketNFT · USDC               ResultProposed/Finalized
        ▲                                AI-ПУНДИТ (Hermes process, окремо)
        └── x402/MCP ◀── зовнішні агенти   DATA: PostgreSQL · Sports APIs
```

**Backend-модулі (`server/src/`):** `services/cupData`+`cupAdapters` (інжест, є,
розширити) · `services/quorumResolver` (новий) · `services/marketService` (новий) ·
`services/aiEdge` (частково) · `services/cupOracleContract` (є) ·
`services/parimutuelContract` (новий) · `services/indexer` (**новий** — див. нижче) ·
`services/cupPersistence` (є, розширити) · `services/cupReputation`+`fanPassSbt` (є) ·
`services/punditBridge` (новий) · `routes/markets|leaderboard|leagues` (нові) ·
`routes/cup`+`routes/mcp`+`middleware/x402` (є) · `scheduler` cron (новий).

**Indexer (крок 4+8 чеклиста — «без нього dApp сліпий»):** окремий сервіс/воркер,
що через RPC (`getLogs` поллінг по блоках) слухає події `ParimutuelMarket`
(`MarketCreated`, `Staked`, `Settled`, `Claimed`) і `CupOracleV2` (`ResultProposed`,
`ResultChallenged`, `ResultFinalized`) → пише в кеш-таблиці (`stakes`, `claims`,
`markets`, `settlement_log`, `oracle_matches`). На старті — backfill з останнього
synced-блока. **Для хакатона — легкий RPC-поллер, не повний subgraph** (надійніше за
7 днів; subgraph-інфра на X Layer обмежена).

**Frontend (`src/`):** 8 `pages/`, `components/markets|bracket|common|layout`,
`api/client.ts`, `store/` (UI + wallet), `config/` (мережа 196, адреси, ABI).

**Deployment:** Frontend — статик-хостинг · Backend+Indexer+cron — Node-хост ·
AI-пундит — окремий процес (Hermes self-host) · PostgreSQL — Supabase · контракти —
X Layer mainnet · signer-гаманець — hot wallet (OKB на газ).

---

## §5. UX Wireframes (low-fi, mobile-first)

```
[1] MARKETS (дефолт)            [2] MARKET DETAIL
┌────────────────────────┐     ┌────────────────────────┐
│ XSight       [Connect▾]│     │ ‹ Back   🇧🇷 BRA–CRO 🇭🇷│
│ ⚽ Markets              │     │ kickoff 2h14m  pool $1.2k│
│ [WC][MLS][CL][Free][..]│     │ ┌─ AI Pundit read ─────┐│
├────────────────────────┤     │ │ 🤖 "BRA edge — conv  ││
│ 🇧🇷BRA v CRO🇭🇷  ⏱2h14 │     │ │ 0.71. CRO tired."    ││
│ pool $1,240  🤖→BRA    │     │ └──────────────────────┘│
│ [BRA 58%][DR 22%][CRO]│     │ BRA 58% │ DRAW 22%│CRO20%│
├────────────────────────┤     │ [● BRA ][  DRAW ][  CRO ]│
│ 🇦🇷ARG v MEX🇲🇽  ⏱5h   │     │ amount: [ 25 USDC      ]│
│ pool $860    🤖→ARG    │     │ [ Approve ] → [  Stake  ]│
│ [ARG 64%][DR 19%][MEX]│     │ your pos: 25 USDC on BRA │
├────────────────────────┤     │ status: OPEN            │
│ 🆓 USA v CAN  Free pool │     └────────────────────────┘
└────────────────────────┘
 [Markets][Bets][Bracket][⋯]

[3] MY BETS                     [4] BRACKET
┌────────────────────────┐     ┌────────────────────────┐
│ My Bets   P&L: +$42 ▲  │     │ World Cup Bracket       │
├────────────────────────┤     │  R16    QF   SF    F    │
│ BRA–CRO  25u BRA  OPEN │     │ BRA┐                    │
│ ARG–MEX  10u ARG  ⏳pend│     │    ├BRA┐                │
│ USA–CAN  15u USA  ✅+22 │     │ CRO┘   ├ ? ┐            │
│          [ Claim $22 ] │     │ ARG┐   │   │  [winner?] │
│ FRA–GER  20u GER  ❌ -20│     │    ├ARG┘   │            │
├────────────────────────┤     │ ...                     │
│ history ▾              │     │ [Save]  [Mint NFT]      │
└────────────────────────┘     │ you 6/8 · 🤖 7/8        │
                                └────────────────────────┘

[5] LEADERBOARD                 [6] AI PUNDIT
┌────────────────────────┐     ┌────────────────────────┐
│ [Global][My League ▾]  │     │ 🤖 Hermes the Pundit   │
│ ┌ You vs 🤖 Hermes ───┐│     │ record 38W-22L · 63%   │
│ │ You 63% · 🤖 67%    ││     │ ┌ open picks ─────────┐│
│ └────────────────────┘│     │ │ BRA–CRO → BRA (0.71)││
│ #1 0xA1..  71%  +$210 │     │ │ ARG–MEX → ARG (0.66)││
│ #2 🤖Hermes 67% +$180 │     │ └──────────────────────┘│
│ #3 you     63%  +$42  │     │ [Follow]    [Fade]      │
│ #4 0xC3..  60%  +$30  │     │ live X feed ▾           │
│ [Create league][Join] │     │ bracket: 7/8            │
└────────────────────────┘     └────────────────────────┘

[7] FANPASS                     [8] DEVELOPERS
┌────────────────────────┐     ┌────────────────────────┐
│  ◇ FanPass SBT         │     │ Oracle Explorer         │
│  accuracy 63% · Tier 2 │     │ BRA–CRO finalized ✅    │
│  ┌──────────────────┐  │     │  sources 3/3 quorum ✓   │
│  │  [badge art]     │  │     │  evidenceHash 0x9f..    │
│  └──────────────────┘  │     │  [explorer ↗]           │
│  picks 60 · streak 4   │     │ Contracts:              │
│  next tier: 70% (▓▓░)  │     │  CupOracleV2  0xE4..[↗] │
│  [ Mint FanPass ]      │     │  Parimutuel   0x..  [↗] │
│  [ Share card ]        │     │ x402 API · MCP tools    │
└────────────────────────┘     │  GET /v1/cup/result [⎘]│
                                │  [ Try x402 call ]      │
                                └────────────────────────┘
```

---

## §6. Functional Specification (логіка вкладок: стани, кнопки, помилки)

**Глобально:** on-chain-дії вимагають connected wallet + мережа X Layer (196).
Спільні помилки: `wallet_not_connected`, `wrong_network`, `tx_rejected`, `tx_failed`,
`insufficient_OKB_gas`.

- **Markets** — стрічка `status=open`+`closeTime>now`; фільтр ліг; стани loading/list/
  empty/error.
- **Market detail** — AI-read; 3 бакети (пул, implied-odds, AI fair-odds); стейк-панель.
  Стани: `open`·`closed`·`live`·`awaiting_settlement`·`conflicting`(банер)·`settled`·
  `refund`·`claimed`. Кнопки: outcome·сума·`Approve`·`Stake`·`Claim`·`Switch network`.
  Умови стейку: connected+X Layer+`open`+`amount>0`+allowance≥amount. Помилки:
  `insufficient_USDC`·`stake_after_close`·`approve_failed`·`pool_settled`.
- **My Bets** — позиції; стани: `open`·`pending_settlement`·`won_claimable`·
  `won_claimed`·`lost`·`refunded`. Кнопка `Claim`. Помилки: `nothing_to_claim`·`claim_failed`.
- **Bracket** — стани `draft`·`submitted`·`minted`·`locked`·`scoring`. Кнопки `Save`·
  `Mint NFT`. Умови: редаг. до старту турніру; mint — повний брекет. Помилки:
  `bracket_incomplete`·`bracket_locked`·`mint_failed`.
- **Leaderboard** — global/league; кнопки `Create league`·`Join via link`. Помилки:
  `invalid_league_link`·`league_full`.
- **AI Pundit** — профіль, відкриті піки, X-стрічка; `Follow`/`Fade`. Стани `active`·
  `researching`·`offline`(fallback-банер).
- **FanPass** — SBT, точність, тір; `Mint FanPass` (репутація ≥ поріг)·`Share`. Стани
  `not_eligible`·`eligible`·`minted`.
- **Developers** — oracle explorer, контракти, x402/MCP; read-only; чесні стани матчу.

---

## §7. Smart Contracts + Test & Self-Audit

### 7.1 Контракти
- **`CupOracleV2`** *(Є, `0xE4dFef03…`)* — reuse. `registerMatch`·`proposeResult(matchId,
  outcome,evidenceHash,evidenceUri,sourceCount)`·`challengeResult`·`finalizeResult`·
  `getMatch`·`emergencyFinalize`.
- **`ParimutuelMarket`** *(НОВИЙ)*:
  ```
  struct Market{bytes32 matchId;uint64 closeTime;bool settled;
                uint8 winningOutcome;uint256[3] pool;uint256 totalPool;}
  createMarket(marketId,matchId,closeTime)   // onlyOperator
  stake(marketId,outcome,amount)             // USDC in; ts<closeTime
  settle(marketId)                           // anyone; oracle.getMatch() finalized
  claim(marketId)                            // stakeOf[win]*totalPool/pool[win]
  ```
  Edge: `pool[win]==0`/void → refund. Fee `feeBps` 0-1% опц.
- **`FanPassSBT`** *(Є)* — soulbound; mint при репутації ≥ поріг.
- **`BracketNFT`** *(НОВИЙ, stretch)* — ERC-721, метадані еволюціонують.

### 7.2 Тест-план (Hardhat/Foundry, локальний X Layer fork)
`ParimutuelMarket`: createMarket(onlyOperator) · stake до/після closeTime · stake
невалідний outcome · stake без allowance · settle до/після oracle-finalized · claim
переможцем/тим хто програв/refund · pro-rata математика й dust · «нема переможців» →
refund · повторний claim · reentrancy-атака на claim. `CupOracleV2`: propose→challenge
→finalize happy-path + challenge-гілка. **Інтеграційний:** наскрізний
ingest→quorum→propose→finalize→settle→claim на форку.

### 7.3 Self-audit чеклист
☐ ReentrancyGuard на `claim` ☐ checks-effects-interactions ☐ SafeERC20 ☐ USDC 6
decimals — округлення/dust ☐ `createMarket`/`proposeResult` — access control ☐ `settle`
ревертить якщо оракул не `finalized` ☐ жоден адмін не пише `winningOutcome` напряму
☐ `emergencyFinalize` — лише owner, scoped, задокументовано ☐ closeTime-гейт проти
post-kickoff стейку ☐ no-winner / void → refund ☐ double-claim неможливий (zero-out стейку).

---

## §8. Economic Model

- **USDC parimutuel — self-funded.** Нагорода = сам пул: переможці ділять `totalPool`
  pro-rata. **Спонсор для USDC-ринків не потрібен.**
- **Protocol fee** — `feeBps` 0–1% у скарбницю; на хакатон 0% (простіше, чесніше).
- **Free-пули** — поінти, без грошей; «нагорода» = статус, лідерборд, прогрес FanPass;
  опційні moment-NFT топам (sponsor-funded — не обовʼязково).
- **AI-пундит** стейкає реальні (малі) USDC зі свого гаманця — реальний учасник.
- **Газ** — юзер платить OKB (дешево на X Layer); stretch — OKX Gasless спонсорує.
- **Без власного токена** — нуль емісії, нуль волатильності (урок Chiliz/Sorare).
- **Опер-витрати** — OKB для signer-гаманця (propose/finalize/createMarket), Claude API,
  хостинг. Мінімальні. Майбутня монетизація — `feeBps` + x402-доступ до оракула.

---

## §9. Threat Model

| Загроза | Мітигація |
|---|---|
| Компрометація signer-ключа | hot wallet з мінімальним OKB; **не може чіпати USDC у пулі** (виплати лише math-driven `claim`); може лише mis-propose — ловиться challenge-вікном |
| Хибний результат (propose) | propose тільки після кворуму 2-3 джерел; optimistic challenge-window; `emergencyFinalize` — owner-only (задокументований ризик) |
| Конфлікт/відсутність джерел | чесні стани `conflicting_sources`/`quorum_unavailable`, settlement тримається |
| Reentrancy / double-claim | ReentrancyGuard + zero-out стейку + CEI |
| Post-kickoff стейк / front-run | closeTime-гейт; parimutuel — пізній стейк не дає переваги (просто входить у пул) |
| Sybil на free-пулах | free = поінти/статус, нуль грошей → нуль стимулу; FanPass = anti-Sybil для будь-яких нагород |
| Spam-ринки | `createMarket` — onlyOperator |
| USDC-allowance | approve рівно на суму |
| X/API-ключі пундита | секрети лише в env, не в репо |

---

## §10. Competitive Architecture

Кожен компарабл — горизонтальний шар; XSight збирає їх **вертикально** в один продукт.

| Компарабл | XSight бере | Чим різниться |
|---|---|---|
| UMA Optimistic Oracle | propose→challenge→finalize | доменний (футбол) оракул, не generic |
| Chainlink Functions | анкор off-chain даних on-chain | multi-source quorum + evidence-хеші |
| SportsDataIO/SportMonks | агрегація фікстур/результатів | хешує+анкорить, не перепродає сирі дані |
| Azuro | on-chain ставки на спорт | parimutuel (без LP/«дому»), власний оракул |
| Polymarket | споживацький UX ринку | parimutuel не CLOB, WC-themed, X Layer-native, AI-пундит |

**Теза:** один домен (футбол) · один чейн (X Layer) · два споживачі (фани + агенти) ·
одна команда → нуль integration tax → un-riggable end-to-end → демонстрабельно.
Закриває дірку X Layer-екосистеми, яку OKX визнав сам.

---

## §11. Залежності, API, інтеграції

| Категорія | Що | Призначення | Ключ |
|---|---|---|---|
| Спорт-дані | ESPN / football-data.org / TheSportsDB | фікстури+результати (кворум) | ESPN нема; інші — free-ключ |
| Опц. | API-Football / The Odds API | глибші дані / ринкові odds | платно / free |
| Блокчейн | X Layer RPC, OKB, USDC, ethers/viem, solc, Hardhat/Foundry | мережа, контракти, тести | — |
| OKX | Wallet/connect, OnchainOS (skills/MCP), DEX API (опц.), Gasless (stretch) | гаманець, дані, своп, sponsored tx | — |
| AI | Anthropic Claude API | AI-edge, in-app read, Hermes-fallback | ключ, платно |
| AI | Hermes Agent (Nous) | автономний пундит, self-host | MIT |
| Агент-інфра | x402 middleware, MCP server *(є)* | платний API, тули | — |
| Бекенд/фронт | Node/Express, PostgreSQL, React+Vite *(є)* | сервер, БД, UI | — |
| Соц | X (Twitter) API, Telegram Bot API (опц.) | автопостинг, обовʼязковий X-акаунт | ключі |

**Env/secrets:** `DEPLOYER_PRIVATE_KEY`, `X_LAYER_RPC_URL`, `CUP_ORACLE_V2_ADDRESS`,
`PARIMUTUEL_MARKET_ADDRESS`, `USDC_ADDRESS`, `FOOTBALL_DATA_API_KEY`,
`THESPORTSDB_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, x402-конфіг, X-API-ключі,
Hermes-конфіг. Приватний ключ — лише локальний `server/.env`, ніколи в репо/скрінах.

---

## §12. Mainnet & Repo Deliverables

**Рішення «mainnet-only»:** ціль = **X Layer mainnet (196)**, окремої public-testnet
фази нема. De-risk: контракти тримають реальні USDC → перед mainnet —
**локальний fork-тест** (Hardhat/Anvil fork X Layer, повний цикл §7.2) → деплой на
mainnet → **верифікація контрактів на OKX explorer** (обовʼязково — AI-суддя читає
on-chain; unverified = «недороблено») → перші прогони **малими сумами**.

**Mainnet-чеклист:** ☐ деплой `ParimutuelMarket` (+`BracketNFT` якщо встигаємо)
☐ верифікація всіх нових контрактів ☐ `CupOracleV2` — живі (не seeded) фікстури
☐ моніторинг: health-ендпоінт, лог synced-блока індексера, алерт якщо OKB signer-а
низько або `propose` фейлиться.

**GitHub-deliverables:** ☐ публічний repo ☐ README (що це / як запустити / лінк на цей
дизайн) ☐ `.env.example` (усі ключі, без секретів) ☐ LICENSE (MIT) ☐ `/contracts` з
адресами + explorer-лінками ☐ чиста історія комітів.

**Документація + онбординг:** ☐ how-to-use (фан) ☐ як девам інтегруватись (x402/MCP +
reference-агент) ☐ FAQ.

---

## §13. Build Plan (~6 днів, до 28.05)

1. **Д1** — `ParimutuelMarket.sol` + тести на локальному fork; перевірка
   `CupOracleV2.getMatch` сумісності; multi-source ingestion (≥2 джерела) + кворум.
2. **Д2** — деплой `ParimutuelMarket` на **mainnet** + верифікація; market-service +
   `routes/markets`; indexer (події → DB).
3. **Д3** — наскрізний `stake→settle→claim` на 1 лізі з реальним матчем; фронт:
   Markets, Market detail, My Bets, wallet/approve/stake/claim.
4. **Д4** — AI-пундит (Hermes-інстанс або Claude-fallback) + in-app AI-read;
   Leaderboard; FanPass; resolution-cron + challenge-window.
5. **Д5** — Bracket, ліги друзів, share-картки; Developers-вкладка (oracle explorer +
   x402/MCP); OKX Gasless (stretch); поліш UX/станів/помилок.
6. **Д6** — repo (README/`.env.example`/LICENSE), демо-відео, X-акаунт + пости
   (@XLayerOfficial), сабміт через Google Form.

---

## §14. Demo Script (1–3 хв)

| Час | Кадр |
|---|---|
| 0:00–0:15 | Хук: «Перший prediction market на X Layer. Стався на футбол — результат сетлить un-riggable оракул.» |
| 0:15–0:45 | Фан-флоу: connect wallet → відкрити живий ринок → AI-read пундита → stake USDC (показати tx на X Layer explorer). |
| 0:45–1:15 | Оракул: реальний матч резолвиться → multi-source кворим + on-chain finalize → market settle → `Claim` виграшу (tx). |
| 1:15–1:45 | «Обіграй AI»: лідерборд, ти vs Hermes-пундит; FanPass SBT. |
| 1:45–2:10 | Глибина: Developers — verified-контракти на explorer, x402/MCP для агентів. |
| 2:10–2:30 | Клоуз: X Layer · OKX · «WC-трафік → X Layer-юзери й транзакції». |

**Submission-чеклист:** ☐ Google Form до 28.05 23:59 UTC ☐ окремий X-акаунт + тег
@XLayerOfficial + активні пости ☐ демо-відео ☐ лінк на repo ☐ адреси verified-контрактів.

---

## §15. Скоринг · Ризики

**Скоринг:** Innovation — перший prediction market на X Layer + un-riggable
oracle-settlement + AI-пундит ✓ · Market potential — real-money USDC = реальні
транзакції, F2P-воронка = трафік, ліги = низький CAC ✓ · Completion — verified-контракти
on-chain + авто-резолв на живих матчах + демо ✓ · Dual-track — AI-суддя: чистий репо +
verified on-chain; людина: готовий продукт + відео.

**Ризики:** Hermes v0.14.0 → fallback Claude-агент · контракт із коштами → простий
parimutuel + аудит §7.3 + малі суми · нема WC-матчів до 28.05 → competition-agnostic,
демо на інших лігах · скоуп → жорсткі non-goals, BracketNFT/Gasless — stretch.

---

## §16. Історія сесії (стисло)

Page-feedback `SidebarNav` → аналіз аудиторії → еволюція скоупу → відкинуто
infra-позиціонування → brainstorming → 6-трекове меню → ринкове дослідження (4 агенти)
→ концепт F2P AI-гри → мульти-ліга + Hermes → знято «без грошей» → **локнуто:
real-money parimutuel герой** → 5 архітектурних документів → **gap-аналіз проти
13-крокового dApp-чеклиста + вайрфрейми + mainnet-only (цей файл)**.

**Наступний крок:** рев'ю → детальний implementation-breakdown по файлах і задачах → код.
