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
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {IFanPassSBT} from "./interfaces/IFanPassSBT.sol";
import {FanScoreRegistry} from "./FanScoreRegistry.sol";

/**
 * @title FanFeeHookV2 - v1 + Pausable + stale-score fallback.
 * @notice Upgrade path documented in apps/hook/contracts/SECURITY.md section 2.5.
 *         When paused, the hook returns the safe baseline 30 bps fee (tier 0)
 *         for every swap. Pool keeps functioning so users are never stranded.
 *         Stale scores (older than 30 days) automatically demote the wallet
 *         back to tier 0 - prevents abandoned-operator drift.
 */
contract FanFeeHookV2 is BaseHook, Pausable {
    using PoolIdLibrary for PoolKey;

    uint24 internal constant FEE_TIER_0 = 3000;
    uint24 internal constant FEE_TIER_1 = 2000;
    uint24 internal constant FEE_TIER_2 = 1000;
    uint24 internal constant FEE_TIER_3 = 500;

    /// @notice Drop the wallet to tier 0 if its score is older than this.
    uint64 public constant MAX_SCORE_AGE = 30 days;

    address public owner;
    IFanPassSBT public immutable fanPassSbt;
    FanScoreRegistry public immutable fanScoreRegistry;

    mapping(PoolId => uint256) public beforeSwapCount;
    mapping(PoolId => uint256) public afterSwapCount;

    event OwnerChanged(address indexed previous, address indexed next);
    event FeeApplied(PoolId indexed poolId, address indexed swapper, uint8 tier, uint24 feePips);

    error OnlyOwner();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(IPoolManager _poolManager, address _fanPassSbt, address _fanScoreRegistry)
        BaseHook(_poolManager)
    {
        if (_fanPassSbt == address(0) || _fanScoreRegistry == address(0)) revert ZeroAddress();
        fanPassSbt = IFanPassSBT(_fanPassSbt);
        fanScoreRegistry = FanScoreRegistry(_fanScoreRegistry);
        owner = msg.sender;
        emit OwnerChanged(address(0), msg.sender);
    }

    function transferOwner(address nextOwner) external onlyOwner {
        if (nextOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, nextOwner);
        owner = nextOwner;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

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
        uint8 tier = paused() ? 0 : _resolveTier(swapper);
        uint24 feePips = _feeForTier(tier);
        emit FeeApplied(poolId, swapper, tier, feePips);

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

    function tierOf(address swapper) external view returns (uint8) {
        return paused() ? 0 : _resolveTier(swapper);
    }

    function feeOf(address swapper) external view returns (uint24) {
        return _feeForTier(paused() ? 0 : _resolveTier(swapper));
    }

    function _resolveTier(address swapper) internal view returns (uint8) {
        uint64 updated = fanScoreRegistry.updatedAt(swapper);
        bool stale = updated == 0 || block.timestamp - uint256(updated) > MAX_SCORE_AGE;
        uint8 scoreTier = stale ? 0 : fanScoreRegistry.tierOf(swapper);
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
