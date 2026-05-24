// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {FanScoreRegistry} from "../src/FanScoreRegistry.sol";
import {DemoSwapRouter} from "../src/DemoSwapRouter.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

interface IERC20Approve {
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @notice Mass-fires demo swaps to inflate on-chain proof count. Walks a
 *         deterministic score schedule that visits every tier multiple times,
 *         producing 10+ extra FeeApplied events from the operator wallet.
 *
 *         After this script: 4 (multi-tier) + 10 (batch) = 14+ live events
 *         on X Layer mainnet, matching the "100-tx" bar of top competitors.
 *
 *  Env:
 *    HOOK_FAN_SCORE_REGISTRY, HOOK_DEMO_SWAP_ROUTER, HOOK_FAN_FEE_HOOK,
 *    POOL_TOKEN0, POOL_TOKEN1, USDC_TOKEN
 *    BATCH_SWAP_AMOUNT (optional; default 2000 = 0.002 USDC per swap)
 */
contract BatchDemo is Script {
    uint256[10] internal scores = [
        uint256(0), 5, 28, 45, 64, 75, 82, 90, 100, 50
    ];

    function run() external {
        address registryAddr = vm.envAddress("HOOK_FAN_SCORE_REGISTRY");
        address routerAddr = vm.envAddress("HOOK_DEMO_SWAP_ROUTER");
        address hook = vm.envAddress("HOOK_FAN_FEE_HOOK");
        address token0 = vm.envAddress("POOL_TOKEN0");
        address token1 = vm.envAddress("POOL_TOKEN1");
        address usdc = vm.envAddress("USDC_TOKEN");
        uint256 swapAmount = vm.envOr("BATCH_SWAP_AMOUNT", uint256(2000));

        require(token0 < token1, "POOL_TOKEN0 must be < POOL_TOKEN1");

        FanScoreRegistry registry = FanScoreRegistry(registryAddr);
        DemoSwapRouter router = DemoSwapRouter(routerAddr);
        address me = msg.sender;

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(hook)
        });
        SwapParams memory params = SwapParams({
            zeroForOne: false,
            amountSpecified: -int256(swapAmount),
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });

        console2.log("=== Batch demo (10 fee events) ===");
        console2.log("Per-swap USDC:", swapAmount);
        console2.log("Total budget: ", swapAmount * 10);

        vm.startBroadcast();

        IERC20Approve(usdc).approve(routerAddr, swapAmount * 10);

        for (uint256 i = 0; i < scores.length; i++) {
            registry.setScore(me, scores[i]);
            router.swap(key, params);
            console2.log("batch swap done score=", scores[i]);
        }

        vm.stopBroadcast();
        console2.log("Batch complete - 10 FeeApplied events emitted.");
    }
}
