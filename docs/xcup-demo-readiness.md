# X Cup Demo Readiness

Use this after the track-hardening pass. The goal is to show that every track has a real product surface before recording screenshots or video.

## Current Proof State

| Track | Status | What To Show |
|---|---|---|
| AI Agent | ready | AgentBet -> Agent Trace -> Risk & Hedge Planner -> Rebuild action plan |
| Prediction Infrastructure | ready | CupHub -> Oracle Proof Panel -> Settlement receipts -> Reference Market Consumer |
| Trading | ready | Risk & Hedge Planner -> `NO_TRADE` / `WAIT` / `HEDGE_PREP` decision and approval-first copy |
| Social | ready | FanPass -> Campaign Gate Simulator -> reward/community gates |
| NFT | ready | FanPass -> FanPass SBT proof -> deployed SBT contract + eligibility state |
| GameFi | ready | CupHub -> Fantasy Quest Builder -> FanPass gate + oracle finality requirement |
| Market Potential / Infra | ready | Track Proof Center -> all tracks ready + x402/MCP builder surface |

Runtime check:

```bash
curl http://localhost:8787/api/cup/track-proof
```

Expected: all six tracks return `ready`.

## 90-Second Flow

1. **0-10s: Positioning**
   - Open Cup section.
   - Say: "XSight CupHub is not another prediction market. It is the backend World Cup apps need on X Layer."

2. **10-25s: Prediction Infrastructure**
   - Open CupHub.
   - Show Fixture Registry, source receipts, Settlement receipts, Oracle Proof Panel.
   - Say: "Markets and games can pause payouts when source quorum is missing instead of fabricating results."

3. **25-40s: AI Agent + MCP**
   - Open AgentBet.
   - Show Agent Trace.
   - Say: "The reference agent calls CupHub tools, decides, then requires approval before action."

4. **40-55s: Trading**
   - Stay in AgentBet.
   - Show Risk & Hedge Planner.
   - Say: "Trading value is risk/hedge readiness, not an autonomous betting bot."

5. **55-70s: Social + NFT**
   - Open FanPass.
   - Show Campaign Gate Simulator and FanPass SBT proof.
   - Say: "FanPass gates campaigns and NFT proofs by real wallet activity. The demo wallet is blocked because its score is low; that is the anti-Sybil behavior."

6. **70-85s: GameFi**
   - Return to CupHub.
   - Show Fantasy Quest Builder.
   - Say: "Fantasy quests consume fixtures, team strength, FanPass, and oracle finality. Player stats stay unavailable unless a real provider supplies them."

7. **85-90s: Infra Close**
   - Show Track Proof Center.
   - Say: "Every track is connected back to the same reusable CupHub backend: receipts, settlement, x402, MCP, signals, and reputation."

## SBT Demo Note

Current demo wallet state:

- FanPass score is below the SBT threshold.
- `FanPassSBT` is deployed.
- Eligibility API returns `eligible: false`.

This is acceptable and should be framed as a strength:

> "The contract is live, but this wallet cannot mint yet because FanPass only issues proof badges after enough real activity. We do not mint high-trust badges for low-signal wallets."

Do not force-mint or lower the threshold for the demo unless explicitly choosing a separate demo wallet with real activity.

## Screenshot Checklist

Capture these after opening the app locally:

- CupHub: Fixture Registry + Oracle Proof Panel visible.
- CupHub: Fantasy Quest Builder + Track Proof Center visible.
- FanPass: Campaign Gate Simulator + FanPass SBT proof visible.
- AgentBet: Agent Trace + Risk & Hedge Planner visible.
- Build/API or x402 spec: 14 endpoints / Cup endpoints visible.

Current saved screenshots:

- `docs/screenshots/xcup-cuphub.png`
- `docs/screenshots/xcup-cuphub-architecture.png`
- `docs/screenshots/xcup-fanpass.png`
- `docs/screenshots/xcup-agentbet.png`

## Pre-Recording Checks

Run these before recording the final walkthrough:

```bash
curl http://localhost:8787/api/status/health
curl http://localhost:8787/api/cup/track-proof
curl http://localhost:8787/api/cup/readiness
curl "http://localhost:8787/api/cup/fanpass/sbt-eligibility?wallet=0x0E43868b31daB2Ab37C3170B50B09dB924A93F71"
```

Expected state:

- backend health is `ok`
- `track-proof` returns AI Agent, Prediction Infrastructure, Trading, Social, NFT, and GameFi as `ready`
- CupOracleV2 readiness shows the deployed X Layer contract
- FanPass SBT eligibility may be blocked for a low-score wallet; this is correct anti-Sybil behavior
- `VITE_AGENTATION_ENABLED` should stay unset or `false` while recording, otherwise the local annotation overlay can cover the product UI

## Judge Opening Line

> XSight CupHub is the reusable backend for World Cup apps on X Layer. It gives builders fixtures, source receipts, optimistic settlement, AI fair odds, x402 APIs, MCP tools, and FanPass reputation, so they can build prediction markets, fantasy games, NFT quests, social campaigns, and AI agents without rebuilding the same infrastructure.

## Track Table For Submission

| Track | Demo Status | Proof Surface | How To Pitch It |
|---|---:|---|---|
| AI Agent | 100% | AgentBet Agent Trace, MCP tools, action plan, approval-first flow | A reference AI consumer observes CupHub, decides with signals, and requires approval before action. |
| Prediction Infrastructure | 100% | CupOracleV2, Oracle Proof Panel, source receipts, settlement lifecycle | This is settlement infrastructure for markets, not another market UI. |
| Trading | 100% | Fair odds, Risk & Hedge Planner, `NO_TRADE` / `WAIT` decisions | Trading value is risk and hedge readiness, not autonomous gambling execution. |
| Social | 100% | FanPass Campaign Gate Simulator, reward gates, reputation sources | Campaigns can gate rewards and community access without social scraping. |
| NFT | 100% | FanPassSBT deployed, eligibility endpoint, claim-gating copy | The SBT is a minimal non-transferable proof badge for real fan/campaign gating. |
| GameFi | 100% | Fantasy Quest Builder, oracle finality requirement, FanPass gate | Fantasy quests consume CupHub fixtures, signals, FanPass, and final settlement. |
| Market Potential / Infra | 100% | Track Proof Center, x402/MCP builder surface | CupHub is picks-and-shovels infrastructure for X Cup builders. |

## Do Not Say

- "We are Polymarket."
- "AgentBet autonomously bets."
- "Sentiment resolves outcomes."
- "Player stats are available if the provider does not supply them."
- "The SBT is a full NFT marketplace."

## What To Do If Something Is Unavailable

| Situation | What To Show | What To Say |
|---|---|---|
| Source quorum missing | Receipts + disabled settlement action | "CupHub blocks settlement until enough real sources agree. This is safer than fabricating results." |
| Provider rate-limited | Adapter status / unavailable state | "Production mode fails honestly and tells builders which provider needs attention." |
| Player stats unavailable | Player stats unavailable state | "Player stats are enrichment only. Settlement does not depend on fake player data." |
| SBT eligibility blocked | FanPass SBT proof with blocked reason | "The badge contract is deployed, but low-signal wallets cannot mint high-trust proof." |
| Agent action is `NO_TRADE` | Risk & Hedge Planner | "`NO_TRADE` is a valid safe decision when risk, quorum, or confidence is weak." |
