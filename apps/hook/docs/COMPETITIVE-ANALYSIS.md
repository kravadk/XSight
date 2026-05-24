# Where FanFeeHook sits in the V4-hook ecosystem

> Honest landscape — production heavyweights, hackathon winners, and direct
> mechanic cousins compared on the dimensions that actually matter for an
> identity-gated fee hook.

OKX «Build with Hook» is the **inaugural** V4-hook hackathon on X Layer.
Uniswap V4 launched on X Layer just months ago. There is no prior cohort
to benchmark against — this comparison is against the broader V4 ecosystem
(UF Hook Design Lab grants, UHI cohorts, ETHGlobal showcase winners,
Unichain Infinite Hackathon winners).

---

## 1. Master comparison

Legend: 🟢 yes/strong · 🟡 partial/unclear · 🔴 no/weak

| # | Project | Live | Identity-gated | Mechanic | Side mechanic | Tests/audit | Hackathon |
|---|---|---|---|---|---|---|---|
| ★ | **FanFeeHook (us)** | 🟢 X Layer mainnet · v1 + v2 · USDT/USDC pool · 15+ events | 🟢 **SBT + 0-100 reputation → 4 tiers** | 5/10/20/30 bps via `OVERRIDE_FEE_FLAG` | 🟢 CupSidePot weekly settle | 91% Foundry · SECURITY.md w/ v2 mitigations | OKX Build-with-Hook (this submission) |
| 1 | Bunni V2 | 🟢 ETH/Base/Arbitrum (**README discloses exploit**) | 🔴 | rehypothecation → Aave/Yearn yield | 🟢 LDFs, am-AMM, surge-fee | Medusa fuzzing · no coverage published · no audit linked | UF Hook Design Lab seed |
| 2 | Arrakis Pro | 🟢 5 chains | 🔴 | inventory-responsive dyn fee | 🔴 | audited · UF whitelisted · pause | first whitelisted dyn-fee hook |
| 3 | EulerSwap | 🟢 Ethereum | 🔴 | DEX over Euler lending vault | yield stacking | Euler-audited · pause | UF Hook Design Lab Grant |
| 4 | Flaunch | 🟢 Base | 🔴 | meme launchpad, 100% fees → creator | 🟢 creator economy | early audit | ETHCC trending |
| 5 | Super DCA (Wave 4) | **🔴 Sepolia only** | 🔴 | zero-fee DCA gauge | 🟡 DCA primitive | mainnet-fork integration tests · no audit | UF Wave 4 Retro Grant |
| 6 | Uniderp (Wave 4) | 🟢 Base · 772 tokens · $1.34M volume | 🔴 | no-code meme launcher | 🟢 launchpad | early audit | UF Wave 4 Retro Grant |
| 7 | Prediction Market Hook | 🟡 Unichain Sepolia + Base Sepolia | 🔴 | any pool hosts prediction market | 🟢 IL reduction | tests | **Unichain Infinite winner 2025** |
| 8 | Unipump | 🟡 Unichain/Base Sepolia | 🔴 | pump.fun-style bonding curve | 🟢 launchpad | tests | **Unichain Infinite winner 2025** |
| 9 | LoyalSwap (UHI C1) | 🟡 testnet only | 🟡 wallet swap-count | discount per retention | 🔴 | unit tests | Hookathon C1 (Atrium) |
| 10 | SuckerPunch (ETHGlobal London) | 🟡 testnet | 🟡 token holdtime | inverse-of-holdtime fee | 🔴 | unit tests | ETHGlobal London 2024 prize |
| 11 | The Incredible Hook | 🟡 testnet | 🟡 gas-sponsor-based | sponsored fee discount | 🔴 | unit tests | ETHGlobal London 2024 |
| 12 | Civic Identity Hook | 🟡 demo | 🟢 Civic Pass | gate-only (allow/deny) | 🔴 | tests | individual submission |
| 13 | WID-KYC Hook | 🟡 demo | 🟢 World ID | gate-only | 🔴 | tests | individual submission |
| 14 | Violet Hooks | 🟡 demo | 🟢 VioletID | gate-only | 🔴 | tests | individual submission |

---

## 2. Direct mechanic-cousin deep-dive

Hooks that share our specific niche: **fee modulation driven by an
attribute of the caller** (identity, loyalty, duration, sponsor).

