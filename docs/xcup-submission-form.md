# X Cup Submission Form Copy

Use this file as the direct source for the hackathon form. It is intentionally short, judge-readable, and avoids claims that are not implemented.

## Project Name

XSight CupOS / CupHub

## Tagline

Backend infrastructure for World Cup apps on X Layer.

## 500-Character Summary

XSight CupHub is the backend for World Cup apps on X Layer. It gives prediction markets, fantasy games, NFT quests, and AI agents real fixtures, source receipts, CupOracleV2 settlement, AI fair odds, x402 APIs, MCP tools, and FanPass reputation. It does not compete as another market; it supplies the reusable infrastructure those apps need to verify outcomes, price risk, and gate rewards.

## 1,000-Character Summary

XSight CupHub is reusable infrastructure for World Cup apps on X Layer. Most teams can build a prediction market, fantasy game, NFT quest, or social fan app, but they still need reliable fixtures, verifiable results, settlement state, AI risk signals, and fan reputation. CupHub provides those primitives through real sports data adapters, source receipts, CupOracleV2 optimistic settlement on X Layer, x402 paid APIs, and MCP tools for third-party agents. FanPass adds anti-Sybil reward gating, while AgentBet demonstrates how an AI consumer can observe fixtures, read receipts, check settlement state, evaluate fair odds, and require approval before action. Production mode does not silently use mock results: missing or conflicting sources produce honest states such as `source_quorum_unavailable` or `conflicting_sources`.

## Full Description

XSight CupHub is the AI and oracle infrastructure layer for World Cup apps on X Layer. It is built for teams that want to ship prediction markets, fantasy games, NFT quests, social campaigns, trading tools, or AI agents without spending the whole hackathon rebuilding sports data and settlement plumbing.

CupHub fetches real fixture data from sports providers, normalizes provider payloads, stores source receipts, exposes provider URLs and payload hashes, and anchors settlement evidence in CupOracleV2 on X Layer. If result quorum is missing or providers conflict, CupHub blocks settlement and shows the real failure state instead of fabricating a result. When quorum is met, the oracle flow supports propose, challenge, and finalize.

On top of that, CupHub exposes AI fair odds, risk, team strength, sentiment input, FanPass wallet reputation, x402 paid endpoints, and MCP tools. AgentBet is included only as a reference consumer: it shows how an AI agent can observe CupHub, decide with risk signals, require approval, and verify the oracle before any final action.

## Market Context

CupOS is best understood as sports outcome infrastructure for World Cup builders. If Polymarket is the market and UMA is generic optimistic resolution, CupHub is the sports-specific oracle and builder backend for X Layer apps. It combines sports data APIs, UMA-like settlement, x402 monetization, MCP agent tools, and FanPass reputation without claiming to be a full prediction market, fantasy game, NFT marketplace, or autonomous betting product.

## Problem

World Cup apps need the same primitives before they are trustworthy:

- real fixtures and match metadata
- multi-source result verification
- source receipts, URLs, and hashes
- optimistic settlement with challenge window
- fair odds, risk, and no-trade signals
- fan reputation for reward gating
- paid APIs and MCP tools for agents

Without this layer, every project rebuilds the same backend and still risks weak settlement.

## Solution

CupHub packages those primitives as shared infrastructure:

- CupHub UI for fixtures, receipts, readiness, settlement, AI edge, and builder examples
- CupOracleV2 on X Layer for source-backed optimistic settlement
- x402 APIs for paid data access
- MCP tools for third-party AI agents
- FanPass for wallet reputation, campaign gating, and optional SBT proof badge
- AgentBet as a reference consumer, not an autonomous betting marketplace

## Track Selection

Primary:

- AI Agent
- Prediction Infrastructure / Builder Infrastructure

Secondary:

- Trading
- Social
- GameFi
- NFT

## Track Answers

### AI Agent

CupHub is agent-readable World Cup infrastructure. MCP tools let compatible agents fetch fixtures, verify outcomes, read CupOracleV2 state, get AI fair odds, score team strength, check FanPass reputation, and build safe action plans. AgentBet demonstrates the correct flow with an explicit Agent Trace: observe, decide, require approval, and verify before any final action.

