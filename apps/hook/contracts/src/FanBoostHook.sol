// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@openzeppelin/uniswap-hooks/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";

import {IFanPassSBT} from "./interfaces/IFanPassSBT.sol";

/**
 * @title FanBoostHook - extra LP rewards for FanPass-holding providers.
 * @notice Second-hook companion to FanFeeHook. Demonstrates the composable
 *         hook ecosystem: any pool can attach FanBoostHook in
 *         `afterAddLiquidity` and FanFeeHook in `beforeSwap` simultaneously.
 *
 *         Permission bits: `AFTER_ADD_LIQUIDITY_FLAG` (1 << 10 = 0x400).
 *         Mined address must end in 0x400.
 *
 *         Status: written for the hackathon submission; deploy is an
 *         optional stretch goal (see SECURITY.md roadmap).
 */
contract FanBoostHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    /// @notice Existing X Cup soulbound badge contract. Read-only.
    IFanPassSBT public immutable fanPassSbt;

    /// @notice Cumulative boost points per liquidity provider across every pool.
    /// @dev    Points are awarded one-for-one against the absolute `liquidityDelta`
    ///         of the LP's add — purely off-chain consumable signal for the
    ///         loyalty UI; no on-chain token is minted.
    mapping(address lp => uint256 points) public boostPointsOf;

    /// @notice Per-pool counter of `afterAddLiquidity` invocations that awarded boost.
    mapping(PoolId => uint256) public boostEventCount;

    /// @notice Emitted when a FanPass-holding LP receives boost points.
    /// @param poolId      Uniswap V4 pool identifier.
    /// @param lp          Originating EOA (`tx.origin`) — the actual provider.
    /// @param pointsAdded Boost points awarded this event (= liquidityDelta).
    /// @param newTotal    Updated cumulative boostPoints for `lp`.
    event BoostAwarded(
        PoolId indexed poolId,
        address indexed lp,
        uint256 pointsAdded,
        uint256 newTotal
    );

    error ZeroAddress();

    /// @notice Wires the boost hook to the X Cup FanPass + V4 PoolManager.
    /// @param _poolManager Uniswap V4 PoolManager on X Layer.
    /// @param _fanPassSbt  Existing X Cup FanPassSBT contract.
    constructor(IPoolManager _poolManager, address _fanPassSbt) BaseHook(_poolManager) {
        if (_fanPassSbt == address(0)) revert ZeroAddress();
        fanPassSbt = IFanPassSBT(_fanPassSbt);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _afterAddLiquidity(
        address /* sender */,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta /* delta */,
        BalanceDelta /* feesAccrued */,
        bytes calldata /* hookData */
    ) internal override returns (bytes4, BalanceDelta) {
        // solhint-disable-next-line avoid-tx-origin
        address lp = tx.origin;
        if (fanPassSbt.balanceOf(lp) > 0 && params.liquidityDelta > 0) {
            uint256 pointsAdded = uint256(uint128(uint256(params.liquidityDelta)));
            boostPointsOf[lp] += pointsAdded;
            boostEventCount[key.toId()]++;
            emit BoostAwarded(key.toId(), lp, pointsAdded, boostPointsOf[lp]);
        }
        return (BaseHook.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }
}
