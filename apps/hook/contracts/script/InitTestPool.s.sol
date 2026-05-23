// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";

/**
 * @notice Initializes a Uniswap V4 pool wired to our FanFeeHook.
 *         Pool fee MUST be `LPFeeLibrary.DYNAMIC_FEE_FLAG` so the hook can
 *         override the fee per swap via `_beforeSwap`.
 *
 *         Default pair on X Layer: USDC (token0) / USDT (token1) sorted by
 *         address. Override via env if you want a different pair.
 *
 *         Initial price: 1:1 (sqrtPriceX96 = 2^96 = 79228162514264337593543950336).
 *
 *  Run (after DeployFanFeeHook.s.sol):
 *    forge script script/InitTestPool.s.sol \\
 *      --rpc-url https://rpc.xlayer.tech \\
 *      --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract InitTestPool is Script {
    /// @dev sqrtPriceX96 for price = 1: 1<<96 = 79228162514264337593543950336
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    /// @dev Standard tick spacing for stable-pair hooks.
    int24 constant TICK_SPACING = 60;

    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER");
        address hook = vm.envAddress("HOOK_FAN_FEE_HOOK");
        address token0 = vm.envAddress("POOL_TOKEN0"); // sorted: lower address
        address token1 = vm.envAddress("POOL_TOKEN1");

        require(token0 < token1, "POOL_TOKEN0 must be < POOL_TOKEN1 (sorted)");

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hook)
        });

        console2.log("=== Initializing V4 pool with FanFeeHook ===");
        console2.log("PoolManager: ", poolManager);
        console2.log("Token0:      ", token0);
        console2.log("Token1:      ", token1);
        console2.log("Hook:        ", hook);
        console2.log("Dynamic fee: ", uint256(LPFeeLibrary.DYNAMIC_FEE_FLAG));
        console2.log("Tick spacing:", uint256(uint24(TICK_SPACING)));

        vm.startBroadcast();
        IPoolManager(poolManager).initialize(key, SQRT_PRICE_1_1);
        vm.stopBroadcast();

        console2.log("Pool initialized. PoolKey is the canonical 5-tuple above.");
    }
}
