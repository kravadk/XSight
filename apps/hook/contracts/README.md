# Hook contracts — Uniswap V4 hook for OKX «Build with Hook»

Foundry workspace for the Solidity side of the [Hook hackathon submission](../README.md).

## Files

- `src/FanFeeHook.sol` — main V4 hook. Day-1 stub (compiles, sanity test passes).
  Day-2+ adds tier→fee logic, FanScoreRegistry read, CupSidePot routing.
- `test/FanFeeHook.t.sol` — Foundry tests (Day-1 sanity only; Day-2 expands to
  full PoolManager fixture + fuzz cases).
- `foundry.toml` — solc 0.8.30, evm cancun (V4 needs transient storage).
- `remappings.txt` — `@openzeppelin/uniswap-hooks/`, `@uniswap/v4-core/`,
  `@uniswap/v4-periphery/` resolved through OZ-bundled paths for version
  consistency.

## Dependencies (installed via forge)

- [`Uniswap/v4-core`](https://github.com/Uniswap/v4-core) — PoolManager, hook interfaces, types
- [`Uniswap/v4-periphery`](https://github.com/Uniswap/v4-periphery) — Universal Router, PositionManager
- [`OpenZeppelin/uniswap-hooks`](https://github.com/OpenZeppelin/uniswap-hooks) — `BaseHook`, `BaseDynamicFee`, fee helpers
- [`foundry-rs/forge-std`](https://github.com/foundry-rs/forge-std) — Foundry test utilities

`lib/` is git-ignored. On clone:

```bash
forge install Uniswap/v4-core --no-git
forge install Uniswap/v4-periphery --no-git
forge install OpenZeppelin/uniswap-hooks --no-git
```

## Build / test

```bash
forge build              # 40 files, ~1s
forge test --gas-report  # 1 sanity test passing
forge coverage           # Day 2+ when real tests land
forge snapshot           # Day 4 gas profile for README
```

## X Layer V4 deployment addresses (chain 196)

**Uniswap V4 infrastructure** (verified 2026-05-23 via
https://developers.uniswap.org/contracts/v4/deployments):

- **PoolManager:** `0x360e68faccca8ca495c1b759fd9eee466db9fb32`
- **PositionManager:** `0xcf1eafc6928dc385a342e7c6491d371d2871458b`
- **StateView:** `0x76fd297e2d437cd7f76d50f01afe6160f86e9990`
- **Universal Router 2.1.1:** `0x8b844f885672f333bc0042cb669255f93a4c1e6b`
- **Permit2:** `0x000000000022D473030F116dDEE9F6B43aC78BA3`

**Our contracts** (deployed 2026-05-23 on X Layer mainnet):

- **FanFeeHook:** [`0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0`](https://www.okx.com/web3/explorer/xlayer/address/0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0)
  — last byte `0xC0` matches BEFORE_SWAP_FLAG | AFTER_SWAP_FLAG permission bits
- **FanScoreRegistry:** [`0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820`](https://www.okx.com/web3/explorer/xlayer/address/0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820)
- **CupSidePot:** [`0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504`](https://www.okx.com/web3/explorer/xlayer/address/0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504)
- **Reads from FanPassSBT:** [`0x74F75532428A99E613a865C97D1084b7f38241BD`](https://www.okx.com/web3/explorer/xlayer/address/0x74F75532428A99E613a865C97D1084b7f38241BD)
- **Operator (writes scores, settles pot):** `0x82736f84Ad234566180F902237e2Fb4c35177bDB`

On-chain verification (read-only `cast call`):
- `FanScoreRegistry.operator()` → `0x82736f...bDB` ✓
- `CupSidePot.token()` → USDC `0x74b7F1...d22` ✓
- `FanFeeHook.feeOf(<unknown wallet>)` → `3000` = 30 bps ✓

## Status

| Day | Goal | State |
|---|---|---|
| 1 (Sat 23) | Foundry workspace, V4 deps, FanFeeHook stub compiles | ✅ done |
| 2 (Sun 24) | tier→fee logic, FanScoreRegistry, CupSidePot, 55 tests | ✅ done |
| 3 (Mon 25) | HookMiner deploy + 3 contracts live on X Layer mainnet | ✅ done |
| 4 (Tue 26) | init test pool, side-pot weekly settle, backtest | pending |
| 5 (Wed 27) | demo video, Twitter, submission form | pending |
