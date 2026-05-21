# CupHub Research Links and Implementation Notes

## Hackathon / Chain

- OKX X Layer network docs: https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/network-information
  - Mainnet chain id: `196`
  - Native token: `OKB`
  - Explorer: `https://www.okx.com/web3/explorer/xlayer`

## Settlement / Prediction Market Resolution

- Polymarket resolution docs: https://docs.polymarket.com/concepts/resolution
  - Useful precedent: markets need pre-defined resolution rules.
  - Anyone can propose an outcome; anyone can dispute it.
  - A challenge period exists before finalization.
  - This supports the CupHub design: source receipts + rules hash + optimistic settlement state.

## Sports Data Adapters

- football-data.org v4 docs: https://docs.football-data.org/general/v4/coding_client.html
  - Useful endpoints: team matches, competition matches, scheduled/finished filters.
  - Good for fixtures and final match status.

- TheSportsDB docs: https://www.thesportsdb.com/documentation
  - Useful endpoints: event lookup, event results, event stats, event timeline, schedules.
  - Good fallback/source cross-check for fixtures, stats, and player/team metadata.

- ESPN public site API reference target:
  - `https://site.api.espn.com/apis/site/v2/sports/soccer/scoreboard`
  - Treat as a low-trust adapter unless a stable official contract is confirmed.

## Agent / API Distribution

- x402 docs: https://docs.x402.org/
  - x402 enables HTTP-native paid APIs using `402 Payment Required`.
  - Strong fit for CupHub because other apps and agents can pay per fixture, result, edge, or FanPass lookup.

- Model Context Protocol docs: https://modelcontextprotocol.io/docs/sdk
  - MCP is the agent-facing integration layer.
  - CupHub tools should expose `get_cup_fixtures`, `verify_outcome`, `get_cup_ai_edge`, `get_fan_score`, and `build_cup_action_plan`.

## Similar / Adjacent Products

- Polymarket: user-facing prediction market. CupHub should not clone it; CupHub should supply resolution and signal infrastructure.
- UMA Optimistic Oracle: general optimistic resolution model. CupHub uses the same design shape at hackathon scope: propose, challenge, finalize.
- Sports data APIs such as football-data.org and TheSportsDB: source adapters. CupHub should hash receipts and expose source confidence instead of trusting one provider blindly.

## MVP Adapter Policy

For the first hackathon build:

1. Ship the CupHub API and UI against live free sports providers, starting with ESPN public scoreboard.
2. Keep every fixture/result marked with `sourceMode` and `sourceStatus`.
3. Attach source receipts with hashes, URLs, normalized payloads, and evidence hashes.
4. Add football-data.org and TheSportsDB behind the same service interface when free API keys are available.
5. Never present seeded demo data as official live World Cup data.
