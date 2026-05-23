// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

/// @notice Permit2 minimal interface (canonical 0x000...22D473).
interface IPermit2 {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

/// @notice ERC-20 approve hop to seed Permit2.
interface IERC20Approve {
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @notice Mints a tiny LP position on the USDC/USDT FanFeeHook pool so the
 *         demo swap can actually clear. Position is narrow (one tick band)
 *         and approximately 0.5 / 0.5 USDC/USDT.
 *
 *  Run:
 *    forge script script/MintLp.s.sol \\
 *      --rpc-url https://rpc.xlayer.tech \\
 *      --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract MintLp is Script {
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    int24 constant TICK_SPACING = 60;
    int24 constant TICK_LOWER = -60;
    int24 constant TICK_UPPER = 60;
    uint48 constant APPROVE_EXPIRATION = type(uint48).max;

    function run() external {
        address posm = vm.envAddress("POSITION_MANAGER");
        address hook = vm.envAddress("HOOK_FAN_FEE_HOOK");
        address token0 = vm.envAddress("POOL_TOKEN0");
        address token1 = vm.envAddress("POOL_TOKEN1");
        uint256 amount0Desired = vm.envOr("LP_AMOUNT0", uint256(500_000)); // 0.5 USDC (6 dec)
        uint256 amount1Desired = vm.envOr("LP_AMOUNT1", uint256(500_000));
        address recipient = vm.envOr("LP_RECIPIENT", msg.sender);

        require(token0 < token1, "POOL_TOKEN0 must be < POOL_TOKEN1");

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hook)
        });

        uint160 sqrtRatioAX96 = TickMath.getSqrtPriceAtTick(TICK_LOWER);
        uint160 sqrtRatioBX96 = TickMath.getSqrtPriceAtTick(TICK_UPPER);
        uint160 sqrtPriceX96 = uint160(uint256(1) << 96); // initial price 1:1
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96, sqrtRatioAX96, sqrtRatioBX96, amount0Desired, amount1Desired
        );

        bytes memory actions = abi.encodePacked(uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR));
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(
            key, TICK_LOWER, TICK_UPPER, liquidity, amount0Desired, amount1Desired, recipient, bytes("")
        );
        params[1] = abi.encode(key.currency0, key.currency1);

        console2.log("=== Minting LP on FanFeeHook pool ===");
        console2.log("PositionManager:", posm);
        console2.log("Liquidity:      ", uint256(liquidity));
        console2.log("amount0Desired: ", amount0Desired);
        console2.log("amount1Desired: ", amount1Desired);

        vm.startBroadcast();

        IERC20Approve(token0).approve(PERMIT2, type(uint256).max);
        IERC20Approve(token1).approve(PERMIT2, type(uint256).max);
        IPermit2(PERMIT2).approve(token0, posm, type(uint160).max, APPROVE_EXPIRATION);
        IPermit2(PERMIT2).approve(token1, posm, type(uint160).max, APPROVE_EXPIRATION);

        IPositionManager(posm).modifyLiquidities(
            abi.encode(actions, params),
            block.timestamp + 60
        );

        vm.stopBroadcast();
        console2.log("LP minted to:", recipient);
    }
}
