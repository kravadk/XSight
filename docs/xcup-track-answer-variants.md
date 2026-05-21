# X Cup Track Answer Variants

Use these answers when a submission form, judge, AI reviewer, or Twitter post asks what XSight CupOS does for a specific track.

## Primary Short Answer

XSight CupHub is the backend for World Cup apps on X Layer. It gives builders fixtures, source receipts, CupOracleV2 settlement, AI fair odds, x402 APIs, MCP tools, and FanPass reputation so prediction markets, fantasy games, NFT quests, social campaigns, trading tools, and AI agents can build on shared infrastructure instead of rebuilding it.

## Comparable Framing

XSight CupOS is sports outcome infrastructure for World Cup builders. The closest mental model is **sports data APIs + UMA-like optimistic settlement + x402 monetization + MCP tools + FanPass reputation**. CupOS is not trying to be Polymarket, Sorare, or a betting bot; it is the backend layer those kinds of apps can consume.

## AI Agent Track

### Short

CupHub is agent-readable World Cup infrastructure. MCP tools let any compatible agent fetch fixtures, verify outcomes, read CupOracleV2 state, get AI fair odds, score team strength, check FanPass reputation, and build safe action plans.

Comparable framing: sports MCP tools plus an action-plan consumer, with CupHub as the source of oracle-aware context.

### Full

XSight CupOS turns World Cup data and settlement into an AI-agent tool layer. Agents can call MCP tools such as `get_cup_fixtures`, `verify_outcome`, `get_cup_ai_edge`, `get_cup_settlement_state`, `get_fan_score`, and `build_cup_action_plan`. The reference AgentBet consumer demonstrates the correct pattern: observe CupHub data, decide with AI/risk signals, require human approval, and verify CupOracleV2 before any final action. It is intentionally not an autonomous gambling marketplace.

### Proof To Show

- MCP discovery at `POST /mcp`
- AgentBet tab: observe -> decide -> approve -> verify
- Agent Trace showing `get_cup_fixtures`, `get_cup_ai_edge`, `get_cup_settlement_state`, `get_fan_score`, `build_cup_action_plan`
- `examples/cuphub-reference-market.ts`

## Prediction Infrastructure Track

### Short

CupHub is not a prediction market; it is the settlement and data layer prediction markets need. It provides fixtures, source receipts, quorum checks, CupOracleV2 settlement, challenge window, and finalized outcome reads.

Comparable framing: UMA-like optimistic settlement, narrowed to sports fixtures and World Cup outcome evidence.

### Full

Most prediction market demos can create a "Team A vs Team B" UI. The incomplete part is resolution: which sources count, what evidence is attached, when a result can be proposed, who can challenge it, and when payouts are safe. CupHub solves this as shared infrastructure. It stores provider receipts, computes source hashes, exposes settlement checks, and anchors evidence in CupOracleV2 on X Layer. If sources are missing or conflicting, CupHub blocks settlement and returns honest states such as `source_quorum_unavailable` or `conflicting_sources`.

### Proof To Show

- CupHub fixture registry and receipts
- Settlement panel with rules/source/evidence hashes
- Oracle Proof Panel with CupOracleV2 address, selected match id, source/evidence hashes, source count, and state
- CupOracleV2 explorer link
- `GET /api/cup/settlement-check`

## Trading Track

### Short

CupHub provides a World Cup risk layer for trading agents and apps: fair probabilities, decimal fair odds, confidence, settlement risk, suggested edge, and `NO_TRADE` decisions.

Comparable framing: fair odds and risk infrastructure, not autonomous betting execution.

### Full

XSight does not need to become a betting execution product to fit Trading. The trading value is the risk engine: apps and agents can price event exposure, detect settlement risk, avoid low-confidence trades, and prepare hedges only after source and oracle checks pass. AgentBet shows this safely by producing action plans and guardrails, while keeping execution approval-first and oracle-verified.

### Proof To Show

