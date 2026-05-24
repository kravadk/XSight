// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {FanBoostHook} from "../src/FanBoostHook.sol";

/**
 * @notice Deploys FanBoostHook - companion hook that awards LP-side boost
 *         points to FanPass-holding providers via `afterAddLiquidity`.
 *         Demonstrates that FanFeeHook + FanBoostHook can attach to the
 *         same pool simultaneously (BEFORE_SWAP|AFTER_SWAP vs
 *         AFTER_ADD_LIQUIDITY - different bits, no collision).
 *
 *  Env:
 *    POOL_MANAGER, FAN_PASS_SBT
 */
contract DeployFanBoost is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER");
        address fanPassSbt = vm.envAddress("FAN_PASS_SBT");

        console2.log("=== Deploying FanBoostHook ===");
        console2.log("PoolManager:", poolManager);
        console2.log("FanPassSBT: ", fanPassSbt);

        vm.startBroadcast();

        uint160 flags = uint160(Hooks.AFTER_ADD_LIQUIDITY_FLAG);
        bytes memory constructorArgs = abi.encode(IPoolManager(poolManager), fanPassSbt);
        (address minedAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER, flags, type(FanBoostHook).creationCode, constructorArgs
        );
        console2.log("Mined boost hook address:", minedAddress);

        FanBoostHook boost = new FanBoostHook{salt: salt}(IPoolManager(poolManager), fanPassSbt);
        require(address(boost) == minedAddress, "FanBoostHook: deploy mismatch");
        console2.log("FanBoostHook deployed at: ", address(boost));

        vm.stopBroadcast();

        console2.log("\nHOOK_FAN_BOOST=", address(boost));
    }
}
