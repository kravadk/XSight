// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {FanFeeHookV2} from "../src/FanFeeHookV2.sol";
import {CupSidePotV2} from "../src/CupSidePotV2.sol";

/**
 * @notice Deploys the v2 hook stack (Pausable + Merkle + stale-score fallback)
 *         alongside the live v1 deployment. v2 contracts share the existing
 *         FanScoreRegistry (no need to redeploy scores). The new pool +
 *         liquidity migration are intentionally NOT part of this script —
 *         v2 lives on-chain so anyone can read source + adapters can fork it
 *         without waiting for liquidity migration.
 *
 *  Reads from env:
 *    POOL_MANAGER             - same X Layer V4 PoolManager v1 used
 *    FAN_PASS_SBT             - same FanPassSBT v1 used
 *    USDC_TOKEN               - X Layer USDC for the new CupSidePotV2
 *    OPERATOR                 - server EOA (same as v1)
 *    HOOK_FAN_SCORE_REGISTRY  - REUSE the live FanScoreRegistry
 *
 *  Broadcast:
 *    forge script script/DeployV2.s.sol \
 *      --rpc-url https://rpc.xlayer.tech \
 *      --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeployV2 is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER");
        address fanPassSbt = vm.envAddress("FAN_PASS_SBT");
        address usdcToken = vm.envAddress("USDC_TOKEN");
        address operator = vm.envAddress("OPERATOR");
        address registry = vm.envAddress("HOOK_FAN_SCORE_REGISTRY");

        console2.log("=== Deploying FanFeeHook v2 stack ===");
        console2.log("Network chain id:", block.chainid);
        console2.log("PoolManager:     ", poolManager);
        console2.log("FanPassSBT:      ", fanPassSbt);
        console2.log("USDC:            ", usdcToken);
        console2.log("Operator:        ", operator);
        console2.log("Reusing registry:", registry);

        vm.startBroadcast();

        // 1. CupSidePotV2 (fresh deploy - single payout token = USDC)
        //    Adds: Pausable + Merkle-proof claim path.
        CupSidePotV2 potV2 = new CupSidePotV2(usdcToken, operator);
        console2.log("CupSidePotV2 deployed at:    ", address(potV2));

        // 2. FanFeeHookV2 via CREATE2 with mined salt
        //    Adds: Pausable + 30-day stale-score fallback to tier 0.
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(IPoolManager(poolManager), fanPassSbt, registry);
        (address minedAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER, flags, type(FanFeeHookV2).creationCode, constructorArgs
        );
        console2.log("Mined v2 hook address:       ", minedAddress);

        FanFeeHookV2 hookV2 = new FanFeeHookV2{salt: salt}(
            IPoolManager(poolManager), fanPassSbt, registry
        );
        require(address(hookV2) == minedAddress, "FanFeeHookV2: deploy mismatch");
        console2.log("FanFeeHookV2 deployed at:    ", address(hookV2));

        vm.stopBroadcast();

        console2.log("\n=== DEPLOY ENV ADDITIONS (record for docs) ===");
        console2.log("HOOK_FAN_FEE_HOOK_V2= ", address(hookV2));
        console2.log("HOOK_CUP_SIDE_POT_V2= ", address(potV2));
        console2.log("(reused HOOK_FAN_SCORE_REGISTRY remains:", registry, ")");
        console2.log("\nNote: v1 hook + pot stay live on the existing USDT/USDC pool.");
        console2.log("v2 contracts are deployed but unwired - a new pool init + LP");
        console2.log("migration is required to route real swaps through them.");
    }
}
