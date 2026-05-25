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
    /// @notice Pause / unpause authority and operator-rotation authority.
    address public owner;
    /// @notice Address allowed to publish Merkle roots via `settle`.
    address public operator;
    /// @notice ERC-20 paid in/out (single token, e.g. USDC).
    IERC20V2 public immutable token;
    /// @notice Unix-seconds anchor. weekId = ((block.timestamp - startedAt) / 1 weeks) + 1.
    uint256 public immutable startedAt;

    /// @notice Total tokens deposited into a given week (pre-settle running total).
    mapping(uint256 weekId => uint256 amount) public weekPot;
    /// @notice Merkle root binding the per-winner amounts for a given week.
    mapping(uint256 weekId => bytes32) public weekRoot;
    /// @notice True once `settle(weekId, root)` has been called (one-shot).
    mapping(uint256 weekId => bool) public settled;
    /// @notice Per-week per-account claim status (O(1) double-claim guard).
    mapping(uint256 weekId => mapping(address => bool)) public claimed;

    event OwnerChanged(address indexed previous, address indexed next);
    event OperatorChanged(address indexed previous, address indexed next);

    /// @notice Emitted on every deposit that increases `weekPot`.
    /// @param swapper Logical originator (echoed into event; does not constrain transfer source).
    /// @param weekId  Week bucket the amount lands in (`currentWeekId()`).
    /// @param amount  Amount of payout token pulled from `msg.sender`.
    event Deposited(address indexed swapper, uint256 indexed weekId, uint256 amount);

    /// @notice Emitted once when the operator publishes the winners Merkle root.
    /// @param weekId     Week being settled.
    /// @param merkleRoot 32-byte root binding all (weekId, account, amount) leaves.
    event SettledMerkle(uint256 indexed weekId, bytes32 merkleRoot);

    /// @notice Emitted on successful proof-claim.
    /// @param weekId Week being claimed for.
    /// @param winner Account that supplied the valid proof (= msg.sender).
    /// @param amount Tokens transferred to the winner.
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

    /// @notice Deploys the pot with the caller as owner.
    /// @param payoutToken     ERC-20 paid in/out (single token, e.g. USDC).
    /// @param initialOperator Address allowed to publish Merkle roots via `settle`.
    constructor(address payoutToken, address initialOperator) {
        if (payoutToken == address(0) || initialOperator == address(0)) revert ZeroAddress();
        owner = msg.sender;
        operator = initialOperator;
        token = IERC20V2(payoutToken);
        startedAt = block.timestamp;
        emit OwnerChanged(address(0), msg.sender);
        emit OperatorChanged(address(0), initialOperator);
    }

    /// @notice Hand ownership to a new address.
    /// @param  nextOwner New owner; must be non-zero.
    function transferOwner(address nextOwner) external onlyOwner {
        if (nextOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, nextOwner);
        owner = nextOwner;
    }

    /// @notice Rotate the operator key (e.g. server EOA rotation).
    /// @param  nextOperator New operator; must be non-zero.
    function setOperator(address nextOperator) external onlyOwner {
        if (nextOperator == address(0)) revert ZeroAddress();
        emit OperatorChanged(operator, nextOperator);
        operator = nextOperator;
    }

    /// @notice Freeze deposits and claims (settle stays open so an in-flight
    ///         root can still be recorded during a pause-induced freeze).
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume deposits and claims.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Current week index (1-based). Week 0 reserved for "not started".
    function currentWeekId() public view returns (uint256) {
        return ((block.timestamp - startedAt) / 1 weeks) + 1;
    }

    /// @notice Anyone can deposit. Caller must have approved `token` to this contract.
    ///         Typically the FanFeeHook deposits the extra-fee spread on each swap.
    /// @param swapper Logical origin (echoed in event); does not constrain transfer source.
    /// @param amount  Amount of payout token pulled from `msg.sender`. Zero is a no-op.
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
