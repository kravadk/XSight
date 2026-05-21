# CupOracle Deploy Notes

CupHub now includes `contracts/CupOracleV2.sol`, an optimistic settlement registry for X Layer with evidence hashes, evidence URIs, and source-count checks.

## Environment

Set these in `server/.env`:

```bash
DEPLOYER_PRIVATE_KEY=0x...
X_LAYER_RPC_URL=https://rpc.xlayer.tech
CUP_ORACLE_CHALLENGE_WINDOW=3600
CUP_ORACLE_V2_ADDRESS=
CUP_WRITE_API_ENABLED=false
CUP_WRITE_API_KEY=
FOOTBALL_DATA_API_KEY=
THESPORTSDB_API_KEY=
ESPN_SOURCE_ENABLED=true
DATABASE_URL=
X402_ASSET_ADDRESS=
```

Do not put the private key in `.env.example`, frontend `.env.local`, GitHub, chat, screenshots, or deployment logs. It belongs only in the local uncommitted `server/.env`.

Use a **fresh dedicated wallet** for this hackathon demo. The private key must derive the same address as `AGENTIC_WALLET_ADDRESS`; the server checks this before signing.

To create a new local demo wallet:

```bash
npm --prefix server run wallet:create
```

Copy the printed `AGENTIC_WALLET_ADDRESS` and `DEPLOYER_PRIVATE_KEY` into `server/.env`. The script does not edit `.env` for you.

Check sports adapter readiness:

```bash
curl http://localhost:8787/api/cup/adapters
```

Production mode never uses `XSight seed`. If free sports providers are missing, rate-limited, conflicting, or empty, CupHub returns `source_quorum_unavailable`, `provider_rate_limited`, or `conflicting_sources` instead of fabricating fixtures. For settlement proposal, CupHub expects at least two agreeing live sources.

## Tokens Needed

For CupOracle deployment:

- Need: a small amount of **OKB on X Layer** in `AGENTIC_WALLET_ADDRESS`; use at least `0.005 OKB` for a comfortable deploy buffer.
- Why: OKB pays gas for contract deployment, seeding matches, proposing, challenging, and finalizing.
- Not needed for deploy: USDT.

For x402/economy-loop demos:

- Need: **USDT on X Layer** only if you want paid API revenue and auto-deploy demos to move real funds.
- Need: OKB for normal gas-bearing transactions unless the asset/action is gas-sponsored.

Recommended local check:

```bash
curl http://localhost:8787/api/cup/readiness
```

The response tells you whether `DEPLOYER_PRIVATE_KEY`, `AGENTIC_WALLET_ADDRESS`, OKB gas balance, and `CUP_ORACLE_V2_ADDRESS` are ready. It never returns the private key.

After deployment, set:

```bash
CUP_ORACLE_V2_ADDRESS=0x...
```

Then register current live source-backed CupHub fixtures:

```bash
npm --prefix server run seed:cup-oracle
```

## Deploy

```bash
npm --prefix server run deploy:cup-oracle
```

The script:

1. Compiles `contracts/CupOracleV2.sol` with `solc`.
2. Writes `contracts/artifacts/CupOracleV2.json`.
3. Deploys to the configured X Layer RPC.
4. Prints the deployed address for `CUP_ORACLE_V2_ADDRESS`.

## Seed Matches

`npm --prefix server run seed:cup-oracle` reads current live CupHub fixtures from `server/src/services/cupData.ts` and calls:

```solidity
registerMatch(matchId, rulesHash, sourceHash, evidenceHash, evidenceUri)
```

This anchors each fixture's settlement rules, source receipt hash, and evidence pointer on X Layer. Dev-only seeded matches are skipped.

## Settlement API

Local CupHub can sign real CupOracle settlement transactions from the backend signer when:

```bash
CUP_WRITE_API_ENABLED=true
```

Keep this disabled or protect it with auth before a public deployment. These endpoints spend OKB gas from `AGENTIC_WALLET_ADDRESS`.

If `CUP_WRITE_API_KEY` is set, include it in write calls:

```bash
X-CUP-ADMIN-KEY: your-local-admin-key
```

When `NODE_ENV=production`, the server requires `CUP_WRITE_API_KEY` for write calls even if `CUP_WRITE_API_ENABLED=true`.

```bash
curl -X POST http://localhost:8787/api/cup/propose-result \
  -H "Content-Type: application/json" \
  -d '{"matchId":"<live-match-id>","outcome":"HOME"}'

curl -X POST http://localhost:8787/api/cup/challenge-result \
  -H "Content-Type: application/json" \
  -d '{"matchId":"<live-match-id>"}'

curl -X POST http://localhost:8787/api/cup/finalize-result \
  -H "Content-Type: application/json" \
  -d '{"matchId":"<live-match-id>"}'
```

Normal `finalize-result` only works after the configured challenge window has passed. Emergency finalize exists only as owner recovery and is not part of the normal demo path.

Recent settlement transactions are available at:

```bash
curl "http://localhost:8787/api/cup/settlement-log?matchId=<live-match-id>"
```

## Legacy Deployment

## Current CupOracleV2 Deployment

- Contract: `0xE4dFef03E107225f2239CFfF955a378A9a8158Be`
- Explorer: https://www.okx.com/web3/explorer/xlayer/address/0xE4dFef03E107225f2239CFfF955a378A9a8158Be
- Deploy tx: `0x143e34020471c5663fe55e7070521557139a7172ff51f878a9c08bb2aea9f06f`

Registered live ESPN fixture transactions:

- `cup-mex-rsa-2026-06-11t19-00`: `0x7670baca57466208f9bbb050d2b5eac4d0c6ee71fe25a369842790bf75fa01a3`
- `cup-kor-cze-2026-06-12t02-00`: `0x55720e4243d78c60c818ad75890567ce7f854c78a3946068f03e58280928e1eb`

## Legacy V1 Deployment

- Legacy CupOracleV1 contract: `0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f`
- Explorer: https://www.okx.com/web3/explorer/xlayer/address/0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f
- Deploy tx: `0x17678837464fd0a9950fa35c0ae11344326a809a1f624d128ec5196fc385bc5e`

This deployment is legacy proof only because it was registered from seeded fixtures. Production-core submission should deploy CupOracleV2 and register live source-backed matches.

## Contract Shape

The contract supports:

- `registerMatch(bytes32 matchId, bytes32 rulesHash, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri)`
- `updateSourceEvidence(bytes32 matchId, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri)`
- `proposeResult(bytes32 matchId, Outcome outcome, bytes32 evidenceHash, string evidenceUri, uint8 sourceCount)`
- `challengeResult(bytes32 matchId, string reasonUri)`
- `finalizeResult(bytes32 matchId)`
- `emergencyFinalize(bytes32 matchId, Outcome outcome)`
- `getMatch(bytes32 matchId)`

This is intentionally smaller than UMA/Polymarket. It gives CupHub an X Layer settlement anchor while keeping the hackathon MVP deployable.
