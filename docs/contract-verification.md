# Contract Verification — X Layer Mainnet

> **Why this matters.** DESIGN §12: an unverified contract reads as "недороблено" — a judge (and any agent) inspecting the chain must be able to see the source. Verification makes `CupOracleV2`, `ParimutuelMarket`, `FanPassSBT` (and `BracketNFT` once deployed) show their source on the OKX X Layer explorer.
>
> **This is an operator runbook**, not code — it needs the OKX/OKLink explorer (a key or the web UI). The XSight contracts are **dependency-free single files**, so verification is straightforward: no flattening is needed — submit the `.sol` file as-is.

---

## 1. Contracts to verify

| Contract | Source file | Constructor args | Deployed address |
|---|---|---|---|
| `CupOracleV2` | `contracts/CupOracleV2.sol` | `challengeWindow` (uint) — see `server/scripts/deploy-cup-oracle.ts` / `CUP_ORACLE_CHALLENGE_WINDOW` | `CUP_ORACLE_V2_ADDRESS` in `server/.env` |
| `ParimutuelMarket` | `contracts/ParimutuelMarket.sol` | `(token, oracle, operator, treasury, feeBps)` — see `server/scripts/deploy-parimutuel-market.ts` | `PARIMUTUEL_MARKET_ADDRESS` in `server/.env` |
| `FanPassSBT` | `contracts/FanPassSBT.sol` | none | `FANPASS_SBT_ADDRESS` in `server/.env` |
| `BracketNFT` | `contracts/BracketNFT.sol` | `baseURI` (string) — see `server/scripts/deploy-bracket-nft.ts` | `BRACKET_NFT_ADDRESS` (set after deploy — Plan 11) |

The exact deployed addresses are in `server/.env` (never commit that file). `BracketNFT` is verified only after it is deployed.

## 2. Compiler settings — must match the deploy exactly

Every contract was (or will be) compiled by the `server/scripts/deploy-*.ts` scripts with **identical** settings — the explorer must be given the same:

- **Compiler version:** the **`solc` npm package** version the `deploy-*.ts` scripts compile with — `package.json` pins `solc` at `^0.8.35`, so it resolves to a `0.8.35.x` release. Run `npm ls solc` for the exact version and select **that** in the explorer. Do **not** use the contracts' `^0.8.24` source pragma — the deployed bytecode is whatever `solc` actually resolved to, not the pragma floor.
- **Optimizer:** enabled, **200 runs**
- **EVM version:** the deploy scripts pass no explicit `evmVersion`, so the resolved solc release's default applies — do **not** override it in the explorer; pick the default.
- **License:** MIT (`// SPDX-License-Identifier: MIT` is in each file)
- **No imports / no flattening:** each contract is a single self-contained file (`BracketNFT.sol` declares one helper `interface` in the same file — submit the whole file).

A settings mismatch is the #1 cause of a failed verification — bytecode won't match.

## 3. Method A — manual, via the OKX X Layer explorer (no key needed)

1. Open the contract on the explorer: `https://www.okx.com/web3/explorer/xlayer/address/<ADDRESS>`.
2. Open the **Contract → Verify & Publish** tab.
3. Choose **Solidity (Single file)**.
4. Set: compiler `v0.8.24`, optimization **Yes / 200**, license **MIT**.
5. Paste the full contents of the contract's `.sol` file.
6. Provide the **ABI-encoded constructor arguments** (see §4). `FanPassSBT` has none — leave blank.
7. Submit. On success the explorer shows the green "Verified" source tab.

## 4. Constructor arguments (ABI-encoded)

The explorer wants the constructor args **ABI-encoded, hex, without the `0x`**. The simplest way to get them:

```bash
# from the repo root — encode the exact args each contract was deployed with
node -e "const {AbiCoder}=require('ethers');console.log(AbiCoder.defaultAbiCoder().encode(['uint256'],[3600]).slice(2))"   # CupOracleV2: challengeWindow (example 3600)
node -e "const {AbiCoder}=require('ethers');console.log(AbiCoder.defaultAbiCoder().encode(['string'],['https://x-sight.vercel.app/bracket/']).slice(2))"   # BracketNFT: baseURI
```

For `ParimutuelMarket` encode `['address','address','address','address','uint16']` with the exact `(token, oracle, operator, treasury, feeBps)` the deploy used. Use the **real** values from `server/.env` / the deploy logs — the encoded bytes must match the on-chain deployment, or verification fails.

> Tip: the explorer can often read the constructor args straight from the deployment transaction's input data — check the contract's creation tx first; you may not need to encode anything by hand.

## 5. Method B — `hardhat verify` (scriptable, needs an OKLink API key)

> ⚠️ **Compiler-version caveat.** `hardhat.config.cjs` pins `solidity.version` to `0.8.24`, but the deployed contracts were compiled by the `solc`-npm-based `deploy-*.ts` scripts (`solc ^0.8.35`). For `hardhat verify` to reproduce the on-chain bytecode you must first set `hardhat.config.cjs`'s `solidity.version` to the exact `solc` package version (`npm ls solc`) — otherwise verification fails on a bytecode mismatch. If in doubt, use **Method A**.

`hardhat.config.cjs` already has `@nomicfoundation/hardhat-toolbox` (which bundles `hardhat-verify`). To use it for X Layer (chain 196), add an `etherscan` block with a `customChains` entry, because X Layer is not a built-in Hardhat network:

```js
// add to module.exports in hardhat.config.cjs
etherscan: {
  apiKey: { xlayer: process.env.OKLINK_API_KEY || "" },
  customChains: [
    {
      network: "xlayer",
      chainId: 196,
      urls: {
        // Confirm the current X Layer verification endpoint in the OKLink docs
        // (https://www.oklink.com/docs) before relying on this — OKLink's API
        // path has changed across versions.
        apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER",
        browserURL: "https://www.okx.com/web3/explorer/xlayer",
      },
    },
  ],
},
```

Then, with `OKLINK_API_KEY` set:

```bash
npx hardhat verify --network xlayer <FANPASS_SBT_ADDRESS>
npx hardhat verify --network xlayer <CUP_ORACLE_V2_ADDRESS> 3600
npx hardhat verify --network xlayer <PARIMUTUEL_MARKET_ADDRESS> <token> <oracle> <operator> <treasury> <feeBps>
npx hardhat verify --network xlayer <BRACKET_NFT_ADDRESS> "https://x-sight.vercel.app/bracket/"
```

If the OKLink API rejects the request, fall back to **Method A** (manual) — it always works.

## 6. Verification checklist

- [ ] `FanPassSBT` verified on the explorer (no constructor args)
- [ ] `CupOracleV2` verified (constructor: `challengeWindow`)
- [ ] `ParimutuelMarket` verified (constructor: token, oracle, operator, treasury, feeBps)
- [ ] `BracketNFT` deployed, then verified (constructor: `baseURI`) — only if it ships
- [ ] Each verified page shows compiler `0.8.24`, optimizer `200`, MIT license
- [ ] The Developers screen's contract links (`/developers`) open the now-verified explorer pages

Once every box is checked, the §12 "verified on-chain" deliverable is genuinely met.
