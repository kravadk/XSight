# X Cup — Contract Registry

All contracts target **X Layer mainnet (chain 196)**. Explorer:
`https://www.okx.com/web3/explorer/xlayer`.

## Deployed — X Layer mainnet

### Active stack — bonded oracle (V3)

| Contract | Address | Purpose |
|---|---|---|
| `CupOracleV3` | [`0x19da7aab20Be913fb697ebfef4b8f12Ac463Ebf6`](https://www.okx.com/web3/explorer/xlayer/address/0x19da7aab20Be913fb697ebfef4b8f12Ac463Ebf6) | Bonded optimistic settlement oracle — `proposeResult`/`challengeResult` post a 50-USDT bond, the loser's bond is slashed to the winner, a challenged result routes to the arbiter; `flag` + timelocked `resolveManually` replace the instant `emergencyFinalize`. `getMatch` keeps the V2 layout. bondToken USDT · 1 h challenge window · 0% protocol fee · 1 h safety timelock. Source: `contracts/CupOracleV3.sol`. |
| `ArbiterMultisig` | [`0x792152c274c42C588D5551C9141C21106d3A2Cce`](https://www.okx.com/web3/explorer/xlayer/address/0x792152c274c42C588D5551C9141C21106d3A2Cce) | M-of-N arbiter (`ICupArbiter`) for challenged results — deployed **1-of-1** (operator `0x82736f84…`); the oracle's `arbiter` is timelock-upgradeable to a larger panel. Source: `contracts/ArbiterMultisig.sol`. |
| `ParimutuelMarket` | [`0x0431576845B77a743C87be323c04fad02201E08b`](https://www.okx.com/web3/explorer/xlayer/address/0x0431576845B77a743C87be323c04fad02201E08b) | Pari-mutuel pool — holds USDT, settles pro-rata off `CupOracleV3`. Settles in **USDT**; oracle `0x19da7aab…`; operator/treasury `0x82736f84…`; fee 0 bps; minStake 0; last-claimer dust absorption. Deploy block `60680302`, tx `0x9be09b2a…c209e8`. Source: `contracts/ParimutuelMarket.sol`. |
| `FanPassSBT` | [`0x74F75532428A99E613a865C97D1084b7f38241BD`](https://www.okx.com/web3/explorer/xlayer/address/0x74F75532428A99E613a865C97D1084b7f38241BD) | Soulbound fan-reputation badge. Source: `contracts/FanPassSBT.sol`. |

### Superseded — pre-hardening (V2)

| Contract | Address | Note |
|---|---|---|
| `CupOracleV2` | `0xE4dFef03E107225f2239CFfF955a378A9a8158Be` | Pre-bond optimistic oracle — replaced by `CupOracleV3`. |
| `ParimutuelMarket` (V2-era) | `0xdB4F6A0CC67B3dF1f25129079E3f45b996A4B9D7` | Pointed at `CupOracleV2`; replaced by the V3-era market above. |

`ParimutuelMarket` is **token-agnostic** — the deployed instance settles in USDT
(`PARIMUTUEL_TOKEN_ADDRESS`). The bonded-oracle hardening is described in
`docs/xcup/HARDENING-PLAN.md`.

## X Layer stablecoin registry

| Token | Address | Decimals |
|---|---|---|
| USDT | `0x1E4a5963aBFD975d8c9021ce480b42188849D41d` | 6 |
| USDC | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` | 6 |

## Tests

`ParimutuelMarket` is covered by **26 fork-based tests** against a forked X Layer
mainnet — real oracle, real USDT + USDC, no mocks; including minStake and the
last-claimer dust absorption (`contracts/test/ParimutuelMarket.test.cjs`).

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
