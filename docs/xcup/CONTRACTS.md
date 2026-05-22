# X Cup — Contract Registry

All contracts target **X Layer mainnet (chain 196)**. Explorer:
`https://www.okx.com/web3/explorer/xlayer`.

## Deployed — X Layer mainnet

| Contract | Address | Purpose |
|---|---|---|
| `CupOracleV2` | [`0xE4dFef03E107225f2239CFfF955a378A9a8158Be`](https://www.okx.com/web3/explorer/xlayer/address/0xE4dFef03E107225f2239CFfF955a378A9a8158Be) | Optimistic multi-source settlement oracle — `registerMatch` → `proposeResult` → challenge window → `finalizeResult`. Source: `contracts/CupOracleV2.sol`. |
| `ParimutuelMarket` | [`0xdB4F6A0CC67B3dF1f25129079E3f45b996A4B9D7`](https://www.okx.com/web3/explorer/xlayer/address/0xdB4F6A0CC67B3dF1f25129079E3f45b996A4B9D7) | Pari-mutuel pool — holds USDT, settles pro-rata off `CupOracleV2`. Settles in **USDT**; oracle `0xE4dFef03…`; operator/treasury `0x82736f84…`; fee 0 bps. Deploy block `60609636`, tx `0x05815fc4…630ba8`. Source: `contracts/ParimutuelMarket.sol`. |
| `FanPassSBT` | [`0x74F75532428A99E613a865C97D1084b7f38241BD`](https://www.okx.com/web3/explorer/xlayer/address/0x74F75532428A99E613a865C97D1084b7f38241BD) | Soulbound fan-reputation badge. Source: `contracts/FanPassSBT.sol`. |

`ParimutuelMarket` is **token-agnostic** — the deployed instance settles in USDT
(`PARIMUTUEL_TOKEN_ADDRESS`).

## Built, fork-tested, awaiting a user-gated deploy

The bonded-oracle hardening (`docs/xcup/HARDENING-PLAN.md`) is implemented and
fork-tested but **not yet on mainnet** — the redeploy is a user-gated action.

| Contract | Status | Purpose |
|---|---|---|
| `CupOracleV3` | Built · fork-tested | Bonded optimistic oracle — `proposeResult`/`challengeResult` post a USDT bond, the loser's bond is slashed to the winner, a challenged result routes to a pluggable arbiter; `flag` + timelocked `resolveManually` replace the instant `emergencyFinalize`. `getMatch` keeps the V2 layout. Source: `contracts/CupOracleV3.sol`. |
| `ArbiterMultisig` | Built · fork-tested | M-of-N (2-of-3) arbiter — `ICupArbiter`; signers vote a ruling, the threshold ruling calls `resolveChallenge` back on the oracle. Source: `contracts/ArbiterMultisig.sol`. |

Deploy (user-gated): `npm --prefix server run deploy:cup-oracle-v3` deploys
`ArbiterMultisig` → `CupOracleV3` → wires `setOracle`. Then redeploy
`ParimutuelMarket` against the new oracle (its `oracle` is immutable) and set
`CUP_ORACLE_V3_ADDRESS` + `CUP_ARBITER_ADDRESS` in `server/.env`. Bond economics
confirmed: 50 USDT bond, 0% protocol fee, 1 h challenge window, 1 h safety timelock.

## X Layer stablecoin registry

| Token | Address | Decimals |
|---|---|---|
| USDT | `0x1E4a5963aBFD975d8c9021ce480b42188849D41d` | 6 |
| USDC | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` | 6 |

## Tests

`ParimutuelMarket` is covered by **23 fork-based tests** against a forked X Layer
mainnet — the real `CupOracleV2` and the real USDT + USDC contracts, no mocks
(`contracts/test/ParimutuelMarket.test.cjs`).

`CupOracleV3` + `ArbiterMultisig` are covered by **19 fork-based tests** — real X
Layer USDT as the bond token, no mocks: bonded propose/challenge, bond return on an
unchallenged finalize, slash on a resolved challenge (both rulings), the timelocked
`flag`/`resolveManually` and arbiter change, and a full `ParimutuelMarket` lifecycle
against `CupOracleV3.getMatch` (`contracts/test/CupOracleV3.test.cjs`).

Run both fork suites: `npm run contracts:test` (or `contracts:test:oracle-v3` alone).

## Verification

After each mainnet deploy, verify the source on the X Layer explorer:
single file · compiler `v0.8.24` · optimizer enabled, runs 200 · MIT · ABI-encoded
constructor args. Record the verified address back in this file.
