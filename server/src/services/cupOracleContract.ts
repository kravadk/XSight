import { Contract, formatEther, isAddress } from 'ethers';
import { env, isConfigured } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';
import { encodeMatchId } from '../utils/cupIds.js';
import { recordCupSettlementTx } from './cupSettlementLog.js';
import { getCupMatch } from './cupData.js';
import { getProvider, getSigner } from './wallet.js';

export type CupOracleOutcome = 'HOME' | 'DRAW' | 'AWAY';

export const CUP_ORACLE_ABI = [
  'function challengeWindow() view returns (uint64)',
  'function owner() view returns (address)',
  'function registerMatch(bytes32 matchId, bytes32 rulesHash, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri)',
  'function updateSourceEvidence(bytes32 matchId, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri)',
  'function proposeResult(bytes32 matchId, uint8 outcome, bytes32 evidenceHash, string evidenceUri, uint8 sourceCount)',
  'function challengeResult(bytes32 matchId, string reasonUri)',
  'function finalizeResult(bytes32 matchId)',
  'function emergencyFinalize(bytes32 matchId, uint8 outcome)',
  'function getMatch(bytes32 matchId) view returns (tuple(bytes32 matchId, bytes32 rulesHash, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri, uint8 sourceCount, uint8 proposedOutcome, uint8 finalOutcome, uint8 state, address proposer, address challenger, uint64 challengeEndsAt, uint64 updatedAt))',
  'event MatchRegistered(bytes32 indexed matchId, bytes32 rulesHash, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri)',
  'event ResultProposed(bytes32 indexed matchId, uint8 outcome, address indexed proposer, uint64 challengeEndsAt, bytes32 evidenceHash, string evidenceUri, uint8 sourceCount)',
  'event ResultChallenged(bytes32 indexed matchId, address indexed challenger, string reasonUri)',
  'event ResultFinalized(bytes32 indexed matchId, uint8 outcome)',
] as const;

/**
 * CupOracleV3 — the bonded optimistic oracle (HARDENING-PLAN Phase 2). `getMatch`
 * keeps the exact V2 tuple layout, so reads are version-agnostic; only the write path
 * differs: proposeResult takes an extra `sourceHash` and proposeResult/challengeResult
 * each require a bond, posted via an ERC20 approve to the oracle first.
 */
export const CUP_ORACLE_V3_ABI = [
  'function challengeWindow() view returns (uint64)',
  'function owner() view returns (address)',
  'function arbiter() view returns (address)',
  'function bondToken() view returns (address)',
  'function bondAmount() view returns (uint256)',
  'function protocolFeeBps() view returns (uint16)',
  'function safetyPeriod() view returns (uint64)',
  'function registerMatch(bytes32 matchId, bytes32 rulesHash, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri)',
  'function updateSourceEvidence(bytes32 matchId, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri)',
  'function proposeResult(bytes32 matchId, uint8 outcome, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri, uint8 sourceCount)',
  'function challengeResult(bytes32 matchId, string reasonUri)',
  'function finalizeResult(bytes32 matchId)',
  'function flag(bytes32 matchId)',
  'function resolveManually(bytes32 matchId, uint8 outcome)',
  'function getMatch(bytes32 matchId) view returns (tuple(bytes32 matchId, bytes32 rulesHash, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri, uint8 sourceCount, uint8 proposedOutcome, uint8 finalOutcome, uint8 state, address proposer, address challenger, uint64 challengeEndsAt, uint64 updatedAt))',
  'function getBond(bytes32 matchId) view returns (tuple(uint256 proposerBond, uint256 challengerBond, uint256 disputeId, uint64 manualResolveAt))',
  'event MatchRegistered(bytes32 indexed matchId, bytes32 rulesHash, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri)',
  'event ResultProposed(bytes32 indexed matchId, uint8 outcome, address indexed proposer, uint64 challengeEndsAt, bytes32 sourceHash, bytes32 evidenceHash, string evidenceUri, uint8 sourceCount, uint256 bond)',
  'event ResultChallenged(bytes32 indexed matchId, address indexed challenger, uint256 disputeId, uint256 bond, string reasonUri)',
  'event ChallengeResolved(bytes32 indexed matchId, uint8 ruling, address indexed winner, uint256 payout, uint256 protocolFee)',
  'event ResultFinalized(bytes32 indexed matchId, uint8 outcome)',
] as const;

