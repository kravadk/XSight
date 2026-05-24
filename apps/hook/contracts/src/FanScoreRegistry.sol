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

    /// @notice Deploys the registry with the caller as owner.
    /// @param initialOperator Address that will be allowed to write scores.
    constructor(address initialOperator) {
        if (initialOperator == address(0)) revert ZeroAddress();
        owner = msg.sender;
        operator = initialOperator;
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

    /// @notice Replace the score-writing operator (e.g. rotate server EOA).
    /// @param  nextOperator New operator; must be non-zero.
    function setOperator(address nextOperator) external onlyOwner {
        if (nextOperator == address(0)) revert ZeroAddress();
        emit OperatorChanged(operator, nextOperator);
        operator = nextOperator;
    }

    /// @notice Write a single score. Operator-only.
    /// @param  wallet Address being scored.
    /// @param  score  0..100 reputation; reverts on overflow.
    function setScore(address wallet, uint256 score) external onlyOperator {
        _setScore(wallet, score);
    }

    /// @notice Batch-write scores in one transaction (weekly cron from server).
    /// @param  wallets Addresses being scored (must match `scores.length`).
    /// @param  scores  Each value 0..100; reverts on overflow.
    function setScores(address[] calldata wallets, uint256[] calldata scores) external onlyOperator {
        if (wallets.length != scores.length) revert LengthMismatch();
        for (uint256 i = 0; i < wallets.length; i++) {
            _setScore(wallets[i], scores[i]);
        }
    }

    /// @notice Tier for a wallet's currently-stored score.
    /// @param  wallet Address being checked.
    /// @return tier   0 (unknown) | 1 (active) | 2 (trusted) | 3 (oracle-grade).
    function tierOf(address wallet) external view returns (uint8) {
        return _tierFromScore(scoreOf[wallet]);
    }

    /// @notice Pure conversion `score -> tier`; useful for client-side preview.
    /// @param  score 0..100 raw reputation.
    /// @return tier  0..3 per the documented thresholds.
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
