// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20V2 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title CupSidePotV2 - v1 + Pausable + Merkle-proof claim.
 * @notice Upgrade path documented in apps/hook/contracts/SECURITY.md
 *         sections 2.2, 2.3, 2.5. Three improvements over v1:
 *           1. Pausable - owner can freeze deposits/claims in case of bug.
 *           2. Merkle-rooted settle - operator publishes a 32-byte root
 *              binding the entire winners-list off-chain.
 *           3. O(1) double-claim guard - mapping replaces linear array scan.
 *
 *         Leaf layout (must match the off-chain generator):
 *           keccak256(abi.encode(weekId, account, amount))
 */
contract CupSidePotV2 is Pausable, ReentrancyGuard {
    address public owner;
    address public operator;
    IERC20V2 public immutable token;
    uint256 public immutable startedAt;

    mapping(uint256 weekId => uint256 amount) public weekPot;
    mapping(uint256 weekId => bytes32) public weekRoot;
    mapping(uint256 weekId => bool) public settled;
    mapping(uint256 weekId => mapping(address => bool)) public claimed;

    event OwnerChanged(address indexed previous, address indexed next);
    event OperatorChanged(address indexed previous, address indexed next);
    event Deposited(address indexed swapper, uint256 indexed weekId, uint256 amount);
    event SettledMerkle(uint256 indexed weekId, bytes32 merkleRoot);
    event Claimed(uint256 indexed weekId, address indexed winner, uint256 amount);

    error OnlyOwner();
    error OnlyOperator();
    error ZeroAddress();
    error AlreadySettled();
    error NotSettled();
    error AlreadyClaimed();
    error InvalidProof();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert OnlyOperator();
        _;
    }

    constructor(address payoutToken, address initialOperator) {
        if (payoutToken == address(0) || initialOperator == address(0)) revert ZeroAddress();
        owner = msg.sender;
        operator = initialOperator;
        token = IERC20V2(payoutToken);
        startedAt = block.timestamp;
        emit OwnerChanged(address(0), msg.sender);
        emit OperatorChanged(address(0), initialOperator);
    }

    function transferOwner(address nextOwner) external onlyOwner {
        if (nextOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, nextOwner);
        owner = nextOwner;
    }

    function setOperator(address nextOperator) external onlyOwner {
        if (nextOperator == address(0)) revert ZeroAddress();
        emit OperatorChanged(operator, nextOperator);
        operator = nextOperator;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function currentWeekId() public view returns (uint256) {
        return ((block.timestamp - startedAt) / 1 weeks) + 1;
    }

    function depositFor(address swapper, uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) return;
        bool ok = token.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        uint256 wk = currentWeekId();
        weekPot[wk] += amount;
        emit Deposited(swapper, wk, amount);
    }

    /// @notice Operator publishes the Merkle root binding all winners for a week.
    function settle(uint256 weekId, bytes32 merkleRoot) external onlyOperator {
        if (settled[weekId]) revert AlreadySettled();
        weekRoot[weekId] = merkleRoot;
        settled[weekId] = true;
        emit SettledMerkle(weekId, merkleRoot);
    }

    /// @notice Caller proves their leaf and pulls their share.
    function claimWithProof(
        uint256 weekId,
        bytes32[] calldata proof,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        if (!settled[weekId]) revert NotSettled();
        if (claimed[weekId][msg.sender]) revert AlreadyClaimed();

        bytes32 leaf = keccak256(abi.encode(weekId, msg.sender, amount));
        if (!MerkleProof.verify(proof, weekRoot[weekId], leaf)) revert InvalidProof();

        claimed[weekId][msg.sender] = true;
        bool ok = token.transfer(msg.sender, amount);
        if (!ok) revert TransferFailed();
        emit Claimed(weekId, msg.sender, amount);
    }
}
