# XSight CupOS Competitive Landscape

## Category

XSight CupOS is **sports outcome infrastructure for World Cup builders** on X Layer, combining sports data APIs, UMA-like settlement, x402 monetization, MCP agent tools, and FanPass reputation.

It is not another prediction market, fantasy game, NFT marketplace, or betting bot. CupOS is the backend those apps can consume: fixtures, source receipts, oracle state, AI fair odds, action plans, and wallet reputation.

## Comparable Projects

| Category | Comparable projects | What they prove | CupOS position |
|---|---|---|---|
| Prediction markets | Polymarket + UMA | User-facing markets need a resolution layer, rules, proposals, disputes, and finalized outcomes. | CupHub is not the market. It is the sports-specific fixture, receipt, and settlement backend that markets can call. |
| Optimistic oracle | UMA Optimistic Oracle | Optimistic settlement is a practical model: propose, challenge, resolve. | CupOracleV2 applies this pattern to World Cup outcomes on X Layer with rules/source/evidence hashes. |
| API-to-chain oracle | Chainlink Functions | Developers need a bridge from offchain APIs to onchain logic. | CupOS narrows the scope to sports outcomes and exposes receipts, quorum state, and builder APIs. |
| Sports data providers | SportsDataIO, SportMonks, football-data.org, ESPN, TheSportsDB | Sports apps need fixtures, scores, stats, IDs, and provider coverage. | CupOS consumes sports data, normalizes it, hashes receipts, and turns it into oracle-ready infrastructure. |
| Fantasy / NFT sports apps | Sorare-style fantasy and NFT games | Sports outcomes can power fantasy scoring, collectibles, and fan campaigns. | CupOS is the backend for these apps, not the game or marketplace itself. FanPass and Fantasy Quest Builder show how to consume it. |
| Agent tool layer | Sports MCP tools, Polymarket MCP-style integrations | AI agents need structured tools, not scraped pages. | CupOS exposes x402 APIs and MCP tools so agents can fetch fixtures, verify outcomes, score fans, and build action plans. |

## Why CupOS Is Different

- **Sports-specific settlement infra:** CupOS focuses on World Cup fixtures, source receipts, quorum, and finality instead of generic oracle questions.
- **Builder-first distribution:** x402 endpoints and MCP tools make CupHub usable by other apps and agents during the hackathon.
- **Not a market clone:** prediction markets, fantasy games, social campaigns, and NFT quests are consumers of CupOS, not competitors inside the same product.
- **Honest failure states:** if sources are missing, rate-limited, or conflicting, CupOS blocks settlement and reports the real state instead of filling with fake results.
- **Reputation included:** FanPass gives downstream apps an anti-Sybil and reward-gating primitive tied to CupHub activity.

## Why Benchmarks Prove The Thesis But Do Not Replace CupHub

| Benchmark | What it proves | Why it does not replace CupHub |
|---|---|---|
| Azuro | The strongest validation for an infra-over-frontend strategy: apps can build on a shared prediction-market protocol/SDK instead of every team creating its own liquidity and market backend. | Azuro is prediction-market and liquidity infrastructure. CupHub is not an AMM, vAMM, or liquidity tree. It is a sports outcome backend: fixtures, receipts, settlement state, AI risk, x402 APIs, MCP tools, and FanPass. |
| UMA / Polymarket resolution | Optimistic settlement is a practical pattern: propose, challenge, and finalize after a liveness period. | UMA is generic dispute resolution. CupOracleV2 applies the pattern narrowly to World Cup outcomes on X Layer and attaches sports provider receipts, source hashes, and evidence URI. |
| Chainlink / Overtime | Sports markets need reliable data feeds for pre-game probabilities and post-game results, and mature sports protocols depend on oracle data instead of inventing results. | Chainlink-style feeds are smart-contract data infrastructure. CupHub packages the surrounding builder experience: readable receipts, x402 access, MCP tools, AI fair odds, FanPass gates, and reference consumers. |
| SportsDataIO / SportMonks / Sportradar / Genius | B2B sports data is a real moat: builders pay for fixtures, scores, stats, IDs, odds, and official coverage. | These are data providers, not X Layer-native agent infrastructure. CupHub consumes accessible sports data and turns it into Web3-ready receipts, settlement checks, and agent-readable endpoints. |
| Sorare-style fantasy / NFT sports apps | Sports outcomes create consumer demand for fantasy scoring, collectibles, quests, and fan campaigns. | Sorare is a closed consumer app. CupHub is the backend a fantasy, NFT quest, or campaign app can consume through APIs, MCP, FanPass, and oracle finality. |
| x402 Bazaar / MCP marketplaces | Agent-tool monetization and machine-readable paid API discovery are emerging distribution channels. | Existing marketplaces are horizontal. CupHub is a vertical sports/Cup stack with domain-specific data, settlement, risk, and reputation. |

The submission framing should be: **Azuro-like infrastructure thinking, UMA-like settlement, SportsDataIO/SportMonks-like sports data inputs, and x402/MCP distribution, vertically packaged for World Cup apps on X Layer.**

## Judge-Safe Wording

Use:

- "CupOS is sports outcome infrastructure for World Cup builders."
- "CupHub is a sports-specific oracle and builder backend for X Layer apps."
- "CupOracleV2 uses an UMA-like optimistic settlement pattern: propose, challenge, finalize."
- "FanPass is a reputation and campaign-gating primitive, not a standalone social network."
- "AgentBet is a reference consumer that requires approval before action."

Avoid:

- "We are Polymarket."
- "AgentBet is an autonomous betting marketplace."
- "Sentiment resolves outcomes."
- "FanPassSBT is a full NFT marketplace."
- "CupOS guarantees results when providers are unavailable."

## Submission Shortcut

If Polymarket is the market and UMA is generic optimistic resolution, CupHub is the sports-specific oracle and builder backend for World Cup apps on X Layer.

## Reference Links

- [Polymarket resolution documentation](https://docs.polymarket.com/developers/resolution/UMA)
- [UMA Optimistic Oracle documentation](https://docs.uma.xyz/developers/optimistic-oracle/getting-started)
- [Chainlink Functions documentation](https://docs.chain.link/)
- [SportsDataIO APIs](https://sportsdata.io/apis)
- [SportMonks fixtures documentation](https://www.sportmonks.com/glossary/fixtures/)
- [Sorare](https://sorare.com/)
