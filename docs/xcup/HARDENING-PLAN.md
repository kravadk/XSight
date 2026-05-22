# X Cup — детальний план зміцнення логіки та продукту

> Доповнення до `docs/xcup/CONTRACTS.md` / `DESIGN.md`. Глибокий розбір архітектури
> лідерів ринку + покроковий план виправлення всіх прогалин і доведення X Cup до
> «нормального» продукту. Складено на основі офіційних docs/GitHub: UMA, Polymarket,
> Azuro, Overtime/Thales, Kleros (ERC-792), Chainlink Functions.

## Статус виконання

- **Фаза 1 — ✅ зроблено** (`9d14aaf`): `SETTLEMENT-RULES.md` v1, чесне формулювання
  оракула в `README`/`GUIDE`/`DESIGN`, `rulesHash` комітиться на rulebook.
- **Фаза 2-3 — ✅ зроблено** (`320f786`): `CupOracleV3.sol` (bonds + slash + flag/
  timelock) і `ArbiterMultisig.sol` (2-of-3, `ICupArbiter`). Закриває G1/G2/G3/G4/G6.
- **Фаза 6 (тести) — ✅ зроблено** (`d1d80e7`): 19 fork-тестів проти X Layer mainnet
  з реальним USDT — усі зелені.
- **Фаза 4 + 6 (деплой-скрипт) — ✅ зроблено** (`31a5958`): `deploy-cup-oracle-v3.ts`
  + version-aware бекенд (V3 ABI, bonded write-path).
- **Деплой у mainnet — ⏳ user-gated** (рішення Розділ 5: 50 USDT bond, 0% fee, 1 год
  вікно, Chainlink — стретч). Потрібні адреси 3 підписантів `ArbiterMultisig`.
- **Фаза 5 (dust G7, minStake) — ⏳ на обговорення** (див. Розділ 3 Фаза 5).

---

## Розділ 1. Як це зроблено в лідерів (архітектурний дайджест)

### 1.1 UMA Optimistic Oracle V3 — еталон «оптимістичного» сетлменту

Контракт `OptimisticOracleV3`. Ключова функція:
```solidity
assertTruth(bytes claim, address asserter, address callbackRecipient,
            address escalationManager, uint64 liveness, IERC20 currency,
            uint256 bond, bytes32 identifier, bytes32 domainId) → bytes32 assertionId
```
- **Bond.** Asserter вносить `bond` (мінімум = `finalFee * 1e18 / burnedBondPercentage`,
  типово ≈ 2× finalFee). Disputer на `disputeAssertion` вносить рівний bond.
- **Liveness.** Вікно оскарження; якщо ніхто не оскаржив — `settleAssertion` робить
  результат `true`, asserter забирає bond назад.
- **Економіка спору** (`burnedBondPercentage` = 50%): переможець отримує **свій bond +
  50% bond програвшого**; інші 50% bond програвшого — протокольна комісія (Store).
  Тобто брехати коштує весь bond.
- **Ескалація.** Спір іде в DVM (голосування власників UMA-токена) або в кастомний
  `escalationManager` (можна повністю замінити арбітраж).
- **Callbacks.** `assertionResolvedCallback(id, assertedTruthfully)` і
  `assertionDisputedCallback(id)` — контракт-споживач реагує на резолв/спір.

**Висновок для нас:** UMA **не задеплоєна на X Layer (196)** — інтегрувати її напряму
не можна. Тому ми **відтворюємо її патерн** у власному `CupOracleV3`: bonds + liveness
+ slash + pluggable-арбітр замість DVM.

### 1.2 Polymarket — `UmaCtfAdapter` + `UmaSportsOracle`

- `initialize(ancillaryData, rewardToken, reward, proposalBond, liveness)` → готує
  питання, робить `requestPrice` в Optimistic Oracle.
- **Перший спір** → callback `priceDisputed` авто-**ресетить** питання й робить новий
  запит (ще один оптимістичний раунд). **Другий спір** → ескалація в DVM.
- `resolve()` → `settleAndGetPrice` → `_constructPayouts(price)` → `ctf.reportPayouts`.
  Ціна `0` / `0.5e18` / `1e18` → масив виплат.
- **Адмін-запобіжник:** `flag()` ставить `manualResolutionTimestamp = now + SAFETY_PERIOD`
  (1 год), і лише після нього `resolveManually(payouts)`. Тобто навіть ручний
  фолбек має таймлок — не миттєвий бекдор.
