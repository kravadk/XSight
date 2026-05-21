# X Cup — Contract Registry

All contracts target **X Layer mainnet (chain 196)**. Explorer:
`https://www.okx.com/web3/explorer/xlayer`.

## Deployed

| Contract | Address | Purpose |
|---|---|---|
| `CupOracleV2` | [`0xE4dFef03E107225f2239CFfF955a378A9a8158Be`](https://www.okx.com/web3/explorer/xlayer/address/0xE4dFef03E107225f2239CFfF955a378A9a8158Be) | Optimistic multi-source settlement oracle — `registerMatch` → `proposeResult` → challenge window → `finalizeResult`. Source: `contracts/CupOracleV2.sol`. |

## Pending deploy (user-gated — real OKB gas, live money-holding contract)

| Contract | Source | Deploy |
|---|---|---|
| `ParimutuelMarket` | `contracts/ParimutuelMarket.sol` | `npm --prefix server run deploy:parimutuel` — then verify on the X Layer explorer, set `PARIMUTUEL_MARKET_ADDRESS` + `PARIMUTUEL_DEPLOY_BLOCK`. |
| `FanPassSBT` | `contracts/FanPassSBT.sol` | `npm --prefix server run deploy:fanpass-sbt` — then set `FANPASS_SBT_ADDRESS`. |

`ParimutuelMarket` is **token-agnostic** — it settles in whichever X Layer stablecoin
`PARIMUTUEL_TOKEN_ADDRESS` points at.

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
