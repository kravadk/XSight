import { Contract, getAddress, isAddress } from 'ethers';
import { env } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';
import { hashJson } from './cupData.js';
import { getFanScore } from './cupReputation.js';
import { getProvider, getSigner } from './wallet.js';

export const FANPASS_SBT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function tokenOf(address wallet) view returns (uint256)',
  'function mintBadge(address wallet, bytes32 eligibilityHash, string uri) returns (uint256)',
  'event FanPassMinted(address indexed wallet, uint256 indexed tokenId, bytes32 eligibilityHash, string uri)',
] as const;

export function fanPassSbtMetadata() {
  const configured = env.fanPassSbtAddress.trim();
  const deployed = isAddress(configured);
  return {
    name: 'XSight FanPassSBT',
    status: deployed ? 'deployed' : 'contract-ready',
    address: deployed ? configured : null,
    chainId: X_LAYER.chainId,
    network: X_LAYER.name,
    explorerUrl: deployed ? `${X_LAYER.explorer}/address/${configured}` : null,
    sourcePath: 'contracts/FanPassSBT.sol',
    writeApiEnabled: env.cupWriteApiEnabled,
    abi: FANPASS_SBT_ABI,
  };
}

export async function getFanPassSbtEligibility(rawWallet: string) {
  let wallet: string;
  try {
    wallet = getAddress(rawWallet);
  } catch {
    return null;
  }

  const fanScore = await getFanScore(wallet);
  if (!fanScore) return null;
  const metadata = fanPassSbtMetadata();
  const eligible = fanScore.score >= 35;
  const eligibilityHash = hashJson({
    wallet,
    score: fanScore.score,
    level: fanScore.level,
    purpose: 'fanpass-sbt-campaign-gating',
    chainId: X_LAYER.chainId,
  });
  const uri = `urn:xsight:fanpass:${wallet.toLowerCase()}:${eligibilityHash.slice(2, 14)}`;
  const tokenId = await readSbtTokenId(wallet);
  return {
    wallet,
    eligible,
    minted: tokenId > 0,
    tokenId: tokenId > 0 ? tokenId : null,
    score: fanScore.score,
    level: fanScore.level,
    eligibilityHash,
    uri,
    reason: eligible
      ? 'FanPass score is high enough for a campaign-gating proof badge.'
      : 'FanPass score is below 35; keep NFT claims limited until real activity grows.',
    contract: metadata,
  };
}

export async function mintFanPassSbt(rawWallet: string) {
  const eligibility = await getFanPassSbtEligibility(rawWallet);
  if (!eligibility) throw new Error('invalid wallet');
  if (!eligibility.eligible) throw new Error(eligibility.reason);
  if (eligibility.minted) throw new Error('FanPass SBT already minted for this wallet');
  if (!eligibility.contract.address) throw new Error('FANPASS_SBT_ADDRESS is not configured');
  if (!env.cupWriteApiEnabled) throw new Error('Cup write API is disabled');

  const signer = getSigner();
  const contract = new Contract(eligibility.contract.address, FANPASS_SBT_ABI, signer);
  const tx = await contract.mintBadge(eligibility.wallet, eligibility.eligibilityHash, eligibility.uri);
  const receipt = await tx.wait();
  const txHash = String(receipt?.hash ?? tx.hash);
  const tokenId = await readSbtTokenId(eligibility.wallet);
  return {
    ok: true,
    wallet: eligibility.wallet,
    tokenId,
    eligibilityHash: eligibility.eligibilityHash,
    uri: eligibility.uri,
    txHash,
    explorerUrl: `${X_LAYER.explorer}/tx/${txHash}`,
    contract: eligibility.contract,
  };
}

async function readSbtTokenId(wallet: string): Promise<number> {
  const metadata = fanPassSbtMetadata();
  if (!metadata.address) return 0;
  try {
    const contract = new Contract(metadata.address, FANPASS_SBT_ABI, getProvider());
    return Number(await contract.tokenOf(wallet));
  } catch {
    return 0;
  }
}
