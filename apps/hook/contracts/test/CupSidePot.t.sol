// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {CupSidePot} from "../src/CupSidePot.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract CupSidePotTest is Test {
    CupSidePot public pot;
    MockERC20 public usdc;
    address public owner = makeAddr("owner");
    address public operator = makeAddr("operator");
    address public hookFunder = makeAddr("hookFunder"); // simulates FanFeeHook
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public eve = makeAddr("eve");

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 6);
        vm.prank(owner);
        pot = new CupSidePot(address(usdc), operator);
        // Fund the hook-funder with USDC so it can deposit.
        usdc.mint(hookFunder, 10_000e6);
        vm.prank(hookFunder);
        usdc.approve(address(pot), type(uint256).max);
    }

    // -------- constructor + ownership --------

    function test_constructor_setsState() public view {
        assertEq(pot.owner(), owner);
        assertEq(pot.operator(), operator);
        assertEq(address(pot.token()), address(usdc));
        assertEq(pot.startedAt(), block.timestamp);
    }

    function test_constructor_revertsZeroToken() public {
        vm.expectRevert(CupSidePot.ZeroAddress.selector);
        new CupSidePot(address(0), operator);
    }

    function test_constructor_revertsZeroOperator() public {
        vm.expectRevert(CupSidePot.ZeroAddress.selector);
        new CupSidePot(address(usdc), address(0));
    }

    function test_transferOwner_works() public {
        vm.prank(owner);
        pot.transferOwner(alice);
        assertEq(pot.owner(), alice);
    }

    function test_transferOwner_onlyOwner() public {
        vm.prank(eve);
        vm.expectRevert(CupSidePot.OnlyOwner.selector);
        pot.transferOwner(alice);
    }

    function test_setOperator_works() public {
        vm.prank(owner);
        pot.setOperator(alice);
        assertEq(pot.operator(), alice);
    }

    // -------- weekId math --------

    function test_currentWeekId_startsAt1() public view {
        assertEq(pot.currentWeekId(), 1);
    }

    function test_currentWeekId_increments() public {
        uint256 wk0 = pot.currentWeekId();
        vm.warp(block.timestamp + 1 weeks + 1);
        assertEq(pot.currentWeekId(), wk0 + 1);
    }

    // -------- depositFor --------

    function test_depositFor_increasesWeekPot() public {
        uint256 wk = pot.currentWeekId();
        vm.prank(hookFunder);
        pot.depositFor(alice, 100e6);
        assertEq(pot.weekPot(wk), 100e6);
        assertEq(usdc.balanceOf(address(pot)), 100e6);
    }

    function test_depositFor_zeroAmountIsNoOp() public {
        vm.prank(hookFunder);
        pot.depositFor(alice, 0);
        assertEq(pot.weekPot(pot.currentWeekId()), 0);
    }

    function test_depositFor_multipleAccumulate() public {
        uint256 wk = pot.currentWeekId();
        vm.startPrank(hookFunder);
        pot.depositFor(alice, 50e6);
        pot.depositFor(bob, 30e6);
        pot.depositFor(eve, 20e6);
        vm.stopPrank();
        assertEq(pot.weekPot(wk), 100e6);
    }

    function test_depositFor_revertsWithoutApproval() public {
        address noApprove = makeAddr("noApprove");
        usdc.mint(noApprove, 100e6);
        vm.prank(noApprove);
        vm.expectRevert();
        pot.depositFor(alice, 100e6);
    }

    // -------- settle --------

    function test_settle_locksWinnersAndComputesShare() public {
        uint256 wk = pot.currentWeekId();
        vm.prank(hookFunder);
        pot.depositFor(alice, 300e6); // 300 USDC pot

        address[] memory winners = new address[](3);
        winners[0] = alice;
        winners[1] = bob;
        winners[2] = eve;

        vm.prank(operator);
        pot.settle(wk, winners);

        assertTrue(pot.settled(wk));
        assertEq(pot.sharePerWinner(wk), 100e6); // 300/3
        assertEq(pot.winnersCount(wk), 3);
        assertEq(pot.winnerAt(wk, 0), alice);
    }

    function test_settle_onlyOperator() public {
        address[] memory winners = new address[](1);
        winners[0] = alice;
        vm.prank(eve);
        vm.expectRevert(CupSidePot.OnlyOperator.selector);
        pot.settle(1, winners);
    }

    function test_settle_revertsEmpty() public {
        address[] memory winners = new address[](0);
        vm.prank(operator);
        vm.expectRevert(CupSidePot.EmptyWinners.selector);
        pot.settle(1, winners);
    }

    function test_settle_revertsZeroWinner() public {
        address[] memory winners = new address[](1);
        winners[0] = address(0);
        vm.prank(operator);
        vm.expectRevert(CupSidePot.ZeroAddress.selector);
        pot.settle(1, winners);
    }

    function test_settle_revertsTwice() public {
        address[] memory winners = new address[](1);
        winners[0] = alice;
        vm.prank(operator);
        pot.settle(1, winners);
        vm.prank(operator);
        vm.expectRevert(CupSidePot.AlreadySettled.selector);
        pot.settle(1, winners);
    }

    function test_settle_dustStaysInContract() public {
        uint256 wk = pot.currentWeekId();
        vm.prank(hookFunder);
        pot.depositFor(alice, 100e6); // not divisible by 3

        address[] memory winners = new address[](3);
        winners[0] = alice;
        winners[1] = bob;
        winners[2] = eve;
        vm.prank(operator);
        pot.settle(wk, winners);

        // 100e6 / 3 = 33_333_333 each * 3 = 99_999_999; 1 dust unit stays
        assertEq(pot.sharePerWinner(wk), 33_333_333);
    }

    // -------- claim --------

    function test_claim_winnerGetsShare() public {
        uint256 wk = pot.currentWeekId();
        vm.prank(hookFunder);
        pot.depositFor(alice, 200e6);
        address[] memory winners = new address[](2);
        winners[0] = alice;
        winners[1] = bob;
        vm.prank(operator);
        pot.settle(wk, winners);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        pot.claim(wk);
        assertEq(usdc.balanceOf(alice), before + 100e6);
        assertTrue(pot.claimed(wk, alice));
    }

    function test_claim_revertsBeforeSettle() public {
        vm.prank(alice);
        vm.expectRevert(CupSidePot.NotSettled.selector);
        pot.claim(1);
    }

    function test_claim_revertsNotAWinner() public {
        uint256 wk = pot.currentWeekId();
        vm.prank(hookFunder);
        pot.depositFor(alice, 100e6);
        address[] memory winners = new address[](1);
        winners[0] = alice;
        vm.prank(operator);
        pot.settle(wk, winners);

        vm.prank(eve);
        vm.expectRevert(CupSidePot.NotAWinner.selector);
        pot.claim(wk);
    }

    function test_claim_revertsDouble() public {
        uint256 wk = pot.currentWeekId();
        vm.prank(hookFunder);
        pot.depositFor(alice, 100e6);
        address[] memory winners = new address[](1);
        winners[0] = alice;
        vm.prank(operator);
        pot.settle(wk, winners);

        vm.prank(alice);
        pot.claim(wk);
        vm.prank(alice);
        vm.expectRevert(CupSidePot.AlreadyClaimed.selector);
        pot.claim(wk);
    }

    // -------- fuzz --------

    function testFuzz_depositFor_neverOverflowsBalance(uint256 amount) public {
        amount = bound(amount, 1, 1_000_000e6);
        usdc.mint(hookFunder, amount);
        vm.prank(hookFunder);
        pot.depositFor(alice, amount);
        assertGe(usdc.balanceOf(address(pot)), amount);
    }
}
