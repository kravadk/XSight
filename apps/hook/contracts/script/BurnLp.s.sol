// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

/**
 * @notice Burns the demo LP position and returns the underlying USDC/USDT to
 *         the caller. Run after the swap demo to recover the LP funding.
 *
 *  Env:
 *    POSITION_MANAGER  (X Layer Uniswap V4 PositionManager)
 *    LP_TOKEN_ID       (the ERC-721 tokenId minted by MintLp.s.sol)
 *    POOL_TOKEN0       (sorted lower)
 *    POOL_TOKEN1
 */
contract BurnLp is Script {
    function run() external {
        address posm = vm.envAddress("POSITION_MANAGER");
        uint256 tokenId = vm.envUint("LP_TOKEN_ID");
        address token0 = vm.envAddress("POOL_TOKEN0");
        address token1 = vm.envAddress("POOL_TOKEN1");
        address recipient = vm.envOr("LP_RECIPIENT", msg.sender);

        require(token0 < token1, "POOL_TOKEN0 must be < POOL_TOKEN1");

        bytes memory actions = abi.encodePacked(uint8(Actions.BURN_POSITION), uint8(Actions.TAKE_PAIR));
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(tokenId, uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(Currency.wrap(token0), Currency.wrap(token1), recipient);

        console2.log("=== Burning LP position", tokenId, "===");

        vm.startBroadcast();
        IPositionManager(posm).modifyLiquidities(abi.encode(actions, params), block.timestamp + 60);
        vm.stopBroadcast();

        console2.log("LP burned. USDC/USDT returned to:", recipient);
    }
}
