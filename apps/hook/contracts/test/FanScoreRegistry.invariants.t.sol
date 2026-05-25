// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {FanScoreRegistry} from "../src/FanScoreRegistry.sol";

/// @notice Handler that drives the registry with bounded, valid inputs only.
///         The fuzzer picks (wallet, score) pairs; we clamp score into [0, 100]
///         so all writes succeed and the invariants below can run against state.
contract FanScoreHandler is Test {
    FanScoreRegistry public registry;
    address public operator;
    address[] public seenWallets;
    mapping(address => bool) internal _knownWallet;

    constructor(FanScoreRegistry _registry, address _operator) {
        registry = _registry;
        operator = _operator;
    }

    function setScore(address wallet, uint256 rawScore) external {
        // Reject zero address; the registry would revert anyway.
        if (wallet == address(0)) return;
        uint256 score = bound(rawScore, 0, 100);
        vm.prank(operator);
        registry.setScore(wallet, score);
        if (!_knownWallet[wallet]) {
            _knownWallet[wallet] = true;
            seenWallets.push(wallet);
        }
    }

    function setScoresBatch(address w1, address w2, uint256 s1, uint256 s2) external {
        if (w1 == address(0) || w2 == address(0)) return;
        address[] memory wallets = new address[](2);
        uint256[] memory scores = new uint256[](2);
        wallets[0] = w1;
        wallets[1] = w2;
        scores[0] = bound(s1, 0, 100);
        scores[1] = bound(s2, 0, 100);
        vm.prank(operator);
        registry.setScores(wallets, scores);
        for (uint256 i = 0; i < wallets.length; i++) {
            if (!_knownWallet[wallets[i]]) {
                _knownWallet[wallets[i]] = true;
                seenWallets.push(wallets[i]);
            }
        }
    }

    function walletsCount() external view returns (uint256) {
        return seenWallets.length;
    }

    function walletAt(uint256 i) external view returns (address) {
        return seenWallets[i];
    }
}

/**
 * @notice Invariants that must hold for FanScoreRegistry regardless of the
 *         order or count of operator writes:
 *
 *           1. score <= 100 always (no over-100 leak after any sequence)
 *           2. tierFromScore is monotone across documented bands
 *           3. tierOf stays in {0,1,2,3} for every reachable wallet
 *           4. updatedAt > 0 iff score has ever been written
 */
contract FanScoreRegistryInvariants is Test {
    FanScoreRegistry public registry;
    FanScoreHandler public handler;
    address public operator = makeAddr("operator");

    function setUp() public {
        registry = new FanScoreRegistry(operator);
        handler = new FanScoreHandler(registry, operator);
        targetContract(address(handler));
    }

    /// @notice Stored scores must stay in the [0, 100] band the registry enforces.
    function invariant_scoreNeverOver100() public view {
        uint256 n = handler.walletsCount();
        for (uint256 i = 0; i < n; i++) {
            address w = handler.walletAt(i);
            assertLe(registry.scoreOf(w), 100, "score > 100");
        }
    }

    /// @notice Tier resolution must be monotone in score across the documented bands.
    function invariant_tierMonotoneInScore() public view {
        assertEq(registry.tierFromScore(0), 0);
        assertEq(registry.tierFromScore(27), 0);
        assertEq(registry.tierFromScore(28), 1);
        assertEq(registry.tierFromScore(63), 1);
        assertEq(registry.tierFromScore(64), 2);
        assertEq(registry.tierFromScore(81), 2);
        assertEq(registry.tierFromScore(82), 3);
        assertEq(registry.tierFromScore(100), 3);
    }

    /// @notice tierOf must always live in {0,1,2,3} - no overflow into higher bands.
    function invariant_tierAlwaysInRange() public view {
        uint256 n = handler.walletsCount();
        for (uint256 i = 0; i < n; i++) {
            address w = handler.walletAt(i);
            uint8 t = registry.tierOf(w);
            assertLe(t, 3, "tier > 3");
        }
    }

    /// @notice Any wallet the handler ever wrote must have a non-zero updatedAt.
    function invariant_updatedAtSetOnWrite() public view {
        uint256 n = handler.walletsCount();
        for (uint256 i = 0; i < n; i++) {
            address w = handler.walletAt(i);
            assertGt(registry.updatedAt(w), 0, "updatedAt unset after write");
        }
    }
}