const ERC20_APPROVE_ABI = ['function approve(address spender, uint256 amount) returns (bool)'] as const;

const MIN_DEPLOY_GAS_OKB = 0.005;

const OUTCOME_TO_CONTRACT: Record<CupOracleOutcome, number> = {
  HOME: 1,
  DRAW: 2,
  AWAY: 3,
};

/**
 * The active settlement oracle. CupOracleV3 (bonded) takes precedence once
 * CUP_ORACLE_V3_ADDRESS is set; until then the backend runs on CupOracleV2. `getMatch`
 * is identical across both versions, so every reader is version-agnostic.
 */
export function cupOracleMetadata() {
  const v3 = env.cupOracleV3Address.trim();
  const v2 = env.cupOracleV2Address.trim();
  const isV3 = isAddress(v3);
  const isV2 = isAddress(v2);
  const address = isV3 ? v3 : isV2 ? v2 : null;
  return {
    name: isV3 ? 'XSight CupOracleV3' : 'XSight CupOracleV2',
    status: address ? 'deployed' : 'contract-ready',
    address,
    legacyAddress: isAddress(env.cupOracleAddress) ? env.cupOracleAddress : null,
    v2Address: isV2 ? v2 : null,
    version: isV3 ? 'v3' : isV2 ? 'v2' : env.cupOracleAddress ? 'legacy-v1-reference-only' : 'v2-ready',
    bonded: isV3,
    arbiterAddress: isV3 && isAddress(env.cupArbiterAddress) ? env.cupArbiterAddress : null,
    chainId: X_LAYER.chainId,
    network: X_LAYER.name,
    explorerUrl: address ? `${X_LAYER.explorer}/address/${address}` : null,
    sourcePath: isV3 ? 'contracts/CupOracleV3.sol' : 'contracts/CupOracleV2.sol',
    challengeWindowSeconds: 3600,
    writeApiEnabled: env.cupWriteApiEnabled,
    abi: isV3 ? CUP_ORACLE_V3_ABI : CUP_ORACLE_ABI,
  };
}

export async function cupOracleReadiness() {
  const metadata = cupOracleMetadata();
  const checks: Array<{ id: string; label: string; ok: boolean; detail: string }> = [];

  checks.push({
    id: 'private-key',
    label: 'DEPLOYER_PRIVATE_KEY',
    ok: env.deployerPrivateKey.length > 0,
    detail: env.deployerPrivateKey.length > 0
      ? 'Private key is present locally. Do not commit or share it.'
      : 'Missing in server/.env. Use a fresh wallet key only.',
  });
  checks.push({
    id: 'agentic-wallet',
    label: 'AGENTIC_WALLET_ADDRESS',
    ok: env.agenticWalletAddress.length > 0,
    detail: env.agenticWalletAddress || 'Missing in server/.env',
  });

  let signerAddress: string | null = null;
  let signerMatches = false;
  let gasOkb = 0;
  let signerError: string | null = null;

  if (isConfigured.signer()) {
    try {
      const signer = getSigner();
      signerAddress = signer.address;
      signerMatches = signer.address.toLowerCase() === env.agenticWalletAddress.toLowerCase();
      const balance = await getProvider().getBalance(signer.address);
      gasOkb = Number(formatEther(balance));
    } catch (err) {
      signerError = err instanceof Error ? err.message : 'signer check failed';
    }
  }

  checks.push({
    id: 'signer-match',
    label: 'Signer matches agentic wallet',
    ok: signerMatches,
    detail: signerError ?? (signerAddress ? `${signerAddress} -> ${env.agenticWalletAddress}` : 'Waiting for key + wallet'),
  });
  checks.push({
    id: 'gas',
    label: 'OKB gas balance',
    ok: gasOkb >= MIN_DEPLOY_GAS_OKB,
    detail: signerAddress
      ? `${gasOkb.toFixed(6)} OKB on ${signerAddress}; recommended minimum ${MIN_DEPLOY_GAS_OKB} OKB for deploy`
      : 'Unknown until signer is configured',
  });
  checks.push({
    id: 'oracle-address',
    label: 'CUP_ORACLE_V2_ADDRESS',
    ok: metadata.status === 'deployed',
    detail: metadata.address ?? 'Not set yet. Deploy CupOracleV2, then paste address into server/.env.',
  });

  return {
    readyToDeploy: checks.find((c) => c.id === 'private-key')?.ok === true &&
      checks.find((c) => c.id === 'agentic-wallet')?.ok === true &&
      checks.find((c) => c.id === 'signer-match')?.ok === true &&
      checks.find((c) => c.id === 'gas')?.ok === true,
    readyToSeed: metadata.status === 'deployed' &&
      checks.find((c) => c.id === 'private-key')?.ok === true &&
      checks.find((c) => c.id === 'signer-match')?.ok === true,
    agenticWalletAddress: env.agenticWalletAddress || null,
    signerAddress,
    gasOkb,
    contract: metadata,
    checks,
    instructions: [
      'Create a fresh wallet for the hackathon demo.',
      'Fund it with a small amount of OKB on X Layer for gas.',
      'Set DEPLOYER_PRIVATE_KEY and AGENTIC_WALLET_ADDRESS in server/.env only.',
      'Run npm --prefix server run deploy:cup-oracle.',
      'Paste the printed address into CUP_ORACLE_V2_ADDRESS.',
      'Register only real source-backed matches; seeded legacy fixtures are not production evidence.',
    ],
  };
}

