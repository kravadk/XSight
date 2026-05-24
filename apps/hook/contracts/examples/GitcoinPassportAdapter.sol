// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Gitcoin Passport adapter for FanFeeHook. Reads the on-chain
///         Passport score (stored at 4 decimals) and normalizes to 0-100
///         for the FanFeeHook tier curve.
interface IPassportDecoder {
    /// @return score scaled by 1e4 (e.g. 25.5 -> 255000)
    function getScore(address user) external view returns (uint256 score);
    function getExpirationTime(address user) external view returns (uint64);
}

contract GitcoinPassportAdapter {
    IPassportDecoder public immutable decoder;

    /// @notice Cap Passport scores above 50 to FanFeeHook's 100-max scale,
    ///         since Passport scores >50 are uncommon and we want full
    ///         dynamic range across the 28/64/82 tier thresholds.
    uint256 private constant PASSPORT_MAX = 50;

    constructor(IPassportDecoder _decoder) {
        decoder = _decoder;
    }

    /// @notice Returns 0..100 score for FanFeeHook tier lookup.
    function scoreOf(address wallet) external view returns (uint256) {
        uint256 raw = decoder.getScore(wallet);
        uint256 integerScore = raw / 1e4;
        if (integerScore >= PASSPORT_MAX) return 100;
        return (integerScore * 100) / PASSPORT_MAX;
    }

    function updatedAt(address wallet) external view returns (uint64) {
        return decoder.getExpirationTime(wallet);
    }
}
