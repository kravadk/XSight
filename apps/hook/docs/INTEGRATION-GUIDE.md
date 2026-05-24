# Integration Guide — plug FanFeeHook into your protocol

> 60-second integration · 3 ready-to-fork reputation adapters ·
> one-command deploy on any chain with Uniswap V4.

## What you get

A drop-in V4 hook that gates LP fees by on-chain reputation:

| Tier | Score window | Fee |
|---|---|---|
| 0 — unknown | 0..27 | 30 bps |
| 1 — active | 28..63 | 20 bps |
| 2 — trusted | 64..81 | 10 bps |
| 3 — oracle-grade | 82..100 | 5 bps |

Thresholds are constants in `FanFeeHook.sol`; fork and adjust if your
domain has a different score distribution.

---

## 60-second integration — point your pool at FanFeeHook

If you already trust the live deployment on X Layer mainnet, you can
re-use it directly. Initialize a pool against our hook address:

```solidity
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";

IPoolManager poolManager = IPoolManager(0x360e6815... /* X Layer V4 */);

PoolKey memory key = PoolKey({
    currency0: Currency.wrap(MY_TOKEN_A),
    currency1: Currency.wrap(MY_TOKEN_B),
    fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,           // critical — hook overrides per swap
    tickSpacing: 60,
    hooks: IHooks(0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0)  // our FanFeeHook
});

poolManager.initialize(key, INITIAL_SQRT_PRICE);
```

Now every swap through this pool is fee-gated by the same on-chain
score registry that we maintain. Your users with high FanPass scores or
operator-attested scores get the discount automatically.

---

## Want your own scoring source?

Three plug-in adapters live in
[`contracts/examples/`](../contracts/examples/). Each implements the
same minimal interface that `FanFeeHook` reads:

```solidity
interface IReputationAdapter {
    function scoreOf(address wallet) external view returns (uint256);
    function updatedAt(address wallet) external view returns (uint64);
}
```

| Adapter | Source | When to use |
|---|---|---|
| [`BrightIDAdapter.sol`](../contracts/examples/BrightIDAdapter.sol) | BrightID verified-human | Sybil-resistant pools, fair-launch fee discounts |
| [`GitcoinPassportAdapter.sol`](../contracts/examples/GitcoinPassportAdapter.sol) | Gitcoin Passport stamps | Public-goods DEXes, donation rebates |
| [`OptimismAttestationAdapter.sol`](../contracts/examples/OptimismAttestationAdapter.sol) | OP Attestation Station | DAO-curated tiers, RetroPGF rewards |

Each is ~30 lines of Solidity. Copy, swap interface addresses for your
network, deploy, and pass its address as `fanScoreRegistry` to a fresh
`FanFeeHook` constructor.

---

## One-command fork

```bash
git clone https://github.com/kravadk/XHook
cd XHook
forge install Uniswap/v4-core --no-git
forge install Uniswap/v4-periphery --no-git
forge install OpenZeppelin/uniswap-hooks --no-git
forge install foundry-rs/forge-std --no-git
cp .env.example .env
# Fill: POOL_MANAGER, FAN_PASS_SBT, USDC_TOKEN, OPERATOR,
#       DEPLOYER_PRIVATE_KEY
forge build
forge test --gas-report

# Deploy stack (FanScoreRegistry -> CupSidePot -> FanFeeHook via HookMiner)
forge script script/DeployFanFeeHook.s.sol \
  --rpc-url <your-rpc> --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY

# Initialize a test pool wired to your hook
forge script script/InitTestPool.s.sol \
  --rpc-url <your-rpc> --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

That's the entire port. The contracts have no chain-specific assumptions
beyond the env you pass in.

---

## What composes for free

If you re-use our live deployment, you also inherit:

- **CupSidePot weekly settlement** — half of the extra-spread above 5
  bps goes into a parimutuel side-pot settled against CupOracleV3.
  Anyone can deposit on behalf of any wallet via
  `CupSidePot.depositFor(address, amount)`.
- **Public read methods** — `feeOf(address)`, `tierOf(address)`,
  `scoreOf(address)` are open; integrate into your own UI without
  asking permission.

If you fork and run your own deployment, the side-pot is optional —
remove the `afterSwap` deposit hook or wire it to a different oracle.

---

## Audit + safety

See [`SECURITY.md`](../contracts/SECURITY.md) for the known-limitations
list (operator-only score writes, unbounded winners array in the v1
settle, `tx.origin` reliance for swapper resolution) and v2 mitigation
plan (`Pausable`, Merkle-claim, score-stale fallback). Foundry suite is
55 tests at 91% line coverage on the hook + registry path.