### Prediction Infrastructure

CupHub is not a prediction market; it is the settlement and data layer prediction markets need. It provides fixtures, source receipts, quorum checks, CupOracleV2 settlement, challenge window, and finalized outcome reads. If sources are missing or conflicting, settlement is blocked.

### Trading

CupHub provides a World Cup risk layer for trading agents and apps: fair probabilities, decimal fair odds, confidence, settlement risk, suggested edge, `NO_TRADE` decisions, and hedge-readiness states. It supports hedge-prep and risk analysis without claiming autonomous betting execution.

### Social

FanPass gives World Cup campaigns a reusable reputation and anti-Sybil primitive for fan quests, social rewards, community access, active fan tiers, and campaign gate simulation.

### GameFi

CupHub is a fantasy and quest backend. It provides fixtures, team strength, player-impact availability, settlement state, FanPass gates, and a Fantasy Quest Builder so GameFi apps can score quests without inventing data.

### NFT

CupOS supports NFT apps through FanPass claim gating and a minimal FanPass SBT proof badge. Campaigns can gate commemorative mints and winner moments by wallet reputation plus finalized CupOracle state. Winner moments stay locked until oracle finality.

## Technical Proof

- Frontend: `http://127.0.0.1:5174/`
- Backend: `http://localhost:8787`
- CupHub overview: `GET /api/cup/overview`
- Source adapters: `GET /api/cup/adapters`
- Persistence: `GET /api/cup/persistence`
- Readiness: `GET /api/cup/readiness`
- Track proof: `GET /api/cup/track-proof`
- Fantasy quest: `GET /api/cup/fantasy-quest?matchId=...&wallet=...`
- FanPass SBT eligibility: `GET /api/cup/fanpass/sbt-eligibility?wallet=...`
- FanPass SBT mint: `POST /api/cup/fanpass/sbt-mint` behind `CUP_WRITE_API_KEY`
- x402 discovery: `GET /api/v1/x402-spec`
- MCP discovery: `POST /mcp`
- Reference market: `examples/cuphub-reference-market.ts`
- Fantasy quest: `examples/cuphub-fantasy-quest.ts`

## On-Chain Proof

- Network: X Layer Mainnet, chain ID `196`
- CupOracleV2: `0xE4dFef03E107225f2239CFfF955a378A9a8158Be`
- Explorer: `https://www.okx.com/web3/explorer/xlayer/address/0xE4dFef03E107225f2239CFfF955a378A9a8158Be`
- Deploy tx: `0x143e34020471c5663fe55e7070521557139a7172ff51f878a9c08bb2aea9f06f`
- Challenge window: `3600` seconds
- FanPassSBT: `0x74F75532428A99E613a865C97D1084b7f38241BD`
- FanPassSBT deploy tx: `0x0ed86798ca38984017c977178d6eec3f365991e2c32331829b3cb2c808413cc7`

## Demo Script

1. 0-10s: "CupHub is not another prediction market. It is the backend those apps need."
2. 10-30s: Show fixtures and source receipts. Explain real providers, hashes, and honest no-quorum states.
3. 30-45s: Show settlement panel and CupOracleV2 on X Layer.
4. 45-60s: Show AI fair odds, risk, confidence, and `NO_TRADE`.
5. 60-75s: Show FanPass wallet score and reward gates.
6. 75-90s: Show AgentBet, x402 endpoints, and MCP tools.

## Fallback Demo Lines

- If source quorum is missing: "This is intentional. Production mode blocks settlement instead of inventing a result."
- If player stats are unavailable: "CupHub shows a real unavailable state until a live provider supplies player data."
- If payment is required: "Paid endpoints are gated through x402. Builders or agents pay from their wallet, XSight verifies the X Layer USDT transfer, and invalid or missing payment returns a structured 402."
- If settlement writes are disabled: "Writes are gated behind the server write key; read and verification flows remain visible."

## Avoid Saying

- "We are Polymarket."
- "AgentBet is an autonomous betting marketplace."
- "Sentiment resolves outcomes."
- "Production uses mock results."
- "NFT minting is a full standalone protocol."
