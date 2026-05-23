// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title FanScoreRegistry — on-chain cache of FanPass scores.
 * @notice Mirrors the off-chain `server/src/services/cupReputation.ts` scoring
 *         (0..100, five-axis breakdown). The operator writes weekly batch
 *         updates so the hook can read scores cheaply during `beforeSwap`.
 *
 *         Tier thresholds match cupReputation.ts:
 *           - score >= 82 -> tier 3 (oracle-grade)
 *           - score >= 64 -> tier 2 (trusted)
 *           - score >= 28 -> tier 1 (active)
 *           - else        -> tier 0 (unknown)
 *
 *         Trust model: this is a single-operator key-value store for the
 *         hackathon. Post-hackathon, scores will be Merkle-proofed against
 *         a verifiable off-chain commitment.
 */
contract FanScoreRegistry {
    address public owner;
    address public operator;

    /// @notice 0..100. 0 means "not seen / no score" - treated as tier 0.
    mapping(address => uint256) public scoreOf;
    /// @notice Last update epoch - clients can detect stale scores.
    mapping(address => uint64) public updatedAt;

    event OwnerChanged(address indexed previousOwner, address indexed nextOwner);
    event OperatorChanged(address indexed previousOperator, address indexed nextOperator);
    event ScoreUpdated(address indexed wallet, uint256 score, uint64 updatedAt);

    error OnlyOwner();
    error OnlyOperator();
    error ZeroAddress();
    error LengthMismatch();
    error ScoreOutOfRange();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert OnlyOperator();
        _;
    }

    constructor(address initialOperator) {
        if (initialOperator == address(0)) revert ZeroAddress();
        owner = msg.sender;
        operator = initialOperator;
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

    /// @notice Write a single score. Operator-only.
    function setScore(address wallet, uint256 score) external onlyOperator {
        _setScore(wallet, score);
    }

    /// @notice Batch-write scores (weekly cron from server). Operator-only.
    function setScores(address[] calldata wallets, uint256[] calldata scores) external onlyOperator {
        if (wallets.length != scores.length) revert LengthMismatch();
        for (uint256 i = 0; i < wallets.length; i++) {
            _setScore(wallets[i], scores[i]);
        }
    }

    /// @notice Tier from score. Pure view, gas-cheap.
    function tierOf(address wallet) external view returns (uint8) {
        return _tierFromScore(scoreOf[wallet]);
    }

    /// @notice Public helper so the hook + UI share one formula.
    function tierFromScore(uint256 score) external pure returns (uint8) {
        return _tierFromScore(score);
    }

    function _tierFromScore(uint256 score) internal pure returns (uint8) {
        if (score >= 82) return 3; // oracle-grade
        if (score >= 64) return 2; // trusted
        if (score >= 28) return 1; // active
        return 0; // unknown
    }

    function _setScore(address wallet, uint256 score) internal {
        if (wallet == address(0)) revert ZeroAddress();
        if (score > 100) revert ScoreOutOfRange();
        scoreOf[wallet] = score;
        updatedAt[wallet] = uint64(block.timestamp);
        emit ScoreUpdated(wallet, score, uint64(block.timestamp));
    }
}
