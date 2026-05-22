# X Cup — детальний план зміцнення логіки та продукту

> Доповнення до `docs/xcup/CONTRACTS.md` / `DESIGN.md`. Принципи дизайну сетлменту
> X Cup + покроковий план виправлення всіх прогалин і доведення продукту до
> виробничого рівня.

## Статус виконання

- **Фаза 1 — ✅ зроблено** (`9d14aaf`): `SETTLEMENT-RULES.md` v1, чесне формулювання
  оракула в `README`/`GUIDE`/`DESIGN`, `rulesHash` комітиться на rulebook.
- **Фаза 2-3 — ✅ зроблено** (`320f786`): `CupOracleV3.sol` (bonds + slash + flag/
  timelock) і `ArbiterMultisig.sol` (2-of-3, `ICupArbiter`). Закриває G1/G2/G3/G4/G6.
- **Фаза 6 (тести) — ✅ зроблено** (`d1d80e7`): 19 fork-тестів проти X Layer mainnet
  з реальним USDT — усі зелені.
- **Фаза 4 + 6 (деплой-скрипт) — ✅ зроблено** (`31a5958`): `deploy-cup-oracle-v3.ts`
  + version-aware бекенд (V3 ABI, bonded write-path).
- **Фаза 5 — ✅ зроблено** (`906a05b`, `b934408`): `ParimutuelMarket` — minStake +
  поглинання dust останнім переможцем (G7); `GET /api/cup/health`; close-buffer перед
  kickoff. Fork-тести: 45 зелених (26 ринок + 19 V3).
- **Деплой у mainnet — ✅ зроблено** (X Layer 196): `CupOracleV3`
  `0x19da7aab20Be913fb697ebfef4b8f12Ac463Ebf6`, `ArbiterMultisig`
  `0x792152c274c42C588D5551C9141C21106d3A2Cce` (1-of-1, операторський; арбітр в
  оракулі змінний за timelock), новий `ParimutuelMarket`
  `0x0431576845B77a743C87be323c04fad02201E08b`. Bond 50 USDT, 0% fee, 1 год вікно.
- **Лишилось:** верифікація 3 контрактів на explorer; (опційно) підняти арбітр до
  2-of-3 через `proposeArbiter`/`commitArbiter`.

---

## Розділ 1. Принципи дизайну сетлменту

Оракул X Cup побудований навколо п'яти принципів — кожен напряму закриває конкретний
клас атак на чесність результату. Це власний дизайн, спроєктований під єдиний домен
(футбол) і єдиний чейн (X Layer).

### 1.1 Оптимістичний сетлмент з бондами

Результат не «оголошується» — він **пропонується під заставу**. Пропозер вносить
`bondAmount` (USDT) і вмикає вікно оскарження `challengeWindow`. Якщо за цей час ніхто
не оскаржив — результат фіналізується, bond повертається повністю. Якщо оскаржили —
челенджер вносить рівний bond, спір іде в арбітра. Той, хто помилився, втрачає bond на
користь правого (мінус `protocolFeeBps`). Брехати коштує весь bond; чесний челендж —
прибутковий. Так пасивне вікно оскарження стає економічно активним.

### 1.2 Підключуваний арбітр

Стан `Challenged` не глухий кут: оракул тримає змінну адресу `arbiter` за простим
інтерфейсом `ICupArbiter` (`requestRuling` → зворотний `resolveChallenge`). На хакатон
— `ArbiterMultisig` (M-of-N підписантів голосують за фінальний результат). Інтерфейс
дозволяє згодом замінити мультисиг на ширшу арбітражну панель за таймлоком — без
редеплою оракула.

### 1.3 Ручний фолбек лише за таймлоком

Жодного миттєвого адмін-бекдора. Якщо матч завис у патовому стані, `owner` викликає
`flag(matchId)`, що ставить `manualResolveAt = now + safetyPeriod`; `resolveManually`
дозволено **лише після** цього таймлоку й лише `owner`. Навіть аварійний шлях публічно
спостережуваний і відкладений у часі — а не миттєвий бекдор.

