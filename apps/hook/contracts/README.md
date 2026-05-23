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

- **PoolManager:** `0x360e68faccca8ca495c1b759fd9eee466db9fb32`
- **PositionManager:** `0xcf1eafc6928dc385a342e7c6491d371d2871458b`
- **StateView:** `0x76fd297e2d437cd7f76d50f01afe6160f86e9990`
- **Universal Router 2.1.1:** `0x8b844f885672f333bc0042cb669255f93a4c1e6b`
- **Permit2:** `0x000000000022D473030F116dDEE9F6B43aC78BA3`

Source: https://developers.uniswap.org/contracts/v4/deployments (verified 2026-05-23).

## Status

| Day | Goal | State |
|---|---|---|
| 1 (Sat 23) | Foundry workspace, V4 deps, FanFeeHook stub compiles | ✅ done |
| 2 (Sun 24) | tier→fee logic, FanScoreRegistry, CupSidePot, fuzz tests | pending |
| 3 (Mon 25) | HookMiner + deploy to X Layer mainnet + pool init | pending |
| 4 (Tue 26) | side-pot weekly settle, backtest | pending |
| 5 (Wed 27) | demo video, Twitter, submission form | pending |
