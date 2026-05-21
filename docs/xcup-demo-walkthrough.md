# X Cup Demo Walkthrough

## Core Narrative

XSight CupHub is not another prediction market. It is the missing backend for World Cup apps on X Layer:

1. Builders fetch fixtures and source receipts.
2. Agents price the event through AI edge, team strength, sentiment, and player stats.
3. CupOracleV2 anchors rules, source hashes, evidence hashes, and evidence URIs on X Layer.
4. A result is proposed on-chain.
5. Other apps wait through the challenge window or challenge the result.
6. Finalized outcome becomes the canonical primitive for prediction markets, fantasy, NFT quests, and agent workflows.

The detailed product flow and "what if something goes wrong" logic lives in `docs/xcup-cupos-product-flow.md`. The full submission copy lives in `docs/xcup-submission-package.md`.

## Local Demo URLs

- Frontend: `http://127.0.0.1:5174/`
- Backend: `http://localhost:8787`
- CupHub overview: `http://localhost:8787/api/cup/overview`
- CupOracle readiness: `http://localhost:8787/api/cup/readiness`
- x402 spec: `http://localhost:8787/api/v1/x402-spec`
- MCP discovery: `http://localhost:8787/mcp`

## On-Chain Proof

- CupOracleV2: `0xE4dFef03E107225f2239CFfF955a378A9a8158Be`
- V2 explorer: `https://www.okx.com/web3/explorer/xlayer/address/0xE4dFef03E107225f2239CFfF955a378A9a8158Be`
- Deploy tx: `0x143e34020471c5663fe55e7070521557139a7172ff51f878a9c08bb2aea9f06f`
- Registered live fixtures:
  - `cup-mex-rsa-2026-06-11t19-00`: `0x7670baca57466208f9bbb050d2b5eac4d0c6ee71fe25a369842790bf75fa01a3`
  - `cup-kor-cze-2026-06-12t02-00`: `0x55720e4243d78c60c818ad75890567ce7f854c78a3946068f03e58280928e1eb`

## 90-Second Video Flow

| Time | Screen | Say |
|---|---|---|
| 0-10s | XSight sidebar, CupHub tab | "XSight CupHub is not another prediction market. It is the backend World Cup apps need on X Layer." |
| 10-30s | Fixture registry and receipts | "Builders get real fixtures, provider URLs, normalized receipts, confidence, source hashes, and honest quorum states." |
| 30-45s | Settlement receipts and CupOracleV2 | "CupOracleV2 anchors rules, source hashes, evidence URI, proposal, challenge window, and final outcome on X Layer." |
| 45-60s | AI edge / fair odds | "The AI risk layer gives fair probabilities, decimal odds, confidence, settlement risk, and no-trade recommendations. These are signals, not truth." |
| 60-72s | FanPass + SBT | "FanPass gives campaigns wallet reputation and a non-transferable SBT proof badge for NFT/reward gating. The mint is operator-gated and visible on X Layer." |
| 72-84s | x402 Pay & Call | "Now a builder wallet pays USDT on X Layer, retries the endpoint with the payment tx, and receives Cup intelligence JSON. Fans are not charged for browsing; apps and agents pay per verified call." |
| 84-90s | AgentBet + MCP | "AgentBet proves agents can consume CupHub: observe, decide, require approval, verify. MCP tools expose the same infrastructure to other agents." |

## Fallback Lines

- If no final result quorum is available: "This is the intended production behavior: CupHub refuses to settle until enough real sources agree."
- If player stats are unavailable: "Player impact is an optional GameFi signal. CupHub shows an honest unavailable state instead of inventing players."
- If settlement write buttons are disabled: "Writes are gated by quorum, CupOracle state, and operator auth. Read APIs remain available to builders."
- If x402 returns 402: "Paid endpoints expose a structured payment-required response until a real X Layer payment proof is attached."
- If Pay & Call is skipped: "The button is the live wallet version of the same x402 flow; for video timing, the copied curl/spec shows the same payment contract."
- If SBT mint is blocked: "This is correct: FanPassSBT only mints when the wallet is eligible, the contract is configured, and the write API is authorized."

## Judge Pitch

Everyone can build a World Cup prediction market. The hard part is shared infrastructure: fixtures, source receipts, result settlement, AI edge, player stats, fan reputation, x402 monetization, and MCP tools. XSight CupHub makes World Cup apps on X Layer more complete by giving them those primitives in one reusable layer.

## What Not To Overemphasize

- Do not pitch CupLP.
- Do not pitch AgentBet as a full marketplace in MVP.
- Do not claim sentiment is canonical truth. It is an AI input signal only.
- Do not expose private keys, API keys, or screenshots of `server/.env`.
