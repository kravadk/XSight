// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SafeCast} from "@uniswap/v4-core/src/libraries/SafeCast.sol";
import {TransientStateLibrary} from "@uniswap/v4-core/src/libraries/TransientStateLibrary.sol";

/// @notice Minimal ERC-20 surface for the demo router.
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title DemoSwapRouter - minimum-viable router for the FanFeeHook demo swap.
 * @notice Use during the OKX «Build with Hook» demo only. Production users go
 *         through Universal Router 2.1.1 (0x8b844f...1e6b on X Layer).
 *
 *         Caller approves `tokenIn` to this router, then calls `swap(...)`.
 *         The router calls poolManager.unlock(), and in the callback:
 *           - calls poolManager.swap() (this is where the hook fires)
 *           - takes the swapper's input tokens via transferFrom
 *           - settles input via poolManager.settle()
 *           - takes output via poolManager.take() and forwards it back
 */
contract DemoSwapRouter is IUnlockCallback {
    using SafeCast for uint256;
    using TransientStateLibrary for IPoolManager;

    IPoolManager public immutable poolManager;

    error OnlyPoolManager();

    struct SwapCallbackData {
        address swapper;
        PoolKey key;
        SwapParams params;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Execute a one-shot swap on the given V4 pool.
    /// @dev    `amountSpecified` < 0 = exact-input, > 0 = exact-output (V4 convention).
    function swap(PoolKey calldata key, SwapParams calldata params) external returns (BalanceDelta delta) {
        bytes memory data = abi.encode(SwapCallbackData({swapper: msg.sender, key: key, params: params}));
        bytes memory result = poolManager.unlock(data);
        delta = abi.decode(result, (BalanceDelta));
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();
        SwapCallbackData memory data = abi.decode(rawData, (SwapCallbackData));

        BalanceDelta delta = poolManager.swap(data.key, data.params, "");

        // Determine input/output currencies based on direction.
        Currency inputCurrency = data.params.zeroForOne ? data.key.currency0 : data.key.currency1;
        Currency outputCurrency = data.params.zeroForOne ? data.key.currency1 : data.key.currency0;

        // The hook may have modified deltas; read them from transient storage.
        int256 inputDelta = poolManager.currencyDelta(address(this), inputCurrency);
        int256 outputDelta = poolManager.currencyDelta(address(this), outputCurrency);

        // Pay the input owed by the router to the PoolManager.
        if (inputDelta < 0) {
            uint256 owed = uint256(-inputDelta);
            poolManager.sync(inputCurrency);
            IERC20(Currency.unwrap(inputCurrency)).transferFrom(data.swapper, address(poolManager), owed);
            poolManager.settle();
        }

        // Take the output back to the swapper.
        if (outputDelta > 0) {
            poolManager.take(outputCurrency, data.swapper, uint256(outputDelta));
        }

        return abi.encode(delta);
    }
}
