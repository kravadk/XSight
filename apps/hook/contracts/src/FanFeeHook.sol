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

/**
 * @title FanFeeHook — identity-gated dynamic swap fee on Uniswap V4 / X Layer.
 * @notice Day-1 stub. Logic lands on Day 2:
 *   - `_beforeSwap` reads caller's FanPass tier from FanScoreRegistry and
 *     returns a dynamic fee via LPFeeLibrary.OVERRIDE_FEE_FLAG
 *     (5 / 10 / 20 / 30 bps depending on tier).
 *   - `_afterSwap` routes the extra spread (vs 5 bps base) into CupSidePot
 *     for weekly settlement against CupOracleV3 results.
 *
 * Pool must be initialized with `fee = LPFeeLibrary.DYNAMIC_FEE_FLAG`.
 *
 * Hackathon: OKX «Build with Hook» 22-28 May 2026.
 */
contract FanFeeHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    /// @notice Per-pool counter — Day-1 sanity check that hook is actually invoked.
    mapping(PoolId => uint256) public beforeSwapCount;
    mapping(PoolId => uint256) public afterSwapCount;

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

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
            // Day-2 will enable returns-delta when CupSidePot routing lands.
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _beforeSwap(
        address /* sender */,
        PoolKey calldata key,
        SwapParams calldata /* params */,
        bytes calldata /* hookData */
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        beforeSwapCount[key.toId()]++;
        // Day-2: dynamicFee = computeFeeFromTier(swapper) | LPFeeLibrary.OVERRIDE_FEE_FLAG;
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _afterSwap(
        address /* sender */,
        PoolKey calldata key,
        SwapParams calldata /* params */,
        BalanceDelta /* delta */,
        bytes calldata /* hookData */
    ) internal override returns (bytes4, int128) {
        afterSwapCount[key.toId()]++;
        // Day-2: route extra spread into CupSidePot.depositFor(swapper, spread).
        return (BaseHook.afterSwap.selector, 0);
    }
}
