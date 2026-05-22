# Contract Verification — X Layer Mainnet

> **Why this matters.** An unverified contract reads as unfinished — a judge (or any
> agent) inspecting the chain must be able to see the source. Verification makes the
> X Cup contracts show their source on the OKX X Layer explorer.
>
> **This is an operator runbook**, not code — it needs the OKX/OKLink explorer (the
> web UI, or an OKLink key). The X Cup contracts are **dependency-free single
> files**, so verification is straightforward: no flattening — submit the `.sol`
> file as-is.

---

## 1. Contracts to verify

The active stack is the bonded-oracle V3 set. Addresses and the ABI-encoded
constructor arguments are in **`docs/xcup/CONTRACTS.md`** (the single source of
truth — do not duplicate them here).

| Contract | Source file | Constructor |
|---|---|---|
| `CupOracleV3` | `contracts/CupOracleV3.sol` | `(bondToken, bondAmount, challengeWindow, protocolFeeBps, safetyPeriod, treasury, arbiter)` |
| `ArbiterMultisig` | `contracts/ArbiterMultisig.sol` | `(address[] signers, uint256 threshold)` |
| `ParimutuelMarket` | `contracts/ParimutuelMarket.sol` | `(token, oracle, operator, treasury, feeBps, minStake)` |
| `FanPassSBT` | `contracts/FanPassSBT.sol` | see `server/scripts/deploy-fanpass-sbt.ts` |
| `BracketNFT` | `contracts/BracketNFT.sol` | `baseURI` (string) — verify only after it is deployed |

The pre-hardening `CupOracleV2` and its V2-era market are **superseded** and do not
need verification.

## 2. Compiler settings — must match the deploy exactly

Every contract was compiled by the `server/scripts/deploy-*.ts` scripts with
**identical** settings — give the explorer the same:

- **Compiler version:** the **`solc` npm package** version the `deploy-*.ts` scripts
  compile with. `package.json` pins `solc` at `^0.8.35` — run `npm ls solc` for the
  exact resolved release and select **that** in the explorer. Do **not** use the
  source pragma `^0.8.24` — the deployed bytecode is whatever `solc` resolved to.
- **Optimizer:** enabled, **200 runs**.
- **EVM version:** the deploy scripts pass no explicit `evmVersion` — pick the
  explorer default; do not override it.
- **License:** MIT (`// SPDX-License-Identifier: MIT` is in each file).
- **No imports / no flattening:** each contract is a single self-contained file —
  submit the whole file.

A settings mismatch is the #1 cause of a failed verification — the bytecode won't
match.

## 3. Method A — manual, via the OKX X Layer explorer (no key needed)

1. Open the contract: `https://www.okx.com/web3/explorer/xlayer/address/<ADDRESS>`.
2. Open the **Contract → Verify & Publish** tab.
3. Choose **Solidity (Single file)**.
4. Set: compiler = the resolved `solc` version from §2, optimization **Yes / 200**,
   license **MIT**.
5. Paste the full contents of the contract's `.sol` file.
6. Provide the **ABI-encoded constructor arguments** — copy them from the
   "Verification" section of `docs/xcup/CONTRACTS.md` (no `0x` prefix).
7. Submit. On success the explorer shows the green "Verified" source tab.

> Tip: the explorer can often read the constructor args straight from the creation
> transaction's input data — check the contract's deployment tx first; you may not
> need to encode anything by hand.

## 4. Method B — `hardhat verify` (scriptable, needs an OKLink API key)

> ⚠️ **Compiler-version caveat.** `hardhat.config.cjs` pins `solidity.version` to
> `0.8.24`, but the deployed contracts were compiled by the `solc`-npm-based
> `deploy-*.ts` scripts (`solc ^0.8.35`). For `hardhat verify` to reproduce the
> on-chain bytecode you must first set `hardhat.config.cjs`'s `solidity.version` to
> the exact `solc` package version (`npm ls solc`) — otherwise verification fails on
> a bytecode mismatch. If in doubt, use **Method A**.

`hardhat.config.cjs` already bundles `hardhat-verify` (via
`@nomicfoundation/hardhat-toolbox`). X Layer is not a built-in Hardhat network, so
add an `etherscan` block with a `customChains` entry:

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
        // (https://www.oklink.com/docs) before relying on this.
        apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER",
        browserURL: "https://www.okx.com/web3/explorer/xlayer",
      },
    },
  ],
},
```

Then, with `OKLINK_API_KEY` set, run `npx hardhat verify --network xlayer <ADDRESS>
<constructor args…>` for each contract. If the OKLink API rejects the request, fall
back to **Method A** — it always works.

## 5. Verification checklist

- [ ] `CupOracleV3` verified (constructor: bondToken, bondAmount, challengeWindow, protocolFeeBps, safetyPeriod, treasury, arbiter)
- [ ] `ArbiterMultisig` verified (constructor: signers[], threshold)
- [ ] `ParimutuelMarket` verified (constructor: token, oracle, operator, treasury, feeBps, minStake)
- [ ] `FanPassSBT` verified
- [ ] `BracketNFT` deployed, then verified (constructor: `baseURI`) — once it ships
- [ ] Each verified page shows the resolved `solc` version, optimizer `200`, MIT
- [ ] The Developers screen's contract links open the now-verified explorer pages

Once every box is checked, the "verified on-chain" deliverable is genuinely met.
