// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal interface for the existing X Cup FanPassSBT on X Layer.
///         Source: apps/xcup/contracts/FanPassSBT.sol
interface IFanPassSBT {
    /// @notice 0 or 1 (soulbound, max one per wallet).
    function balanceOf(address wallet) external view returns (uint256);
}
