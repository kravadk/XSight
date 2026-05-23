// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {FanScoreRegistry} from "../src/FanScoreRegistry.sol";

contract FanScoreRegistryTest is Test {
    FanScoreRegistry public registry;
    address public owner = makeAddr("owner");
    address public operator = makeAddr("operator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public eve = makeAddr("eve");

    function setUp() public {
        vm.prank(owner);
        registry = new FanScoreRegistry(operator);
    }

    // -------- constructor + ownership --------

    function test_constructor_setsOwnerAndOperator() public view {
        assertEq(registry.owner(), owner);
        assertEq(registry.operator(), operator);
    }

    function test_constructor_revertsOnZeroOperator() public {
        vm.expectRevert(FanScoreRegistry.ZeroAddress.selector);
        new FanScoreRegistry(address(0));
    }

    function test_transferOwner_works() public {
        vm.prank(owner);
        registry.transferOwner(alice);
        assertEq(registry.owner(), alice);
    }

    function test_transferOwner_onlyOwner() public {
        vm.prank(eve);
        vm.expectRevert(FanScoreRegistry.OnlyOwner.selector);
        registry.transferOwner(alice);
    }

    function test_transferOwner_revertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(FanScoreRegistry.ZeroAddress.selector);
        registry.transferOwner(address(0));
    }

    function test_setOperator_works() public {
        vm.prank(owner);
        registry.setOperator(alice);
        assertEq(registry.operator(), alice);
    }

    function test_setOperator_onlyOwner() public {
        vm.prank(operator);
        vm.expectRevert(FanScoreRegistry.OnlyOwner.selector);
        registry.setOperator(alice);
    }

    // -------- setScore --------

    function test_setScore_storesValueAndTimestamp() public {
        vm.warp(1_000_000);
        vm.prank(operator);
        registry.setScore(alice, 75);
        assertEq(registry.scoreOf(alice), 75);
        assertEq(registry.updatedAt(alice), 1_000_000);
    }

    function test_setScore_onlyOperator() public {
        vm.prank(eve);
        vm.expectRevert(FanScoreRegistry.OnlyOperator.selector);
        registry.setScore(alice, 50);
    }

    function test_setScore_revertsZeroAddress() public {
        vm.prank(operator);
        vm.expectRevert(FanScoreRegistry.ZeroAddress.selector);
        registry.setScore(address(0), 50);
    }

    function test_setScore_revertsScoreAbove100() public {
        vm.prank(operator);
        vm.expectRevert(FanScoreRegistry.ScoreOutOfRange.selector);
        registry.setScore(alice, 101);
    }

    function test_setScore_acceptsBoundary100() public {
        vm.prank(operator);
        registry.setScore(alice, 100);
        assertEq(registry.scoreOf(alice), 100);
    }

    function test_setScore_overwrites() public {
        vm.prank(operator);
        registry.setScore(alice, 50);
        vm.prank(operator);
        registry.setScore(alice, 80);
        assertEq(registry.scoreOf(alice), 80);
    }

    function test_setScores_batchWorks() public {
        address[] memory wallets = new address[](3);
        uint256[] memory scores = new uint256[](3);
        wallets[0] = alice;
        wallets[1] = bob;
        wallets[2] = eve;
        scores[0] = 30;
        scores[1] = 65;
        scores[2] = 90;

        vm.prank(operator);
        registry.setScores(wallets, scores);

        assertEq(registry.scoreOf(alice), 30);
        assertEq(registry.scoreOf(bob), 65);
        assertEq(registry.scoreOf(eve), 90);
    }

    function test_setScores_revertsOnLengthMismatch() public {
        address[] memory wallets = new address[](2);
        uint256[] memory scores = new uint256[](3);
        wallets[0] = alice;
        wallets[1] = bob;
        scores[0] = 1;
        scores[1] = 2;
        scores[2] = 3;

        vm.prank(operator);
        vm.expectRevert(FanScoreRegistry.LengthMismatch.selector);
        registry.setScores(wallets, scores);
    }

    // -------- tier thresholds (match cupReputation.ts) --------

    function test_tierFromScore_thresholds() public view {
        // unknown
        assertEq(registry.tierFromScore(0), 0);
        assertEq(registry.tierFromScore(27), 0);
        // active
        assertEq(registry.tierFromScore(28), 1);
        assertEq(registry.tierFromScore(63), 1);
        // trusted
        assertEq(registry.tierFromScore(64), 2);
        assertEq(registry.tierFromScore(81), 2);
        // oracle-grade
        assertEq(registry.tierFromScore(82), 3);
        assertEq(registry.tierFromScore(100), 3);
    }

    function test_tierOf_readsScoreThenTiers() public {
        vm.startPrank(operator);
        registry.setScore(alice, 0);
        registry.setScore(bob, 50);
        registry.setScore(eve, 95);
        vm.stopPrank();

        assertEq(registry.tierOf(alice), 0);
        assertEq(registry.tierOf(bob), 1);
        assertEq(registry.tierOf(eve), 3);
    }

    // -------- fuzz --------

    function testFuzz_tierFromScore_monotonic(uint256 score) public view {
        score = bound(score, 0, 100);
        uint8 tier = registry.tierFromScore(score);
        if (score >= 82) assertEq(tier, 3);
        else if (score >= 64) assertEq(tier, 2);
        else if (score >= 28) assertEq(tier, 1);
        else assertEq(tier, 0);
    }

    function testFuzz_setScore_storesValue(address wallet, uint256 score) public {
        vm.assume(wallet != address(0));
        score = bound(score, 0, 100);
        vm.prank(operator);
        registry.setScore(wallet, score);
        assertEq(registry.scoreOf(wallet), score);
    }
}
