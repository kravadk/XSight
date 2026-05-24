// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal ERC-20 surface needed by CupSidePot. Avoids pulling the full
///         OpenZeppelin ERC20 just for two function selectors.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title CupSidePot - weekly-settled prediction-market side pool.
 * @notice Receives extra-fee spread from FanFeeHook (or any anonymous depositor),
 *         buckets deposits into weekly epochs, and pays out the pot to a
 *         finalized winners list (set by the operator after reading CupOracleV3
 *         + BracketNFT picks off-chain).
 *
 *         Centralized winners-list is intentional for the hackathon: the operator
 *         is the X Cup oracle multisig, same trust assumption as ArbiterMultisig.
 *         Post-hackathon decentralization: Merkle root of winners + proof-claim.
 *
 *         Pure ERC-20 only (single payout token, e.g. USDC). No native ETH.
 */
contract CupSidePot {
    address public owner;
    address public operator;
    IERC20 public immutable token;
    /// @notice Unix-seconds anchor. weekId = (block.timestamp - startedAt) / 1 weeks
    uint256 public immutable startedAt;

    /// @notice Total tokens deposited into a given week (before settle).
    mapping(uint256 weekId => uint256 amount) public weekPot;
    /// @notice Set once the operator finalizes the winners list for a week.
    mapping(uint256 weekId => bool) public settled;
    /// @notice Per-week winners list (set in `settle`).
    mapping(uint256 weekId => address[]) private _winnersByWeek;
    /// @notice Per-week per-winner claim status.
    mapping(uint256 weekId => mapping(address => bool)) public claimed;
    /// @notice Per-week per-winner share amount (computed in settle).
    mapping(uint256 weekId => uint256) public sharePerWinner;

    event OwnerChanged(address indexed previousOwner, address indexed nextOwner);
    event OperatorChanged(address indexed previousOperator, address indexed nextOperator);
    event Deposited(address indexed swapper, uint256 indexed weekId, uint256 amount);
    event Settled(uint256 indexed weekId, uint256 winnersCount, uint256 sharePerWinner);
    event Claimed(uint256 indexed weekId, address indexed winner, uint256 amount);

    error OnlyOwner();
    error OnlyOperator();
    error ZeroAddress();
    error AlreadySettled();
    error NotSettled();
    error NotAWinner();
    error AlreadyClaimed();
    error EmptyWinners();
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
    /// @param initialOperator Address allowed to call `settle`.
    constructor(address payoutToken, address initialOperator) {
        if (payoutToken == address(0)) revert ZeroAddress();
        if (initialOperator == address(0)) revert ZeroAddress();
        owner = msg.sender;
        operator = initialOperator;
        token = IERC20(payoutToken);
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

    /// @notice Current week index (1-based). week 0 reserved for "not started".
    function currentWeekId() public view returns (uint256) {
        return ((block.timestamp - startedAt) / 1 weeks) + 1;
    }

    /// @notice Anyone can deposit. Caller must have approved `token` to this contract.
    ///         Typically the FanFeeHook deposits the extra-fee spread on each swap.
    /// @param swapper logical origin (for the Deposited event); does not constrain transfer source.
    /// @param amount  amount of payout token to pull from msg.sender.
    function depositFor(address swapper, uint256 amount) external {
        if (amount == 0) return;
        bool ok = token.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        uint256 wk = currentWeekId();
        weekPot[wk] += amount;
        emit Deposited(swapper, wk, amount);
    }

    /// @notice Operator finalizes the winners list for a week. Splits the pot
    ///         equally across winners. Per-winner share is stored; remainder dust
    ///         (from integer division) stays in the contract.
    function settle(uint256 weekId, address[] calldata winners) external onlyOperator {
        if (settled[weekId]) revert AlreadySettled();
        if (winners.length == 0) revert EmptyWinners();
        uint256 pot = weekPot[weekId];
        uint256 share = pot / winners.length;
        sharePerWinner[weekId] = share;
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] == address(0)) revert ZeroAddress();
            _winnersByWeek[weekId].push(winners[i]);
        }
        settled[weekId] = true;
        emit Settled(weekId, winners.length, share);
    }

    /// @notice Winner pulls their pro-rata share. Idempotent (reverts on double).
    function claim(uint256 weekId) external {
        if (!settled[weekId]) revert NotSettled();
        if (claimed[weekId][msg.sender]) revert AlreadyClaimed();
        if (!_isWinner(weekId, msg.sender)) revert NotAWinner();
        claimed[weekId][msg.sender] = true;
        uint256 amount = sharePerWinner[weekId];
        bool ok = token.transfer(msg.sender, amount);
        if (!ok) revert TransferFailed();
        emit Claimed(weekId, msg.sender, amount);
    }

    /// @notice Number of winners recorded for a week (0 until settled).
    function winnersCount(uint256 weekId) external view returns (uint256) {
        return _winnersByWeek[weekId].length;
    }

    /// @notice The winner at a given index (revert on out-of-bounds).
    function winnerAt(uint256 weekId, uint256 index) external view returns (address) {
        return _winnersByWeek[weekId][index];
    }

    function _isWinner(uint256 weekId, address account) internal view returns (bool) {
        address[] storage winners = _winnersByWeek[weekId];
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] == account) return true;
        }
        return false;
    }
}
