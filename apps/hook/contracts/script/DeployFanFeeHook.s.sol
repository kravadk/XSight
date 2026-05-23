// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {FanFeeHook} from "../src/FanFeeHook.sol";
import {FanScoreRegistry} from "../src/FanScoreRegistry.sol";
import {CupSidePot} from "../src/CupSidePot.sol";

/**
 * @notice Deploys the full Hook stack to X Layer mainnet (chain 196):
 *   1. FanScoreRegistry
 *   2. CupSidePot  (using USDC as payout token)
 *   3. FanFeeHook  (via CREATE2 + HookMiner to match permission bits 0xC0)
 *
 *  Reads required addresses from env:
 *    POOL_MANAGER   (0x360e68faccca8ca495c1b759fd9eee466db9fb32 on X Layer)
 *    FAN_PASS_SBT   (existing X Cup FanPassSBT; e.g. 0x74F75532428A99E613a865c97D1084b7f38241BD)
 *    USDC_TOKEN     (X Layer canonical USDC)
 *    OPERATOR       (server address that writes scores + settles pot)
 *
 *  Dry-run on a fork:
 *    forge script script/DeployFanFeeHook.s.sol \\
 *      --rpc-url https://rpc.xlayer.tech \\
 *      --sender <YOUR_DEPLOYER>
 *
 *  Broadcast for real:
 *    forge script script/DeployFanFeeHook.s.sol \\
 *      --rpc-url https://rpc.xlayer.tech \\
 *      --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeployFanFeeHook is Script {
    /// @dev Canonical CREATE2 deterministic deployer (same on all EVM chains).
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER");
        address fanPassSbt = vm.envAddress("FAN_PASS_SBT");
        address usdcToken = vm.envAddress("USDC_TOKEN");
        address operator = vm.envAddress("OPERATOR");

        console2.log("=== Deploying FanFeeHook stack ===");
        console2.log("Network chain id:", block.chainid);
        console2.log("PoolManager:     ", poolManager);
        console2.log("FanPassSBT:      ", fanPassSbt);
        console2.log("USDC:            ", usdcToken);
        console2.log("Operator:        ", operator);

        vm.startBroadcast();

        // 1. FanScoreRegistry
        FanScoreRegistry registry = new FanScoreRegistry(operator);
        console2.log("FanScoreRegistry deployed at:", address(registry));

        // 2. CupSidePot (single payout token = USDC)
        CupSidePot pot = new CupSidePot(usdcToken, operator);
        console2.log("CupSidePot deployed at:      ", address(pot));

        // 3. FanFeeHook via CREATE2 with mined salt
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(IPoolManager(poolManager), address(fanPassSbt), address(registry));
        (address minedAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER, flags, type(FanFeeHook).creationCode, constructorArgs
        );
        console2.log("Mined hook address:          ", minedAddress);

        FanFeeHook hook = new FanFeeHook{salt: salt}(
            IPoolManager(poolManager), address(fanPassSbt), address(registry)
        );
        require(address(hook) == minedAddress, "FanFeeHook: deploy mismatch");
        console2.log("FanFeeHook deployed at:      ", address(hook));

        vm.stopBroadcast();

        console2.log("\n=== DEPLOY ENV (paste into server/.env) ===");
        console2.log("HOOK_FAN_SCORE_REGISTRY=", address(registry));
        console2.log("HOOK_CUP_SIDE_POT=      ", address(pot));
        console2.log("HOOK_FAN_FEE_HOOK=      ", address(hook));
    }
}
