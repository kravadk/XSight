# X Cup — Settlement Rules

> **Rulebook v1.** The `rulesHash` stored on `CupOracleV2` for every match commits to
> this document. It defines exactly how a market resolves, so the result of any X Cup
> market is unambiguous before anyone stakes. Published per the standard set by leading
> prediction markets (Polymarket publishes an equivalent rubric for sports markets).

## 1. Scope

- Markets are **1X2 / Match Result**: three outcomes — **Home (1)**, **Draw (2)**,
  **Away (3)** — on football (soccer) fixtures of the FIFA World Cup.
- Each market settles in a stablecoin pari-mutuel pool (`ParimutuelMarket`); winners
  split the pool pro-rata. There is no house and no fixed odds.

## 2. The result of record

A market resolves to the **official final result of the match** as recorded by FIFA.

- **Group-stage match:** the result after 90 minutes of regulation plus official stoppage
  time → Home, Draw, or Away.
- **Knockout match:** the result after regulation, extra time, **and** — if still level —
  the penalty shootout. The team that officially advances is the **Home** or **Away**
  winner. **Draw is not a valid knockout outcome**; if a knockout market is mis-created
  with stakes on Draw and Draw cannot win, those stakes follow the refund path (§5) only
  when no outcome wins — otherwise the advancing team's pool wins as normal.

The on-chain settlement oracle records this single outcome; the resolver derives it from
the official advancing team for knockout matches, not from the regulation scoreline alone.

## 3. Source priority & quorum

The result is taken only when **at least 2 independent sources agree** (multi-source
quorum, `evaluateSettlementQuorum`). Source priority, highest first:

1. Official FIFA result.
2. ESPN match centre.
3. football-data.org.
4. TheSportsDB.

If sources disagree and no two agree on the same outcome, the market is held in
`conflicting_sources` and **does not settle** until quorum is reached or the match is
voided (§5). No outcome is ever guessed.

## 4. Timing

- Staking on a market **closes at kickoff** (`closeTime`).
- The result is proposed to `CupOracleV2` only after the match is officially final.
- A **challenge window** (≈1 hour) follows every proposed result; anyone may challenge a
  wrong proposal during it. The result is finalized on-chain only after the window
  elapses (or, once Phase 2 of the hardening plan ships, after a bonded dispute is
  resolved by the arbiter).
- `ParimutuelMarket.settle()` reads **only the finalized** oracle result.

## 5. Edge cases — void & refund

A market is **voided** (operator `voidMarket()`) → **every staker is refunded their full
stake, no fee** in these cases:

- **Abandoned match** — stopped before official completion and not resumed.
- **Postponed / rescheduled** — not played in its original slot and not replayed within a
  reasonable window.
- **Cancelled match.**
- **Walkover / awarded result with no played outcome** — refunded rather than guessed.

A market also enters **refund mode automatically** if the finalized winning outcome has
**no stakers** (`pool[winningOutcome] == 0`) — the whole pool is refunded pro-rata.

## 6. VAR & disputed calls

VAR decisions, refereeing controversies, and post-match protests do **not** change a
settled result. The **official final result as recorded by FIFA** governs. If an official
result is formally overturned by FIFA *before* on-chain finalization, the corrected
result is the one proposed.

## 7. Fees

The protocol fee is **0%** for the X Cup hackathon (`PARIMUTUEL_FEE_BPS=0`). The contract
supports an optional fee capped at 10%; the deployed instance is set to 0.

## 8. Amendment

This rulebook is versioned. Any change is a new version with a new `rulesHash`; markets
created under an earlier version keep the rules in force when they were created.

---

*Rulebook v1 · committed to on-chain via `rulesHash` · see `docs/xcup/HARDENING-PLAN.md`
for the bonded-oracle hardening that strengthens the challenge window (§4).*