- AI edge panel
- Fair odds panel
- Risk & Hedge Planner with risk decision, hedge readiness, blocked reason, and approval-first flow
- AgentBet action plan
- `NO_TRADE` as a valid safe output

## Social Track

### Short

FanPass gives World Cup campaigns a reusable reputation and anti-Sybil primitive for fan quests, social rewards, community access, and active fan tiers.

Comparable framing: campaign and reputation infrastructure for fan communities, without depending on a Twitter/X scraper.

### Full

World Cup social campaigns attract low-effort farming wallets. FanPass gives builders a wallet score, tier, verdict, and reward gates based on real CupHub/x402/on-chain activity. Apps can use it before rewards, claim pages, fan quests, or agent delegation. The goal is not a standalone social network; it is a shared identity layer for World Cup campaigns on X Layer.

### Proof To Show

- FanPass wallet identity
- Score meter and breakdown
- Campaign Gate Simulator
- Reward gates
- Risk handling states

## NFT Track

### Short

CupOS supports NFT apps through FanPass claim gating and a minimal FanPass SBT proof badge: campaigns can gate commemorative mints and winner moments by wallet reputation plus finalized CupOracle state.

Comparable framing: FanPassSBT is a proof badge for campaign gating, not a full NFT marketplace.

### Full

NFT scope is deliberately kept as an integration primitive, not a marketplace. FanPass tells NFT apps whether a wallet should receive basic participation claims, winner-moment claims, trusted fan editions, or manual review. FanPassSBT adds a minimal non-transferable on-chain proof badge for campaign gating. Winner moments stay locked until CupOracleV2 finalizes the result, preventing unresolved or challenged matches from triggering official NFT rewards.

### Proof To Show

- FanPass NFT claim gating block
- FanPass SBT proof block
- `GET /api/cup/fanpass/sbt-eligibility?wallet=...`
- `GET /api/v1/cup/fan-score`
- CupOracle finality requirement
- `examples/cuphub-fantasy-quest.ts`

## GameFi Track

### Short

CupHub is a fantasy and quest backend: fixtures, team strength, player-impact availability, settlement state, and FanPass gates let GameFi apps score quests without inventing data.

Comparable framing: Sorare-like or fantasy-sports apps can consume CupHub, but CupOS itself stays backend infrastructure rather than a full game.

### Full

GameFi World Cup apps need reliable event data and payout rules. CupHub gives them fixture context, source-backed settlement, AI/team signals, and wallet gating. If player stats are unavailable from live providers, CupHub shows an honest unavailable state rather than fake player data. The fantasy quest example shows how a game can pick a team quest, check FanPass eligibility, and unlock winner moments only after oracle finality.

### Proof To Show

- Player impact feed unavailable state
- Fantasy Quest Builder
- `GET /api/cup/fantasy-quest?matchId=...&wallet=...`
- Team strength signal
- FanPass gates
- `examples/cuphub-fantasy-quest.ts`

## Technical Architecture Answer

CupOS has four layers:

1. Source layer: real provider adapters normalize fixtures and results, store provider URLs, timestamps, hashes, confidence, and normalized payloads.
2. Oracle layer: CupOracleV2 anchors rules hash, source hash, evidence hash, evidence URI, source count, proposal, challenge, and final outcome on X Layer.
3. Intelligence layer: AI edge, fair odds, team strength, sentiment input, player impact availability, FanPass reputation, and action plans.
4. Distribution layer: x402 APIs for paid access, MCP tools for AI agents, and a Track Proof endpoint for judge-readable verification.

## Avoid Saying

- "We are Polymarket."
- "AgentBet is an autonomous betting marketplace."
- "Sentiment resolves outcomes."
- "We use mock results in production."
- "NFT minting is fully implemented as a standalone protocol."

## Best One-Sentence Closing

CupHub makes every World Cup app on X Layer more complete by giving it the backend primitives it would otherwise have to rebuild: data, receipts, settlement, signals, payments, tools, and reputation.
