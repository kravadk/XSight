// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

import {DemoSwapRouter} from "../src/DemoSwapRouter.sol";

interface IERC20Approve {
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @notice One-shot script: deploys DemoSwapRouter if not given, approves a tiny
 *         input amount, and executes an exact-input swap on the FanFeeHook pool.
 *         Emits a Swap event from PoolManager + a FeeApplied event from the hook -
 *         this is the killer demo moment for the submission video.
 *
 *  Env:
 *    POOL_MANAGER, HOOK_FAN_FEE_HOOK, POOL_TOKEN0, POOL_TOKEN1
 *    SWAP_DEMO_ROUTER  (optional - if unset, the script deploys one)
 *    SWAP_AMOUNT       (optional - default 100000 = 0.1 USDC at 6 decimals)
 *    SWAP_ZERO_FOR_ONE (optional - default true: token0 -> token1)
 */
contract SwapDemo is Script {
    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER");
        address hook = vm.envAddress("HOOK_FAN_FEE_HOOK");
        address token0 = vm.envAddress("POOL_TOKEN0");
        address token1 = vm.envAddress("POOL_TOKEN1");
        address routerAddr = vm.envOr("SWAP_DEMO_ROUTER", address(0));
        uint256 amountIn = vm.envOr("SWAP_AMOUNT", uint256(100_000)); // 0.1 USDC
        bool zeroForOne = vm.envOr("SWAP_ZERO_FOR_ONE", bool(true));

        require(token0 < token1, "POOL_TOKEN0 must be < POOL_TOKEN1");

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(hook)
        });

        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });

        console2.log("=== Demo swap through FanFeeHook ===");
        console2.log("AmountIn:    ", amountIn);
        console2.log("zeroForOne:  ", zeroForOne);

        vm.startBroadcast();

        DemoSwapRouter router;
        if (routerAddr == address(0)) {
            router = new DemoSwapRouter(IPoolManager(poolManager));
            console2.log("DemoSwapRouter deployed at:", address(router));
        } else {
            router = DemoSwapRouter(routerAddr);
            console2.log("Reusing DemoSwapRouter at: ", address(router));
        }

        address inputToken = zeroForOne ? token0 : token1;
        IERC20Approve(inputToken).approve(address(router), amountIn);

        router.swap(key, params);

        vm.stopBroadcast();

        console2.log("Swap done. Inspect tx receipt for:");
        console2.log("  - PoolManager Swap event");
        console2.log("  - FanFeeHook FeeApplied event (tier + fee bps)");
    }
}
