// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal read-only interface for the existing X Cup CupOracleV3.
///         Source: apps/xcup/contracts/CupOracleV3.sol (deployed on X Layer).
///         Used by a future CupSidePot autonomous settle path that reads match
///         outcomes directly from the oracle (Day-4 stretch — current settle
///         is operator-curated for the hackathon submission).
interface ICupOracleV3 {
    enum Outcome { Unknown, Home, Draw, Away }
    enum SettlementState { Open, Proposed, Challenged, Finalized }

    struct MatchRecord {
        bytes32 matchId;
        bytes32 rulesHash;
        bytes32 sourceHash;
        bytes32 evidenceHash;
        string evidenceUri;
        uint8 sourceCount;
        Outcome proposedOutcome;
        Outcome finalOutcome;
        SettlementState state;
        address proposer;
        address challenger;
        uint64 challengeEndsAt;
        uint64 updatedAt;
    }

    function getMatch(bytes32 matchId) external view returns (MatchRecord memory);
}