export async function readCupOracleMatch(matchId: string) {
  const metadata = cupOracleMetadata();
  if (!metadata.address) return null;
  try {
    const contract = new Contract(metadata.address, CUP_ORACLE_ABI, getProvider());
    const record = await contract.getMatch(encodeMatchId(matchId));
    return {
      matchId,
      registered: true,
      rulesHash: String(record.rulesHash),
      sourceHash: String(record.sourceHash),
      evidenceHash: String(record.evidenceHash),
      evidenceUri: String(record.evidenceUri),
      sourceCount: Number(record.sourceCount),
      proposedOutcome: Number(record.proposedOutcome),
      finalOutcome: Number(record.finalOutcome),
      state: Number(record.state),
      proposer: String(record.proposer),
      challenger: String(record.challenger),
      challengeEndsAt: Number(record.challengeEndsAt),
      updatedAt: Number(record.updatedAt),
    };
  } catch {
    return {
      matchId,
      registered: false,
    };
  }
}

export async function proposeCupOracleResult(matchId: string, outcome: CupOracleOutcome) {
  return writeCupOracleTx('proposeResult', matchId, outcome);
}

export async function challengeCupOracleResult(matchId: string) {
  return writeCupOracleTx('challengeResult', matchId);
}

export async function finalizeCupOracleResult(matchId: string) {
  return writeCupOracleTx('finalizeResult', matchId);
}

export async function emergencyFinalizeCupOracleResult(matchId: string, outcome: CupOracleOutcome) {
  return writeCupOracleTx('emergencyFinalize', matchId, outcome);
}

/// Registers a match on CupOracleV2 with the live CupHub evidence hashes. Required
/// before proposeResult — the contract reverts MatchNotFound otherwise. onlyOwner.
export async function registerCupOracleMatch(matchId: string) {
  return writeCupOracleTx('registerMatch', matchId);
}

let cachedChallengeWindow: number | null = null;

/// Reads the immutable challengeWindow() from the deployed oracle, cached for the
/// process. Falls back to the documented default if the oracle is not yet deployed.
export async function readCupChallengeWindow(): Promise<number> {
  if (cachedChallengeWindow !== null) return cachedChallengeWindow;
  const metadata = cupOracleMetadata();
  if (!metadata.address) return metadata.challengeWindowSeconds;
  try {
    const contract = new Contract(metadata.address, CUP_ORACLE_ABI, getProvider());
    cachedChallengeWindow = Number(await contract.challengeWindow());
  } catch {
    cachedChallengeWindow = metadata.challengeWindowSeconds;
  }
  return cachedChallengeWindow;
}