- Спортивний варіант (`UmaSportsOracle`, ідентифікатор `MULTIPLE_VALUES`) пакує
  `homeScore`/`awayScore` у `price`; стани гри: `Created/Settled/Canceled/Paused/
  EmergencySettled`.

**Висновок для нас:** замінити наш миттєвий `emergencyFinalize` на патерн
`flag()` + таймлок + `resolveManually()`. «Reset-on-first-dispute» — опційно.

### 1.3 Azuro v2 — `Core / LP / LiquidityTree`

- `createCondition(gameId, conditionId, odds[], outcomes[], reinforcement, margin,
  winningOutcomesCount, …)`; ставка — **ERC721 NFT** на кожен bet.
- У кожної `Condition` є власна адреса `oracle`; `resolveCondition` може викликати
  **лише цей oracle**, і не раніше ніж `gameEnd + 1 min`.
- LP — спільний пул, `LiquidityTree` (сегментне дерево) рахує частку кожного LP за
  O(log n).

**Висновок для нас:** ми **не** беремо AMM/LP — pari-mutuel не має хауса. Але беремо
ідею **per-match `oracle` + таймаут `gameEnd + buffer`** перед резолвом.

### 1.4 Overtime / Thales — Sports AMM v2

- Результати з **Chainlink** (`fulfillGamesResolved` callback): `result` 0/1/2/3
  (Home/Away/Draw/Canceled). `Canceled` → повернення колатералу 1:1.
- LP-пул 7-денними раундами — контрагент; `SportAMMRiskManager` — ліміти ризику на
  гру; `resolveMarketManually` у менеджера.

**Висновок для нас:** Chainlink Functions як **майбутнє джерело** результату (Фаза 5,
опційно). Ризик-менеджер нам не потрібен (pari-mutuel без хауса).

### 1.5 Kleros / ERC-792 — стандарт підключуваного арбітра

```solidity
interface IArbitrator {
  function createDispute(uint choices, bytes extraData) payable returns (uint disputeID);
  function arbitrationCost(bytes extraData) view returns (uint);
  function currentRuling(uint disputeID) view returns (uint);
}
interface IArbitrable { function rule(uint disputeID, uint ruling) external; }
```
Контракт-арбітрабл створює спір, арбітр повертає `rule(disputeID, ruling)`.

**Висновок для нас:** стан `Challenged` має вести в **`IArbitrator`-сумісний арбітр**.
Для хакатону — простий `ArbiterMultisig` (2-of-3), але з тим самим інтерфейсом, щоб
згодом замінити на Kleros-подібний суд без зміни оракула.

### 1.6 Chainlink Functions — request/fulfill

`FunctionsClient._sendRequest(data, subId, gasLimit, donId)` →
`fulfillRequest(requestId, response, err)`. JS-код на DON ходить у спорт-API,
повертає результат on-chain. Латентність 10-30 с, вартість ~0.2-0.5 LINK/запит.

### 1.7 Канонічний on-chain pari-mutuel

Пул на кожен результат; `open → close → settle → claim`; комісія з тоталу;
`payout = userBet * (totalPool − fee) / winnerPool`; кейс «немає переможців» →
рефанд. Пастки: **rounding dust** (цілочисельне ділення лишає пил), last-claimer,
reentrancy, ділення на нуль. **Наш `ParimutuelMarket` уже відповідає цьому
канону** — guard, claimed-flag, refund на no-winner. Лишається тільки dust.

---

## Розділ 2. Прогалини X Cup → рішення (мапа)

| # | Прогалина | Рішення (фаза) |
|---|---|---|
| G1 | Оракул без бондів — propose/challenge безкоштовні | `CupOracleV3` з bonds + slash (Фаза 2) |
| G2 | `Challenged` — глухий кут | Pluggable `IArbitrator` + `ArbiterMultisig` (Фаза 3) |
| G3 | Кворум лише off-chain, `sourceCount` не валідується | Пропозер бондить `sourceHash`/`sourceCount`; брехня → slash (Фаза 2) |
| G4 | `emergencyFinalize` — миттєвий бекдор | `flag()` + таймлок + `resolveManually()` + multisig-owner (Фаза 2/4) |
| G5 | Немає опублікованого rulebook | `docs/xcup/SETTLEMENT-RULES.md` (Фаза 1) |
| G6 | Вікно оскарження пасивне | Винагорода челенджеру з slash-частки (Фаза 2) |
| G7 | Rounding dust у `claim()` | Sweep пилу в treasury (Фаза 4) |

