import { Contract, encodeBytes32String, formatEther, isAddress } from 'ethers';
import { env, isConfigured } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';
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

const MIN_DEPLOY_GAS_OKB = 0.005;

const OUTCOME_TO_CONTRACT: Record<CupOracleOutcome, number> = {
  HOME: 1,
  DRAW: 2,
  AWAY: 3,
};

export function cupOracleMetadata() {
  const configured = env.cupOracleV2Address.trim();
  const deployed = isAddress(configured);
  return {
    name: 'XSight CupOracleV2',
    status: deployed ? 'deployed' : 'contract-ready',
    address: deployed ? configured : null,
    legacyAddress: isAddress(env.cupOracleAddress) ? env.cupOracleAddress : null,
    version: deployed ? 'v2' : env.cupOracleAddress ? 'legacy-v1-reference-only' : 'v2-ready',
    chainId: X_LAYER.chainId,
    network: X_LAYER.name,
    explorerUrl: deployed ? `${X_LAYER.explorer}/address/${configured}` : null,
    sourcePath: 'contracts/CupOracleV2.sol',
    challengeWindowSeconds: 3600,
    writeApiEnabled: env.cupWriteApiEnabled,
    abi: CUP_ORACLE_ABI,
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
    const record = await contract.getMatch(encodeBytes32String(matchId));
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
    throw new Error('CUP_ORACLE_V2_ADDRESS is not configured');
  }

  const signer = getSigner();
  const contract = new Contract(metadata.address, CUP_ORACLE_ABI, signer);
  const encodedMatchId = encodeBytes32String(matchId);

  const match = await getCupMatch(matchId);
  if (!match) throw new Error('match not found in live CupHub feed');

  if (method === 'proposeResult' && match.settlement.sourceQuorum.status !== 'settlement_ready') {
    throw new Error(`source quorum unavailable: ${match.settlement.sourceQuorum.reason}`);
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
    ? await contract.proposeResult(
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
  };
}