### 1.4 Per-match oracle + буфер після kickoff

Кожен матч резолвиться тільки призначеним оракулом і не раніше ніж `kickoff + buffer`
— щоб результат не міг бути запропонований до фактичного завершення гри.

### 1.5 Канонічний on-chain pari-mutuel

Пул на кожен результат; `open → close → settle → claim`; опційна комісія з тоталу;
`payout = userBet * (totalPool − fee) / winnerPool`; кейс «немає переможців» → рефанд.
Класичні пастки: **rounding dust** (цілочисельне ділення лишає пил), last-claimer,
reentrancy, ділення на нуль. `ParimutuelMarket` X Cup закриває їх — ReentrancyGuard,
claimed-flag, refund на no-winner, поглинання dust останнім переможцем.

---

## Розділ 2. Прогалини X Cup → рішення (мапа)

| # | Прогалина | Рішення (фаза) |
|---|---|---|
| G1 | Оракул без бондів — propose/challenge безкоштовні | `CupOracleV3` з bonds + slash (Фаза 2) |
| G2 | `Challenged` — глухий кут | Pluggable `ICupArbiter` + `ArbiterMultisig` (Фаза 3) |
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
12. **Прибрати миттєвий `emergencyFinalize` (G4).** Замінити на патерн flag + таймлок:
    `flag(matchId)` ставить `manualResolveAt = now + SAFETY_PERIOD`; `resolveManually`
    дозволено лише після `manualResolveAt` і лише `owner` (далі — multisig, Фаза 4).
13. **Інтерфейс читання `getMatch(bytes32)` лишити сумісним** з V2 (ті самі поля
    `finalOutcome`/`state`), щоб `ParimutuelMarket` не змінювати логічно.
14. Події: `ResultProposed`, `ResultChallenged`, `ChallengeResolved`, `ResultFinalized`,
    `MatchFlagged`, `BondSlashed` — для індексера й аудиту.

### Фаза 3 — Pluggable-арбітр для стану `Challenged` (G2)

15. Інтерфейс `ICupArbiter` — підключуваний арбітр:
    `requestRuling(bytes32 matchId, uint8 proposedOutcome) → uint disputeId` і
    зворотний виклик в оракул `resolveChallenge`.
16. `contracts/ArbiterMultisig.sol` — реалізація: 2-of-3 підписанти голосують за
    `rulingOutcome`, по досягненні кворуму викликають `oracle.resolveChallenge`.
17. `arbiter` в оракулі — змінна (`setArbiter` onlyOwner за таймлоком), щоб згодом
    замінити мультисиг на ширшу арбітражну панель без редеплою оракула.
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
28. **(Опційно) Додаткове on-chain джерело результату** в кворумі — окремий
    request/fulfill консьюмер, JS-код якого ходить у FIFA/ESPN API й анкорить
    результат on-chain. Підвищує довіру, але потребує деплою додаткового контракту;
    для хакатону — стретч.
29. **(Опційно) Reset-on-first-dispute:** перший спір не йде одразу в арбітра, а дає
    ще один оптимістичний раунд. Менше навантаження на арбітра.

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
   склад підписантів. Ширша арбітражна панель — як майбутнє.
3. **Чи робити редеплой зараз.** Фаза 2-4 = новий `CupOracleV3` + новий
   `ParimutuelMarket` у mainnet. Альтернатива до дедлайну: Фаза 1 (rulebook + чесні
   docs) зараз, Фази 2-6 — після.
4. **`protocolFeeBps`** на slash-частку — 0% (усе переможцю, максимальний стимул
   челенджити) чи ~5% у treasury.
5. **Додаткове on-chain джерело результату** (Фаза 5 п.28) — у скоупі чи стретч.

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
економічною безпекою** (bonds + slash + підключуваний арбітр), реалізованим X Cup
нативно під X Layer. Це робить заяву «trustless сетлмент» обґрунтованою.
