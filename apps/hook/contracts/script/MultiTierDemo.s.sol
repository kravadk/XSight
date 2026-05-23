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
 * @notice Walks the operator wallet through every FanFeeHook tier and fires a
 *         demo swap at each one. After this script the chain has FOUR FeeApplied
 *         events from the SAME swapper at DIFFERENT (30 / 20 / 10 / 5) bps —
 *         conclusive proof that the hook actually modulates fee per swap based
 *         on identity, not pool state.
 *
 *         Tiers walked: score=0 (T0, 30 bps) → 30 (T1, 20) → 70 (T2, 10) → 90 (T3, 5)
 *
 *  Env:
 *    HOOK_FAN_SCORE_REGISTRY, HOOK_DEMO_SWAP_ROUTER, HOOK_FAN_FEE_HOOK,
 *    POOL_TOKEN0, POOL_TOKEN1, USDC_TOKEN
 *    MTD_SWAP_AMOUNT (optional, default 4000 = 0.004 USDC per swap)
 */
contract MultiTierDemo is Script {
    uint256[4] internal scores = [uint256(0), 30, 70, 90];

    function run() external {
        address registryAddr = vm.envAddress("HOOK_FAN_SCORE_REGISTRY");
        address routerAddr = vm.envAddress("HOOK_DEMO_SWAP_ROUTER");
        address hook = vm.envAddress("HOOK_FAN_FEE_HOOK");
        address token0 = vm.envAddress("POOL_TOKEN0");
        address token1 = vm.envAddress("POOL_TOKEN1");
        address usdc = vm.envAddress("USDC_TOKEN");
        uint256 swapAmount = vm.envOr("MTD_SWAP_AMOUNT", uint256(4000));

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

        // Swap USDC -> USDT (zeroForOne=false since token0=USDT on sorted order).
        SwapParams memory params = SwapParams({
            zeroForOne: false,
            amountSpecified: -int256(swapAmount),
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });

        console2.log("=== Multi-tier FanFeeHook demo ===");
        console2.log("Hook:        ", hook);
        console2.log("Router:      ", routerAddr);
        console2.log("Operator/Me: ", me);
        console2.log("Per-tier swap (USDC):", swapAmount);

        vm.startBroadcast();

        IERC20Approve(usdc).approve(routerAddr, swapAmount * 4);

        for (uint256 i = 0; i < scores.length; i++) {
            uint256 s = scores[i];
            console2.log("--- tier walk ---");
            console2.log("setScore:", s);
            registry.setScore(me, s);
            console2.log("swapping...");
            router.swap(key, params);
        }

        vm.stopBroadcast();
        console2.log("All four tier swaps complete.");
    }
}
