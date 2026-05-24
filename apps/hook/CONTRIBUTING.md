# Contributing to FanFeeHook

We welcome forks and pull requests. This document explains the three most
common ways to extend the project.

## 1. Local development

```bash
# Front-end (lives in the umbrella XSight repo)
git clone https://github.com/kravadk/XSight
cd XSight
npm install
npm --prefix server install
npm run server:dev    # one terminal
npm run dev           # another - visit ?product=hook

# Contracts (Foundry workspace)
cd apps/hook/contracts
forge install Uniswap/v4-core --no-git
forge install Uniswap/v4-periphery --no-git
forge install OpenZeppelin/uniswap-hooks --no-git
forge install foundry-rs/forge-std --no-git
forge build
forge test --gas-report
```

## 2. Deploy to another chain

FanFeeHook is chain-agnostic - only the V4 PoolManager + token addresses
change. Adapt one env file and run the deploy script:

```bash
# Set in apps/hook/.env (see .env.example for the full list)
POOL_MANAGER=<v4 PoolManager on your chain>
FAN_PASS_SBT=<your SBT contract>          # any soulbound badge with balanceOf(address)
USDC_TOKEN=<payout token for CupSidePot>
OPERATOR=<server EOA that will write scores>
DEPLOYER_PRIVATE_KEY=<...>                # never commit!

# Deploy stack (FanScoreRegistry, CupSidePot, FanFeeHook via HookMiner)
cd apps/hook/contracts
forge script script/DeployFanFeeHook.s.sol \
  --rpc-url <your RPC> \
  --broadcast --private-key $DEPLOYER_PRIVATE_KEY

# Init a USDC/USDT pool wired to the hook
forge script script/InitTestPool.s.sol \
  --rpc-url <your RPC> \
  --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

That's the whole port. The contracts have no chain-specific assumptions
beyond what env you pass in.

## 3. Plug in a different reputation system

`FanScoreRegistry` is a generic 0-100 cache, but you don't have to use
*our* score formula. Any SBT or reputation system works - implement two
read methods on a small adapter:

```solidity
interface IReputationAdapter {
    function scoreOf(address wallet) external view returns (uint256);
    function updatedAt(address wallet) external view returns (uint64);
}
```

Then deploy a thin wrapper that exposes those two methods backed by your
data source (Optimism Attestation, BrightID, Passport XYZ, Gitcoin Passport,
ENS DAO membership tiers, a custom mapping, etc.) and pass its address as
`fanScoreRegistry` to `FanFeeHook`.

Tier thresholds (28 / 64 / 82) are encoded in the contract; fork and
adjust if your domain has a different distribution.

## 4. Pull requests

- Run `forge test` and `forge build` before pushing.
- Add Foundry tests for any new contract path.
- Include gas snapshot updates if you touch `src/*.sol`.
- Match the existing NatSpec style.
- Sign off commits with your real name (`git commit -s`).

## 5. Reporting security issues

See [`apps/hook/contracts/SECURITY.md`](contracts/SECURITY.md).
**Do not** open public issues for security findings.
