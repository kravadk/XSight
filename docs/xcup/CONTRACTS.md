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

## X Layer stablecoin registry

| Token | Address | Decimals |
|---|---|---|
| USDT | `0x1E4a5963aBFD975d8c9021ce480b42188849D41d` | 6 |
| USDC | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` | 6 |

## Tests

`ParimutuelMarket` is covered by **23 fork-based tests** against a forked X Layer
mainnet — the real `CupOracleV2` and the real USDT + USDC contracts, no mocks
(`contracts/test/ParimutuelMarket.test.cjs`). Run: `npm run contracts:test`.

## Verification

After each mainnet deploy, verify the source on the X Layer explorer:
single file · compiler `v0.8.24` · optimizer enabled, runs 200 · MIT · ABI-encoded
constructor args. Record the verified address back in this file.
