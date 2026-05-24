// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@openzeppelin/uniswap-hooks/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";

import {IFanPassSBT} from "./interfaces/IFanPassSBT.sol";
import {FanScoreRegistry} from "./FanScoreRegistry.sol";

/**
 * @title FanFeeHook - identity-gated dynamic swap fee on Uniswap V4 / X Layer.
 * @notice Reads the swapper's FanPass + FanScore on every swap and overrides
 *         the LP fee from a four-tier table:
 *
 *              tier 0 (unknown)      -> 30 bps
 *              tier 1 (active)       -> 20 bps
 *              tier 2 (trusted)      -> 10 bps
 *              tier 3 (oracle-grade) ->  5 bps
 *
 *         A FanPass-holder gets at least tier 1 (so even a brand-new wallet
 *         that already holds the SBT pays only 20 bps).
 *
 *         All fee revenue flows to LPs through the standard dynamic-fee flag -
 *         no value extracted by the hook in Day-2. Day-4 will add
 *         BeforeSwapDelta routing into CupSidePot for the side-pot mechanic.
 *
 *         Pool must be initialized with `fee = LPFeeLibrary.DYNAMIC_FEE_FLAG`.
 *
 *         Hackathon: OKX "Build with Hook" 22-28 May 2026.
 */
contract FanFeeHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    // --- Constants: tier -> swap fee in pip units (1 pip = 0.0001%, so 5 bps = 500 pips) ---
    uint24 internal constant FEE_TIER_0 = 3000; // unknown      = 30 bps
    uint24 internal constant FEE_TIER_1 = 2000; // active       = 20 bps
    uint24 internal constant FEE_TIER_2 = 1000; // trusted      = 10 bps
    uint24 internal constant FEE_TIER_3 =  500; // oracle-grade =  5 bps

    /// @notice Existing X Cup soulbound badge contract. Read-only.
    IFanPassSBT public immutable fanPassSbt;
    /// @notice Operator-curated cache of 0-100 reputation scores.
    FanScoreRegistry public immutable fanScoreRegistry;

    /// @notice Per-pool counter - increments on every `_beforeSwap` invocation.
    /// @dev    Pure observability; not consumed by any contract logic.
    mapping(PoolId => uint256) public beforeSwapCount;
    /// @notice Per-pool counter - increments on every `_afterSwap` invocation.
    mapping(PoolId => uint256) public afterSwapCount;

    /// @notice Emitted on every swap with the tier resolution outcome.
    /// @param poolId  Uniswap V4 pool identifier (`PoolKey.toId()`).
    /// @param swapper Originating EOA (`tx.origin`) - see section 2.1 of SECURITY.md.
    /// @param tier    0 = unknown, 1 = active, 2 = trusted, 3 = oracle-grade.
    /// @param feePips LP fee actually charged in pip units (1 pip = 0.0001%).
    event FeeApplied(PoolId indexed poolId, address indexed swapper, uint8 tier, uint24 feePips);

    /// @notice Wires the hook to the X Cup primitives + Uniswap V4 PoolManager.
    /// @param _poolManager      Uniswap V4 PoolManager on X Layer
    ///                          (`0x360e68faccca8ca495c1b759fd9eee466db9fb32`).
    /// @param _fanPassSbt       Existing X Cup FanPassSBT contract.
    /// @param _fanScoreRegistry Companion `FanScoreRegistry` deployed alongside.
    constructor(IPoolManager _poolManager, address _fanPassSbt, address _fanScoreRegistry)
        BaseHook(_poolManager)
    {
        require(_fanPassSbt != address(0), "FanFeeHook: zero fanPassSbt");
        require(_fanScoreRegistry != address(0), "FanFeeHook: zero registry");
        fanPassSbt = IFanPassSBT(_fanPassSbt);
        fanScoreRegistry = FanScoreRegistry(_fanScoreRegistry);
    }

    /// @notice Declares which lifecycle callbacks the PoolManager may invoke.
    /// @dev    Encoded as bits in our deployment address
    ///         (`0x...C0` = BEFORE_SWAP_FLAG | AFTER_SWAP_FLAG).
    /// @return Hooks.Permissions struct expected by the V4 PoolManager.
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /// @notice Resolves the swapper's identity-tier and returns the corresponding
    ///         dynamic LP fee. `sender` here is the router / msg.sender of the
    ///         PoolManager.unlock call; for the hackathon demo we use `tx.origin`
    ///         to identify the actual EOA, which is acceptable for our UI-driven
    ///         flow (the user always signs through the dashboard).
    function _beforeSwap(
        address /* sender */,
        PoolKey calldata key,
        SwapParams calldata /* params */,
        bytes calldata /* hookData */
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        beforeSwapCount[poolId]++;

        // solhint-disable-next-line avoid-tx-origin
        address swapper = tx.origin;
        uint8 tier = _resolveTier(swapper);
        uint24 feePips = _feeForTier(tier);
        emit FeeApplied(poolId, swapper, tier, feePips);

        // OVERRIDE_FEE_FLAG signals the PoolManager to use our fee for this swap
        // (only valid if the pool was initialized with DYNAMIC_FEE_FLAG).
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, feePips | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    function _afterSwap(
        address /* sender */,
        PoolKey calldata key,
        SwapParams calldata /* params */,
        BalanceDelta /* delta */,
        bytes calldata /* hookData */
    ) internal override returns (bytes4, int128) {
        afterSwapCount[key.toId()]++;
        return (BaseHook.afterSwap.selector, 0);
    }

    // -------- external read helpers (used by UI + tests) --------

    /// @notice Returns the tier the hook would assign to `swapper` right now.
    /// @param  swapper Address being checked.
    /// @return tier    0 (unknown) | 1 (active) | 2 (trusted) | 3 (oracle-grade).
    function tierOf(address swapper) external view returns (uint8) {
        return _resolveTier(swapper);
    }

    /// @notice Returns the fee in pip units (1 pip = 0.0001 %) the hook would
    ///         charge `swapper` if they swapped right now.
    /// @param  swapper Address being checked.
    /// @return fee     pip units (30 bps = 3000, 5 bps = 500).
    function feeOf(address swapper) external view returns (uint24) {
        return _feeForTier(_resolveTier(swapper));
    }

    // -------- internal --------

    /// @dev FanPass-holder gets at least tier 1, otherwise scoreTier from registry.
    function _resolveTier(address swapper) internal view returns (uint8) {
        uint8 scoreTier = fanScoreRegistry.tierOf(swapper);
        // Holding a FanPass SBT alone guarantees at least tier 1 (active).
        if (fanPassSbt.balanceOf(swapper) > 0 && scoreTier < 1) {
            return 1;
        }
        return scoreTier;
    }

    function _feeForTier(uint8 tier) internal pure returns (uint24) {
        if (tier >= 3) return FEE_TIER_3;
        if (tier == 2) return FEE_TIER_2;
        if (tier == 1) return FEE_TIER_1;
        return FEE_TIER_0;
    }
}