---

## Розділ 3. Детальний план — по пунктах

### Фаза 1 — Rulebook + чесне формулювання (без редеплою; години)

1. Створити `docs/xcup/SETTLEMENT-RULES.md` з правилами граничних випадків:
   1. Основний час + додатковий час + серія пенальті **зараховуються** у фінальний
      результат нокаут-матчу.
   2. Скасований/перенесений матч, не зіграний у визначений строк → `voidMarket` →
      повний рефанд (LFMP-логіки не вводимо — для pari-mutuel рефанд чесніший).
   3. Перерваний матч до завершення → `voidMarket` → рефанд.
   4. VAR / спірні рішення судді → діє **офіційний фінальний результат** (FIFA).
   5. Джерело істини й пріоритет: official → ESPN → football-data → TheSportsDB.
2. `rulesHash` у `registerMatch` має комітитись на `keccak256` цього файлу
   (зафіксувати версію правил у коді резолвера).
3. Оновити `README` / `GUIDE` / `DESIGN`: описувати оракул точно — «оптимістичний
   мульти-джерельний, результат пропонує оператор, захищений вікном оскарження» —
   доки не зроблено Фазу 2; залінкувати rulebook.
4. Резолвер логує per-source receipts + атестований `sourceHash` для кожного
   `proposeResult`, віддає на `GET /api/cup/settlement-log`.

### Фаза 2 — `CupOracleV3`: оптимістичний оракул з економічною безпекою

Новий контракт `contracts/CupOracleV3.sol`. Дизайн (повний ескіз — Розділ 4):

5. **Стани:** `Open → Proposed → (Challenged) → Finalized`.
6. **`proposeResult`** стає **bonded**: стягує `bondAmount` (ERC20, USDT) з пропозера;
   зберігає `sourceHash`/`evidenceHash`/`evidenceUri`/`sourceCount`; ставить
   `challengeEndsAt = now + challengeWindow`. Permissionless (будь-хто з бондом).
7. **`challengeResult`** стягує рівний `bondAmount` з челенджера; стан → `Challenged`;
   фіксує `challenger`. Дозволено лише доки `now < challengeEndsAt`.
8. **`finalizeResult`** (немає спору, `now ≥ challengeEndsAt`): стан → `Finalized`,
   `finalOutcome = proposedOutcome`, **bond пропозера повертається повністю**
   (неоскаржено — комісії немає).
9. **`resolveChallenge(matchId, rulingOutcome)`** — викликає **лише `arbiter`**:
   - якщо `rulingOutcome == proposedOutcome` → пропозер правий: отримує
     `proposerBond + challengerBond − protocolFee`; `finalOutcome = proposedOutcome`.
   - інакше → челенджер правий: отримує `challengerBond + proposerBond − protocolFee`;
     `finalOutcome = rulingOutcome`.
   - `protocolFee = loserBond * protocolFeeBps / 10000` → у `treasury`.
   - стан → `Finalized`.
10. **Економіка (G1, G6):** брехливий пропоуз коштує весь bond; чесний челендж
    приносить bond програвшого мінус комісія — вікно оскарження стає **активним**.
11. **`bondAmount` / `challengeWindow` / `protocolFeeBps`** — `immutable`, у конструкторі.
12. **Прибрати миттєвий `emergencyFinalize` (G4).** Замінити на патерн Polymarket:
    `flag(matchId)` ставить `manualResolveAt = now + SAFETY_PERIOD`; `resolveManually`
    дозволено лише після `manualResolveAt` і лише `owner` (далі — multisig, Фаза 4).
13. **Інтерфейс читання `getMatch(bytes32)` лишити сумісним** з V2 (ті самі поля
    `finalOutcome`/`state`), щоб `ParimutuelMarket` не змінювати логічно.
14. Події: `ResultProposed`, `ResultChallenged`, `ChallengeResolved`, `ResultFinalized`,
    `MatchFlagged`, `BondSlashed` — для індексера й аудиту.

### Фаза 3 — Pluggable-арбітр для стану `Challenged` (G2)

