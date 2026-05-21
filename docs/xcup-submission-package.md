# XSight CupOS Submission Package

## One-Line Pitch

XSight CupHub is sports outcome infrastructure for World Cup builders on X Layer: sports data APIs, source receipts, UMA-like settlement, AI fair odds, x402 monetization, MCP tools, and FanPass reputation in one reusable layer.

## 30-Second Pitch

Most World Cup hackathon teams can build a prediction market, fantasy game, NFT quest, or fan app. The hard part is the shared backend: reliable fixtures, verifiable results, source receipts, settlement state, fair odds, agent-readable APIs, and anti-Sybil fan reputation.

XSight CupHub solves that as infrastructure. Builders and agents call CupHub through x402 APIs or MCP tools, inspect real provider receipts, wait for CupOracleV2 settlement on X Layer, and use FanPass to gate rewards for real fans.

## 90-Second Demo Script

| Time | Show | Say |
|---|---|---|
| 0-10s | XSight app, Cup section | "XSight CupHub is not another prediction market. It is the backend those markets, fantasy games, NFT quests, and AI agents need." |
| 10-30s | CupHub fixture registry and source receipts | "CupHub fetches real World Cup fixtures from sports providers, normalizes them, hashes receipts, and shows provider URLs and confidence. In production, if source quorum is missing, we show that honestly instead of filling with mock data." |
| 30-45s | Settlement panel and CupOracleV2 | "CupOracleV2 anchors rules hash, source hash, evidence hash, evidence URI, source count, proposal, challenge window, and final outcome on X Layer." |
| 45-60s | AI edge and fair odds | "Other apps can call the AI edge engine for fair probabilities, decimal odds, confidence, settlement risk, and no-trade recommendations. These are signals, not canonical truth." |
| 60-75s | FanPass | "FanPass gives campaigns a reusable reputation primitive: wallet score, tier, gates, and anti-Sybil guardrails for rewards, quests, NFT claims, and fantasy apps." |
| 75-90s | AgentBet, x402 spec, MCP discovery | "AgentBet is a reference consumer. It observes CupHub, decides with AI/risk signals, requires approval before action, and rechecks the oracle. Builders can integrate through 14 x402 endpoints and MCP tools." |

## What Problem We Solve

World Cup apps need the same primitives before they are complete:

- fixtures and match metadata
- multi-source result verification
- public source receipts and hashes
- optimistic settlement with challenge window
- fair odds, risk, and no-trade signals
- fan reputation for reward gating
- paid APIs and MCP tools for agents

CupHub makes those primitives reusable instead of forcing every team to rebuild them.

## Why This Is Not Another Prediction Market

CupHub does not try to own the user-facing market. It supplies the backend layer that prediction markets, fantasy games, NFT quests, trading tools, and AI agents call.

The key difference:

- A prediction market asks: "Who will win?"
- CupHub answers: "What fixtures exist, what sources support them, can this result settle, what is the oracle state, and what risk should other apps see?"

## Market Context / Comparable Projects

If Polymarket is the market and UMA is generic optimistic resolution, CupHub is the sports-specific oracle and builder backend for World Cup apps on X Layer.

The closest Web2 category is sports data infrastructure such as SportsDataIO or SportMonks: reliable fixtures, scores, stats, and IDs for builders. CupOS adds the Web3 layer those APIs do not provide by default: source receipts, on-chain settlement evidence, x402 access, MCP tools, and FanPass reputation.

The closest consumer category is Sorare-style fantasy/NFT sports apps. CupOS does not try to become that game or marketplace; it gives those apps the backend primitives they need to verify outcomes and gate rewards.

Full comparison: `docs/xcup-competitive-landscape.md`.

## Track Mapping

| Track | Status | What XSight CupOS Shows |
|---|---|---|
| AI Agent | Primary | MCP tools, AgentBet reference consumer, AI edge, action plan, observe-decide-approve-verify flow. |
| Prediction Infrastructure | Primary | CupOracleV2, source receipts, settlement check, challenge window, reference market example. |
| Trading | Strong secondary | Fair odds, risk engine, no-trade signals, hedge-prep action plans, approval-first execution stance. |
| Social | Secondary | FanPass reputation, active fan tiers, anti-Sybil gates, campaign reward logic. |
| GameFi | Secondary | Fantasy/quest backend, fixture/result settlement, player impact feed with honest unavailable state. |
| NFT | Secondary | FanPass can gate NFT claims and campaign access by wallet reputation and finalized oracle state. |

## Technical Proof

- Frontend: `http://127.0.0.1:5174/`
- Backend: `http://localhost:8787`
- Demo readiness checklist: `docs/xcup-demo-readiness.md`
- Architecture one-pager: `docs/xcup-architecture-one-pager.md`
- CupHub overview: `GET /api/cup/overview`
- CupOracle readiness: `GET /api/cup/readiness`
- Source adapters: `GET /api/cup/adapters`
- Track proof: `GET /api/cup/track-proof`
- Fantasy quest: `GET /api/cup/fantasy-quest?matchId=&wallet=`
- FanPass SBT eligibility: `GET /api/cup/fanpass/sbt-eligibility?wallet=`
- FanPass SBT mint: `POST /api/cup/fanpass/sbt-mint` behind `CUP_WRITE_API_KEY`
- x402 discovery: `GET /api/v1/x402-spec`
- MCP discovery: `POST /mcp`
- Reference consumer: `examples/cuphub-reference-market.ts`
- Fantasy/GameFi consumer: `examples/cuphub-fantasy-quest.ts`

## On-Chain Proof