async function writeCupOracleTx(
  method: 'registerMatch' | 'proposeResult' | 'challengeResult' | 'finalizeResult' | 'emergencyFinalize',
  matchId: string,
  outcome?: CupOracleOutcome,
) {
  if (!env.cupWriteApiEnabled) {
    throw new Error('Cup write API is disabled. Set CUP_WRITE_API_ENABLED=true only for controlled operator usage.');
  }

  const metadata = cupOracleMetadata();
  if (!metadata.address) {
    throw new Error('No CupOracle is configured — set CUP_ORACLE_V2_ADDRESS or CUP_ORACLE_V3_ADDRESS');
  }
  const isV3 = metadata.version === 'v3';
  if (method === 'emergencyFinalize' && isV3) {
    throw new Error('emergencyFinalize was removed in CupOracleV3 — use flag() then resolveManually() after the safety timelock');
  }

  const signer = getSigner();
  const contract = new Contract(metadata.address, isV3 ? CUP_ORACLE_V3_ABI : CUP_ORACLE_ABI, signer);
  const encodedMatchId = encodeMatchId(matchId);

  const match = await getCupMatch(matchId);
  if (!match) throw new Error('match not found in live CupHub feed');

  if (method === 'proposeResult' && match.settlement.sourceQuorum.status !== 'settlement_ready') {
    throw new Error(`source quorum unavailable: ${match.settlement.sourceQuorum.reason}`);
  }

  // CupOracleV3: proposeResult / challengeResult each post a bond — approve the oracle
  // to pull `bondAmount` of the bond token before the bonded call.
  let bondTxHash: string | null = null;
  if (isV3 && (method === 'proposeResult' || method === 'challengeResult')) {
    const bondToken = String(await contract.bondToken());
    const bondAmount = (await contract.bondAmount()) as bigint;
    const erc20 = new Contract(bondToken, ERC20_APPROVE_ABI, signer);
    const approveTx = await erc20.approve(metadata.address, bondAmount);
    await approveTx.wait();
    bondTxHash = String(approveTx.hash);
  }

  const tx = method === 'registerMatch'
    ? await contract.registerMatch(
      encodedMatchId,
      match.settlement.rulesHash,
      match.settlement.sourceHash,
      match.settlement.evidenceHash,
      match.settlement.evidenceUri,
    )
    : method === 'proposeResult'
    ? isV3
      ? await contract.proposeResult(
        encodedMatchId,
        OUTCOME_TO_CONTRACT[outcome as CupOracleOutcome],
        match.settlement.sourceHash,
        match.settlement.evidenceHash,
        match.settlement.evidenceUri,
        match.settlement.sourceQuorum.agreeingSources,
      )
      : await contract.proposeResult(
        encodedMatchId,
        OUTCOME_TO_CONTRACT[outcome as CupOracleOutcome],
        match.settlement.evidenceHash,
        match.settlement.evidenceUri,
        match.settlement.sourceQuorum.agreeingSources,
      )
    : method === 'challengeResult'
      ? await contract.challengeResult(encodedMatchId, `urn:xsight:cup:challenge:${matchId}:${Date.now()}`)
      : method === 'emergencyFinalize'
        ? await contract.emergencyFinalize(encodedMatchId, OUTCOME_TO_CONTRACT[outcome as CupOracleOutcome])
        : await contract.finalizeResult(encodedMatchId);
  const receipt = await tx.wait();
  const txHash = String(receipt?.hash ?? tx.hash);
  const signerAddress = await signer.getAddress();

  recordCupSettlementTx({
    matchId,
    action: method,
    outcome: outcome ?? null,
    txHash,
    explorerUrl: `${X_LAYER.explorer}/tx/${txHash}`,
    signer: signerAddress,
  });

  return {
    ok: true,
    matchId,
    action: method,
    outcome: outcome ?? null,
    txHash,
    explorerUrl: `${X_LAYER.explorer}/tx/${txHash}`,
    bondTxHash,
  };
}