15. Інтерфейс `ICupArbiter` у стилі ERC-792:
    `requestRuling(bytes32 matchId, uint8 proposedOutcome) → uint disputeId` і
    зворотний виклик в оракул `resolveChallenge`.
16. `contracts/ArbiterMultisig.sol` — реалізація: 2-of-3 підписанти голосують за
    `rulingOutcome`, по досягненні кворуму викликають `oracle.resolveChallenge`.
17. `arbiter` в оракулі — змінна (`setArbiter` onlyOwner за таймлоком), щоб згодом
    замінити мультисиг на Kleros-сумісний суд без редеплою оракула.
18. Документувати SLA: арбітр виносить рішення за ≤ 72 год; інакше — описаний
    fallback (рефанд ринку через `voidMarket`).

### Фаза 4 — Інтеграція V3 (backend + новий ринок)

19. `ParimutuelMarket.oracle` — `immutable`: новий оракул ⇒ **новий деплой
    `ParimutuelMarket`**, націлений на `CupOracleV3`. Існуючі 16 ринків на старому
    оракулі — `voidMarket` + рефанд (реальних ставок ще немає, втрат немає),
    перестворити на новому.
20. `server/src/services/cupOracleContract.ts` — додати ABI V3 + крок `postBond`
    (approve `bondToken` перед `proposeResult`).
21. `server/src/services/quorumResolver.ts` — перед `proposeResult` робити
    approve+bond; новий стан кроку `wait_arbiter` для `Challenged`.
22. `env`: `CUP_ORACLE_BOND_TOKEN`, `CUP_ORACLE_BOND_AMOUNT`, `CUP_ARBITER_ADDRESS`.
23. `marketService` / `marketIndexer` — без логічних змін (читають `getMatch`),
    лише нові адреси в `.env`.
24. **Constrain owner (G4):** перевести `owner` `CupOracleV3` + `ParimutuelMarket` на
    `ArbiterMultisig`/окремий 2-of-3 мультисиг.

### Фаза 5 — Доведення продукту й логіки

25. **Dust sweep (G7):** у `ParimutuelMarket` додати `sweepDust(marketId)` — після
    того як усі claim зроблено, залишковий пил з цілочисельного ділення йде в
    `treasury` (або донат у наступний пул). Або — роздати +1 wei першим N
    переможцям. Зафіксувати в тестах.
26. **Мін. ставка + буфер закриття:** `minStake` (антипил-спам) і закриття ставок за
    `closeBuffer` до kickoff, не точно в kickoff.
27. **Моніторинг:** `GET /api/cup/health` — synced-блок індексера, к-ть `Proposed`
    без `finalize`, к-ть `Challenged`; лог-алерт якщо `Challenged > 0`.
28. **(Опційно) Chainlink Functions** як 4-те джерело результату в кворумі — за
    патерном `_sendRequest`/`fulfillRequest`, JS ходить у FIFA/ESPN API. Підвищує
    довіру, але потребує LINK і деплою Functions-консьюмера; для хакатону — стретч.
29. **(Опційно) Reset-on-first-dispute** як у Polymarket: перший спір не йде одразу
    в арбітра, а дає ще один оптимістичний раунд. Менше навантаження на арбітра.

### Фаза 6 — Тести, деплой, верифікація

30. `contracts/test/CupOracleV3.test.cjs` — fork-тести проти X Layer mainnet (наявний
    no-mocks harness): propose-with-bond, challenge-with-bond, finalize-no-dispute
    (bond повертається), `resolveChallenge` обидва результати (slash коректний),
    `flag`+таймлок, доступ `arbiter`.
31. `contracts/test/ParimutuelMarket` — переконатися, що новий ринок резолвиться
    проти `CupOracleV3.getMatch` без змін; додати тест на `sweepDust`.
32. Деплой `CupOracleV3` + новий `ParimutuelMarket` + `ArbiterMultisig` у mainnet
    (user-gated, реальний газ OKB) через наявний патерн `deploy-*` скриптів.
33. Верифікація всіх трьох на explorer (single file, solc `v0.8.35`, optimizer 200).
34. Оновити `CONTRACTS.md` / `BUILD-STATUS.md` / `WORKLOG.md` новими адресами.

---

## Розділ 4. `CupOracleV3` — ескіз контракту

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICupArbiter {
  function requestRuling(bytes32 matchId, uint8 proposedOutcome) external returns (uint256);
}