- Network: X Layer Mainnet, chain ID `196`
- CupOracleV2: `0xE4dFef03E107225f2239CFfF955a378A9a8158Be`
- Explorer: `https://www.okx.com/web3/explorer/xlayer/address/0xE4dFef03E107225f2239CFfF955a378A9a8158Be`
- Deploy tx: `0x143e34020471c5663fe55e7070521557139a7172ff51f878a9c08bb2aea9f06f`
- Challenge window: `3600` seconds
- FanPassSBT: `0x74F75532428A99E613a865C97D1084b7f38241BD`
- FanPassSBT deploy tx: `0x0ed86798ca38984017c977178d6eec3f365991e2c32331829b3cb2c808413cc7`

## x402 And MCP Proof

CupHub exposes paid World Cup intelligence through x402:

- `/api/v1/cup/fixtures`
- `/api/v1/cup/ai-edge`
- `/api/v1/cup/fair-odds`
- `/api/v1/cup/settlement-check`
- `/api/v1/cup/result/:matchId`
- `/api/v1/cup/player-stats`
- `/api/v1/cup/sentiment`
- `/api/v1/cup/team-strength`
- `/api/v1/cup/fan-score`
- `/api/v1/cup/action-plan`

The UI includes a live **Pay & Call with wallet** proof: a builder wallet sends USDT on X Layer, the request is retried with `X-PAYMENT`, and the API returns paid Cup intelligence JSON only after backend transaction verification. The payer is the external app, builder, or AI agent, not the fan browsing the demo.

MCP exposes agent-readable tools:

- `get_cup_fixtures`
- `get_cup_ai_edge`
- `get_cup_player_stats`
- `score_team_strength`
- `get_cup_sentiment`
- `verify_outcome`
- `resolve_match`
- `get_cup_settlement_state`
- `get_fan_score`
- `build_cup_action_plan`

## Submission Summaries

### 500 Characters

XSight CupHub is the backend for World Cup apps on X Layer. It gives prediction markets, fantasy games, NFT quests, and AI agents real fixtures, source receipts, CupOracleV2 settlement, AI fair odds, x402 APIs, MCP tools, and FanPass reputation. It does not compete as another market; it supplies the reusable infrastructure those apps need to verify outcomes, price risk, and gate rewards.

### 1,000 Characters

XSight CupHub is reusable infrastructure for World Cup apps on X Layer. Most teams can build a prediction market, fantasy game, NFT quest, or social fan app, but they still need reliable fixtures, verifiable results, settlement state, AI risk signals, and fan reputation. CupHub provides those primitives through real sports data adapters, source receipts, CupOracleV2 optimistic settlement on X Layer, x402 paid APIs, and MCP tools for third-party agents. FanPass adds anti-Sybil reward gating, while AgentBet demonstrates how an AI consumer can observe fixtures, read receipts, check settlement state, evaluate fair odds, and require approval before action. Production mode does not silently use mock results: missing or conflicting sources produce honest states such as `source_quorum_unavailable` or `conflicting_sources`.

### Full

XSight CupHub is the AI and oracle infrastructure layer for World Cup apps on X Layer. It is designed for builders who want to ship prediction markets, fantasy games, NFT quests, social campaigns, or AI agents without spending the whole hackathon rebuilding sports data and settlement plumbing.

CupHub fetches real fixtures from source adapters, normalizes provider payloads, stores source receipts, exposes hashes and URLs, and anchors settlement evidence in CupOracleV2 on X Layer. If result quorum is missing or providers conflict, CupHub blocks settlement and shows the real failure state. If quorum is met, the oracle flow supports propose, challenge, and finalize.

On top of that, CupHub exposes AI fair odds, risk, team strength, sentiment input, FanPass wallet reputation, x402 paid endpoints, and MCP tools. AgentBet is included only as a reference consumer: it shows how an AI agent can observe CupHub, decide with risk signals, require approval, and verify the oracle before any final action.

## Judge-Friendly FAQ

**Is this a prediction market?**  
No. CupHub is infrastructure that prediction markets and other World Cup apps can use.

**What is on-chain?**  
CupOracleV2 on X Layer stores match evidence, source hashes, proposed outcomes, challenge state, and finalized outcomes.

**What happens if providers disagree?**  
CupHub shows `conflicting_sources` and blocks settlement proposal.

**What happens if providers are missing or rate-limited?**  
CupHub shows `source_quorum_unavailable` or `provider_rate_limited`; production does not fabricate results.

**How do other apps integrate?**  
Through x402 APIs, MCP tools, or the reference consumer example.

**Why does FanPass matter?**  
World Cup rewards and campaigns attract bots. FanPass gives apps a wallet score and reward-gating primitive based on real activity.

**How does this support NFT and GameFi tracks without becoming a separate NFT project?**  
FanPass gates NFT claims and fantasy quests with wallet reputation plus finalized oracle state. CupHub stays the infrastructure layer; NFT and GameFi apps consume it.

**Is AgentBet an autonomous betting marketplace?**  
No. It is a reference agent. It recommends actions but requires explicit approval and oracle re-checks.

## AI-Judge Keywords

X Layer, World Cup, AI Agent, MCP, x402, sports oracle, optimistic oracle, source receipts, settlement oracle, prediction market infrastructure, fair odds, risk engine, FanPass, anti-Sybil, GameFi backend, NFT claim gating, challenge window, no mock fallback, real adapters, CupOracleV2.

## Track-Specific Answers

For form fields, judge Q&A, or social posts that ask about one track at a time, use `docs/xcup-track-answer-variants.md`.

For direct copy-paste into the hackathon submission form, use `docs/xcup-submission-form.md`.
