// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../ParimutuelMarket.sol"; // brings ICupOracle into scope

/// @notice Minimal 6-decimal ERC20 for tests.
contract MockUSDC {
    string public name = "Mock USDC";
    string public symbol = "mUSDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice Configurable CupOracle stand-in for tests.
contract MockOracle is ICupOracle {
    mapping(bytes32 => MatchRecord) private recs;

    function setMatch(bytes32 matchId, uint8 state, uint8 finalOutcome) external {
        MatchRecord storage r = recs[matchId];
        r.matchId = matchId;
        r.state = state;
        r.finalOutcome = finalOutcome;
    }

    function getMatch(bytes32 matchId) external view returns (MatchRecord memory) {
        return recs[matchId];
    }
}

/// @notice Token whose transfer re-enters claim() — must be stopped by nonReentrant.
interface IClaimable {
    function claim(bytes32 marketId) external;
}

contract ReentrantToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    address public target;
    bytes32 public attackMarket;
    bool public attacking;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function arm(address t, bytes32 m) external {
        target = t;
        attackMarket = m;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        if (target != address(0) && !attacking) {
            attacking = true;
            IClaimable(target).claim(attackMarket); // expected to revert via nonReentrant
        }
        return true;
    }
}