contract CupOracleV3 {
  enum State { Open, Proposed, Challenged, Finalized }   // 0..3 — сумісно з V2

  struct MatchRecord {
    bytes32 matchId; bytes32 rulesHash; bytes32 sourceHash; bytes32 evidenceHash;
    string  evidenceUri;
    uint8   sourceCount; uint8 proposedOutcome; uint8 finalOutcome; uint8 state;
    address proposer; address challenger;
    uint64  challengeEndsAt; uint64 updatedAt; uint64 manualResolveAt;
    uint256 proposerBond; uint256 challengerBond; uint256 disputeId;
  }

  IERC20  public immutable bondToken;        // USDT на X Layer
  uint256 public immutable bondAmount;
  uint64  public immutable challengeWindow;  // напр. 3600
  uint16  public immutable protocolFeeBps;   // напр. 500 = 5% slash-частки
  uint64  public immutable safetyPeriod;     // таймлок для resolveManually
  address public owner;                      // → multisig
  address public arbiter;                    // ICupArbiter; змінний за таймлоком
  address public treasury;

  function registerMatch(bytes32 id, bytes32 rulesHash, bytes32 sourceHash,
      bytes32 evidenceHash, string calldata uri) external onlyOwner;          // Open

  function proposeResult(bytes32 id, uint8 outcome, bytes32 sourceHash,
      bytes32 evidenceHash, string calldata uri, uint8 sourceCount) external; // +bond → Proposed

  function challengeResult(bytes32 id) external;          // +bond → Challenged, arbiter.requestRuling
  function finalizeResult(bytes32 id) external;           // no-dispute → Finalized, bond назад
  function resolveChallenge(bytes32 id, uint8 ruling) external onlyArbiter;   // slash → Finalized
  function flag(bytes32 id) external onlyOwner;           // manualResolveAt = now + safetyPeriod
  function resolveManually(bytes32 id, uint8 outcome) external onlyOwner;     // тільки після таймлоку
  function setArbiter(address a) external onlyOwner;      // за таймлоком

  function getMatch(bytes32 id) external view returns (MatchRecord memory);   // сумісно з V2
}
```
Економіка `resolveChallenge`: `winnerBond + loserBond − fee` переможцю; `fee` у
`treasury`; події `ChallengeResolved`/`BondSlashed`.

---

## Розділ 5. Рішення, які треба підтвердити перед виконанням

1. **Bond-токен і розмір.** USDT (як токен ринку)? Сума bond — фіксована (напр. 50
   USDT) чи % від пулу? Рекомендація: фіксована, помірна (доступно чесному
   резолверу, відчутно для брехуна).
2. **Арбітр.** `ArbiterMultisig` 2-of-3 на хакатон (швидко, чесно) — підтвердити
   склад підписантів. Kleros-сумісний суд — як майбутнє.
3. **Чи робити редеплой зараз.** Фаза 2-4 = новий `CupOracleV3` + новий
   `ParimutuelMarket` у mainnet. Альтернатива до дедлайну: Фаза 1 (rulebook + чесні
   docs) зараз, Фази 2-6 — після.
4. **`protocolFeeBps`** на slash-частку — 0% (усе переможцю, максимальний стимул
   челенджити) чи ~5% у treasury.
5. **Chainlink Functions** (Фаза 5 п.28) — у скоупі чи стретч.

---

## Розділ 6. Верифікація

- **Фаза 1:** docs рендеряться; `/api/cup/settlement-log` віддає receipts + `sourceHash`.
- **Фази 2-3:** `npm run contracts:test` — нові fork-тести `CupOracleV3` зелені
  (bond/slash/arbiter/flag); `ParimutuelMarket` резолвиться проти `getMatch` V3.
- **Фаза 4:** `npm --prefix server run typecheck` чисто; `test:cup-resolver` показує
  крок `postBond`; `/api/cup/readiness` показує multisig-owner.
- **Фаза 6:** контракти `Verified` на explorer; `CONTRACTS.md` оновлено.

## Підсумок

X Cup лишається собою — **pari-mutuel + мульти-джерельний кворум + AI-пундит +
free-to-play** — але оракул із «оптимістичного на словах» стає **оптимістичним з
економічною безпекою** (bonds + slash + підключуваний арбітр), на рівні перевіреного
патерну UMA/Polymarket, адаптованого під X Layer (де UMA немає). Це робить заяву
«trustless сетлмент» обґрунтованою.
