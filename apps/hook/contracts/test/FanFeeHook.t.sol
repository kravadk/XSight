// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {FanFeeHook} from "../src/FanFeeHook.sol";
import {FanScoreRegistry} from "../src/FanScoreRegistry.sol";
import {IFanPassSBT} from "../src/interfaces/IFanPassSBT.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";

/// @notice Minimal FanPass mock - returns 1 if minted, 0 otherwise.
contract MockFanPassSBT is IFanPassSBT {
    mapping(address => bool) public hasBadge;

    function mint(address to) external {
        hasBadge[to] = true;
    }

    function balanceOf(address wallet) external view returns (uint256) {
        return hasBadge[wallet] ? 1 : 0;
    }
}

/**
 * @notice FanFeeHook unit tests use a *deployed* hook but skip the real
 *         BaseHook address-bit validation by using `deployCodeTo` to forcibly
 *         place hook bytecode at a permission-matching address.
 *
 *         Permission bits for FanFeeHook (beforeSwap + afterSwap, no returns-delta):
 *           BEFORE_SWAP_FLAG (1<<7) | AFTER_SWAP_FLAG (1<<6) = 0xC0
 */
contract FanFeeHookTest is Test {
    FanFeeHook public hook;
    FanScoreRegistry public registry;
    MockFanPassSBT public fanPass;
    IPoolManager public manager;

    address public operator = makeAddr("operator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public eve = makeAddr("eve");

    // bits 7 + 6 = 0xC0
    address public constant HOOK_ADDR = address(uint160(0x000000000000000000000000000000000000C0C0));

    function setUp() public {
        // Use a sentinel address for PoolManager - the hook stores it but
        // we never call its callback into-the-manager paths in these unit tests.
        manager = IPoolManager(address(0x1234));
        registry = new FanScoreRegistry(operator);
        fanPass = new MockFanPassSBT();

        // Deploy hook code at HOOK_ADDR (bypasses CREATE2 mining for unit tests).
        deployCodeTo(
            "FanFeeHook.sol:FanFeeHook",
            abi.encode(address(manager), address(fanPass), address(registry)),
            HOOK_ADDR
        );
        hook = FanFeeHook(HOOK_ADDR);
    }

    // -------- constructor --------

    function test_constructor_setsImmutables() public view {
        assertEq(address(hook.fanPassSbt()), address(fanPass));
        assertEq(address(hook.fanScoreRegistry()), address(registry));
    }

    // (Zero-address constructor checks can't be tested via `new` because
    // BaseHook._validateHookAddress runs FIRST and reverts HookAddressNotValid
    // when the deploy address doesn't match the permission bits. The runtime
    // require still protects production deployments via the deploy script.)

    // -------- permissions match design --------

    function test_permissionsExposeBeforeAndAfterSwapOnly() public view {
        Hooks.Permissions memory p = hook.getHookPermissions();
        assertTrue(p.beforeSwap, "beforeSwap");
        assertTrue(p.afterSwap, "afterSwap");
        assertFalse(p.beforeSwapReturnDelta, "no returns-delta in Day-2");
        assertFalse(p.afterSwapReturnDelta);
        assertFalse(p.beforeAddLiquidity);
        assertFalse(p.afterAddLiquidity);
    }

    // -------- tier resolution --------

    function test_tierOf_defaultsToZero() public view {
        assertEq(hook.tierOf(alice), 0);
    }

    function test_tierOf_followsRegistry() public {
        vm.startPrank(operator);
        registry.setScore(alice, 35);  // active
        registry.setScore(bob, 70);    // trusted
        registry.setScore(eve, 90);    // oracle-grade
        vm.stopPrank();
        assertEq(hook.tierOf(alice), 1);
        assertEq(hook.tierOf(bob), 2);
        assertEq(hook.tierOf(eve), 3);
    }

    function test_tierOf_fanPassBoostsZeroToOne() public {
        // alice has no score (tier 0) but holds FanPass -> bumped to tier 1
        fanPass.mint(alice);
        assertEq(hook.tierOf(alice), 1);
    }

    function test_tierOf_fanPassDoesNotDowngradeHigherTiers() public {
        vm.prank(operator);
        registry.setScore(alice, 90); // oracle-grade
        fanPass.mint(alice);
        assertEq(hook.tierOf(alice), 3);
    }

    // -------- feeOf table --------

    function test_feeOf_tier0_30bps() public view {
        assertEq(hook.feeOf(alice), 3000);
    }

    function test_feeOf_tier1_20bps() public {
        vm.prank(operator);
        registry.setScore(alice, 28);
        assertEq(hook.feeOf(alice), 2000);
    }

    function test_feeOf_tier2_10bps() public {
        vm.prank(operator);
        registry.setScore(alice, 64);
        assertEq(hook.feeOf(alice), 1000);
    }

    function test_feeOf_tier3_5bps() public {
        vm.prank(operator);
        registry.setScore(alice, 82);
        assertEq(hook.feeOf(alice), 500);
    }

    function test_feeOf_fanPassHolderGetsAtLeast20bps() public {
        fanPass.mint(alice);
        // score=0 (tier 0), but FanPass bumps to tier 1 -> 20 bps
        assertEq(hook.feeOf(alice), 2000);
    }

    // -------- fuzz --------

    function testFuzz_feeOf_alwaysAtMost30bps(uint256 score) public {
        score = bound(score, 0, 100);
        vm.prank(operator);
        registry.setScore(alice, score);
        assertLe(hook.feeOf(alice), 3000);
        assertGe(hook.feeOf(alice), 500);
    }

    function testFuzz_feeOf_monotonicWithScore(uint256 lowScore, uint256 highScore) public {
        lowScore = bound(lowScore, 0, 100);
        highScore = bound(highScore, lowScore, 100);

        vm.prank(operator);
        registry.setScore(alice, lowScore);
        uint24 lowFee = hook.feeOf(alice);

        vm.prank(operator);
        registry.setScore(alice, highScore);
        uint24 highFee = hook.feeOf(alice);

        // higher score => lower (or equal) fee
        assertLe(highFee, lowFee);
    }
}