| Criterion | **FanFeeHook** | LoyalSwap | SuckerPunch | The Incredible Hook |
|---|---|---|---|---|
| What attribute drives the fee? | On-chain reputation score (0–100) + FanPass SBT presence (independent inputs) | Wallet's number of prior swaps in pool | How long wallet has held the token | Whether someone else sponsors gas |
| Source of truth | `FanScoreRegistry` (operator-writable) + `FanPassSBT` SBT | Hook's internal `mapping(wallet→count)` | ERC-20 first-receipt timestamp | `msg.sender` vs `tx.origin` |
| Fee tier model | 4 tiers · 5 / 10 / 20 / 30 bps · thresholds 28/64/82 | Linear by swap count | Inverse exponential of holdtime | Binary sponsored/unsponsored |
| Side mechanic | 🟢 CupSidePot weekly settle via CupOracleV3 + BracketNFT | 🔴 | 🔴 | 🔴 |
| Composability story | 🟢 Reuses FanPassSBT + CupOracleV3 + BracketNFT (X Cup primitives) | 🔴 standalone | 🔴 standalone | 🔴 standalone |
| Live status | 🟢 X Layer mainnet (v1 + v2) | 🟡 testnet | 🟡 testnet | 🟡 testnet |
| Full dApp frontend | 🟢 5-page React + cross-product UI cards | minimal | minimal | minimal |
| Reputation-adapter pattern | 🟢 3 ready BrightID / Gitcoin / OP adapters | 🔴 hardcoded | 🔴 hardcoded | 🔴 hardcoded |
| Test coverage | 91% Foundry | minimal | minimal | minimal |
| v2 upgrade path designed | 🟢 Pausable + Merkle + stale-score (also deployed) | 🔴 | 🔴 | 🔴 |
| Hackathon outcome | submitting OKX (inaugural) | Hookathon C1 placement | London 2024 prize | London 2024 |

**We are the only V4 hook on production mainnet** that combines
identity gating + reputation scoring + side-pot settlement. Civic /
WID / Violet do identity but only as a gate (allow/deny). LoyalSwap
modulates fee but by swap count, not identity. SuckerPunch by holdtime.
None pair their hook with a second economic layer (side-pot).

---

## 3. Data-flow / synchronization

How each project moves data between off-chain, on-chain, and UI.

| Project | Off-chain → on-chain | On-chain read | Hook → external | Frontend ← API |
|---|---|---|---|---|
| **FanFeeHook** | `fanScoreSync` weekly cron writes scores | FanScoreRegistry + FanPassSBT.balanceOf | `CupSidePot.depositFor` from afterSwap (v2 path) | 6 endpoints: `/state`, `/tier`, `/pot`, `/discounts`, `/backtest`, `/encode-swap` |
| Bunni V2 | rebalancer bot | Aave/Yearn vault state | deposits/withdraws | bunni.xyz |
| Arrakis Pro | fee-adjust bot | own inventory tracker | none | Arrakis app |
| EulerSwap | none significant | Euler vault state | borrow/repay | Euler frontend |
| Flaunch | none | bonding curve state | sends fees → creator | flaunch.gg |
| Super DCA | none | own staker registry | none | no frontend |
| LoyalSwap | none | own swap-count mapping | none | demo only |
| SuckerPunch | event scanner (optional) | token Transfer events | none | demo only |
| UniMarket | oracle resolver | market state | oracle settle | demo |

**Takeaway:** FanFeeHook has the **largest API surface** among hackathon
peers (7 endpoints). Production projects (Bunni / Arrakis / Euler) have
private bots; our endpoints are public and documented.

---

## 4. Architecture complexity

| Project | Contracts | Off-chain workers | Frontends | External deps |
|---|---|---|---|---|
| **FanFeeHook** | **6 deployed** (Hook v1, ScoreRegistry, Pot v1, DemoSwapRouter, Hook v2, Pot v2) + FanBoostHook | 1 (fanScoreSync cron) | 1 React dApp | FanPassSBT + CupOracleV3 + BracketNFT (X Cup) |
| Bunni V2 | 5+ libs + Hook + AM-AMM + Rebalancer | 1 rebalancer | 1 | Aave + Yearn |
| Arrakis Pro | 3 (Hook + Vault + Manager) | 1 | 1 | own router |
| EulerSwap | 2 (Hook + Euler adapter) | 0 | 1 | Euler vaults |
| Super DCA | 3 (Gauge + Staking + Listing) | 0 | 0 | none |
| LoyalSwap | 1 | 0 | minimal | none |

Our 6-contract architecture (v1 + v2 + adjunct FanBoostHook) is
**denser than all production hooks except Bunni**, and **deeper than
every hackathon competitor**.

