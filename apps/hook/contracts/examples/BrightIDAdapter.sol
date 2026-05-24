// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal BrightID-backed reputation adapter for FanFeeHook.
///         Wraps a BrightID context contract so FanFeeHook can read
///         "verified human?" status as a 0-100 score (binary for now;
///         extend with sponsor count / time-active for finer tiers).
///
///         Pass this contract's address as `fanScoreRegistry` to
///         FanFeeHook's constructor on a fork.
interface IBrightID {
    function isVerified(address account) external view returns (bool);
}

contract BrightIDAdapter {
    IBrightID public immutable brightId;

    constructor(IBrightID _brightId) {
        brightId = _brightId;
    }

    /// @notice Returns 100 if the address is BrightID-verified (Oracle-grade
    ///         tier), 0 otherwise. FanFeeHook tier thresholds: 28/64/82 —
    ///         anything above 82 lands in Oracle-grade (5 bps fee).
    function scoreOf(address wallet) external view returns (uint256) {
        return brightId.isVerified(wallet) ? 100 : 0;
    }

    /// @notice Downstream consumers (e.g. CupSidePot) may surface stale-score
    ///         warnings; return 0 since BrightID gives only current state.
    function updatedAt(address) external pure returns (uint64) {
        return 0;
    }
}
