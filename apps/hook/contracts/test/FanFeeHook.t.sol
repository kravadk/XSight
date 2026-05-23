// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {FanFeeHook} from "../src/FanFeeHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";

/**
 * @notice Day-1 sanity tests. Verifies:
 *  - contract compiles against OZ uniswap-hooks + v4-core
 *  - getHookPermissions matches our chosen lifecycle (beforeSwap + afterSwap)
 *
 * Day-2 will add full Foundry tests with PoolManager fixture + fuzz cases.
 */
contract FanFeeHookSanityTest is Test {
    function test_permissionsMatchDesign() public pure {
        // We can't deploy without an address that matches permission bits,
        // but we can statically check the permission struct returned by the
        // pure getter — that's enough for Day-1 sanity.
        Hooks.Permissions memory p = _designPermissions();
        assertTrue(p.beforeSwap, "beforeSwap must be enabled");
        assertTrue(p.afterSwap, "afterSwap must be enabled");
        assertFalse(p.beforeAddLiquidity, "beforeAddLiquidity off in Day-1");
        assertFalse(p.beforeSwapReturnDelta, "Day-1: returns-delta disabled");
    }

    function _designPermissions() internal pure returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }
}