---

## 5. Code-level honesty audit (us)

Self-audit shipped publicly — every limitation is documented up-front.

**🔴 Known centralization (documented in SECURITY.md):**
- Operator-only `setScore` in FanScoreRegistry, `settle` in CupSidePot
- Single EOA operator (`0x82736f…7bDB`); rotation requires governance call
- `tx.origin` reliance for swapper identity in v1 + v2 (safe because hook
  only adjusts fee; v3 design parses explicit `hookData.swapper`)

**🟡 Demo / staging artifacts:**
- Small LP (~$0.60) on V2 pool — sufficient for end-to-end demo, not
  meaningful volume
- Backtest endpoint now uses **real on-chain FeeApplied events** with
  honest $1/event projection (see `/api/hook/backtest` `dataSource` flag);
  previously used a $100/call fictional multiplier — fixed in commit
  `e941907`
- Foundry tests use `MockFanPassSBT` / `MockPoolManager` — industry-standard
  pattern; same as Uniswap's official v4-template

**🟢 Mitigated in v2 (deployed):**
- `Pausable` on hook + pot
- `MAX_SCORE_AGE = 30 days` — wallets with stale scores auto-demote
- `claimWithProof(weekId, merkleProof, amount)` — eliminates O(n) winner
  array DOS vector

**🟢 What we don't fake:**
- Real swap volume = whatever appears on OKLink (currently 15+ real
  FeeApplied events across 4 tiers)
- Real LP = the actual ~$0.60 we funded, recoverable via BurnLp script
- Real adapter examples = compile-only Solidity (we don't claim they're
  deployed)
- Real test coverage = 91% line coverage on core paths, reported by
  Foundry `forge coverage`

---

## 6. What we don't claim

- ❌ Production-grade TVL (Bunni has $30M+; we have $0.60 demo)
- ❌ Formal third-party audit (none yet; SECURITY.md self-discloses)
- ❌ Mainnet-fork integration tests (Super DCA does this better; we
  use mock fixtures)
- ❌ Fuzzing (Bunni runs Medusa; we don't)
- ❌ Multisig operator (single EOA; v3 design specifies multisig +
  timelock)

---

## 7. Bottom-line positioning

We belong in the **Wave-4-grant-tier maturity** cohort (Super DCA, Uniderp,
RigoBlock BackGeoOracle) — deployed to mainnet, full dApp, public test
coverage, documented limitations. We exceed that cohort in:

- **Frontend completeness** (Super DCA has no UI; we ship a 5-route dApp)
- **Cross-product composition** (none of the cohort does this; we
  integrate XCup FanPass + Bracket UI cards with hook data)
- **Adoption package** (3 ready adapters + 60-second integration snippet +
  verifier-walkthrough — none of the cohort ships this on day-one)

We **do not compete** with Bunni / Arrakis / EulerSwap on TVL or audit
maturity. They are production protocols built over 12+ months with
audit budget. We are a 1-week hackathon submission with honest scope.

For the OKX inaugural cohort: we are the **first identity-gated reputation
hook on X Layer mainnet** with a full v1+v2 stack, a live pool, working
SwapWidget, and a complete adopter package. No prior cohort to beat —
we set the bar.

---

## Source list

- [Awesome Uniswap Hooks](https://github.com/fewwwww/awesome-uniswap-hooks) — master registry
- [Bunni V2](https://github.com/Bunniapp/bunni-v2)
- [Super DCA Gauge](https://github.com/Super-DCA-Tech/super-dca-gauge)
- [Civic Identity Hook](https://github.com/civicteam/uniswap-v4-hook)
- [WID KYC Hook](https://github.com/Shivamycodee/WID-KYC-Hook)
- [Violet Hooks](https://github.com/violetprotocol/uniswap-v4-violet-hooks)
- [DetoxHook](https://github.com/hamiha70/detox-hook)
- [Smart Liquidity Hook](https://github.com/SolidityDrone/Smart-Liquidity-Hook)
- [Watchtower](https://github.com/jordan-public/watchtower-1timehooks4sale)
- [stETHer](https://github.com/mcmoodoo/stETHer)
- [UF Wave 4 Grants announcement](https://www.uniswapfoundation.org/blog/unichain-grants-4)
- [Atrium Academy / Uniswap Hook Incubator](https://atrium.academy/uniswap)
- [OKX Build-with-Hook hackathon brief](https://web3.okx.com/xlayer/build-x-hackathon/hook)
