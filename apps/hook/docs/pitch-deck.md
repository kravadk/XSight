# FanFeeHook · 1-page pitch

> Open this file → browser **Print → Save as PDF** → upload to submission.

---

## The problem

DeFi has no loyalty programs. Every fan-token, NFT-club, DAO membership
**wants** tier-gated economics — and every one of them lives in Web2 because
the AMM layer below them is identity-blind.

## The solution — FanFeeHook

A Uniswap V4 hook on **X Layer mainnet** that reads on-chain reputation
SBTs and modulates LP fee per swap.

```
┌────────────────────┐    score / FanPass     ┌──────────────────┐
│  FanScoreRegistry  │ ◄─── operator weekly   │   Server cron    │
└────────────────────┘                        └──────────────────┘
         ▲
         │ read in beforeSwap
         │
┌────────────────────┐  PoolManager.swap()    ┌──────────────────┐
│    FanFeeHook      │ ◄──────────────────    │  Universal Router │
│  beforeSwap →      │  emits FeeApplied →    │ + Demo Router     │
│  dynamic LP fee    │                        └──────────────────┘
└────────────────────┘
         │  half of extra spread above 5 bps
         ▼
┌────────────────────┐    weekly settle       ┌──────────────────┐
│   CupSidePot       │ ◄─── CupOracleV3 ──    │  X Cup primitives │
│   pro-rata payout  │     match results      │  already on chain │
└────────────────────┘                        └──────────────────┘
```

## Live proof (X Layer chain 196, 2026-05-24)

- **FanFeeHook** `0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0`
- **FanScoreRegistry** `0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820`
- **CupSidePot** `0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504`
- USDT/USDC pool active. **14+ on-chain `FeeApplied` events**, every tier hit.
- Full deposit → settle → claim cycle on CupSidePot — net 0 USDC.

| Tier | Score | Fee |
|---|---|---|
| 0 unknown | 0 | 30 bps |
| 1 active | 28+ | 20 bps |
| 2 trusted | 64+ | 10 bps |
| 3 oracle-grade | 82+ | **5 bps** |

**Same wallet, same pool, same direction.** Score moves 0→90 ⇒ fee moves
30→5 bps. 6× cheaper.

## Why this is unique

| Competitor V4 hook | Identity-gated? |
|---|---|
| Bunni V2 (rehypothecation) | ❌ |
| Arrakis Pro (dynamic fee) | ❌ |
| EulerSwap (yield stacking) | ❌ |
| Smart Liquidity (Aave routing) | ❌ |
| Watchtower (1-time hooks) | ❌ |
| DetoxHook (MEV→LP) | ❌ |
| **FanFeeHook (us)** | ✅ FanPass SBT + 0-100 score |

We occupy a column nobody else does.

## Composability story

`FanScoreRegistry` is generic. Any SBT system can plug in:

- Optimism Attestation Station · BrightID · Passport XYZ · Gitcoin Passport
  · ENS membership tiers · custom DAO badge

We're not building **a** loyalty product — we're building the **rails** for
every loyalty product. The hook is reusable infrastructure.

## Revenue + defensibility

- **Treasury:** 1 bp protocol fee on extra-spread → DAO treasury.
- **Distribution:** OKX has 50 M users → mass-market tier-gated swaps via
  X Cup brand + Uniswap V4 Hook Registry inclusion.
- **Moat:** first-mover on identity-gated V4 hooks. Network effect — more
  pools → more LPs → more fan communities → flywheel.
- **B2B:** premium integration tier for protocols that want custom SBT
  wiring (NFT clubs, sport DAOs, retail loyalty).

## Roadmap (v2, post-hackathon)

- **Pausable** hook + side-pot with 24h timelock.
- **Merkle-proof claim** for CupSidePot — removes operator trust.
- **BeforeSwapDelta** routing — actual on-chain capture of spread → pot.
- **FanBoostHook** — second hook in `afterAddLiquidity` that rewards LPs
  for holding FanPass.
- **External audit** via UFSF security subsidy.

## One-liner

> *Loyalty programs don't exist in DeFi. We built the first identity-gated
> swap fee on Uniswap V4 — real fans pay 5 bps, strangers pay 30. Live on
> X Layer mainnet, 20+ proof events, every tier verified.*

---

**Live dashboard:** https://x-sight.vercel.app?product=hook
**GitHub:** https://github.com/kravadk/XTariff
**Twitter:** @xcup_hook
