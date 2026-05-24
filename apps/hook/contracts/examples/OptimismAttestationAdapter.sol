// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Optimism Attestation Station adapter for FanFeeHook.
///         Reads a single attestation key from an attester EOA and treats
///         non-empty payload as "endorsed" (score 80 = Trusted tier).
///
///         Replace ATTESTER + KEY with your own attestation source.
interface IAttestationStation {
    function attestations(
        address creator,
        address about,
        bytes32 key
    ) external view returns (bytes memory val);
}

contract OptimismAttestationAdapter {
    IAttestationStation public immutable station;
    address public immutable attester;
    bytes32 public immutable key;

    constructor(IAttestationStation _station, address _attester, bytes32 _key) {
        station = _station;
        attester = _attester;
        key = _key;
    }

    /// @notice 80 if attester has endorsed the wallet for `key`, else 0.
    ///         FanFeeHook tier thresholds: 28/64/82 -> 80 puts you in
    ///         Trusted tier (10 bps fee).
    function scoreOf(address wallet) external view returns (uint256) {
        bytes memory val = station.attestations(attester, wallet, key);
        return val.length > 0 ? 80 : 0;
    }

    function updatedAt(address) external pure returns (uint64) {
        return 0;
    }
}
