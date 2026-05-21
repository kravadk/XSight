/**
 * BracketNFT contract service — metadata, an on-chain `mintedBy` read, and an unsigned
 * `mint()` calldata builder for the user's wallet. Mirrors `parimutuelContract.ts`.
 *
 * Until BRACKET_NFT_ADDRESS is set, `metadata.address` is null and the API surfaces an
 * honest not-deployed state — there is no fake NFT.
 */
import { Contract, Interface, isAddress } from 'ethers';
import { env } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';
import { getProvider } from './wallet.js';

export const BRACKET_NFT_ABI = [
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function mintedBy(address account) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function mint() returns (uint256)',
] as const;

const iface = new Interface(BRACKET_NFT_ABI as unknown as string[]);

export interface UnsignedTx {
  to: string;
  data: string;
  value: string;
  chainId: number;
}

export function bracketNftMetadata() {
  const configured = env.bracketNftAddress.trim();
  const deployed = isAddress(configured);
  return {
    name: 'XSight BracketNFT',
    status: deployed ? 'deployed' : 'contract-ready',
    address: deployed ? configured : null,
    chainId: X_LAYER.chainId,
    network: X_LAYER.name,
    explorerUrl: deployed ? `${X_LAYER.explorer}/address/${configured}` : null,
    sourcePath: 'contracts/BracketNFT.sol',
  };
}

/** The tokenId a wallet has minted (0 = none / contract not deployed / read failed). */
export async function readMintedBy(wallet: string): Promise<number> {
  const meta = bracketNftMetadata();
  if (!meta.address || !isAddress(wallet)) return 0;
  try {
    const contract = new Contract(meta.address, BRACKET_NFT_ABI, getProvider());
    return Number(await contract.mintedBy(wallet));
  } catch {
    return 0;
  }
}

/** Unsigned `mint()` transaction the user's wallet signs. Throws if not deployed. */
export function buildBracketMintTx(): UnsignedTx {
  const meta = bracketNftMetadata();
  if (!meta.address) throw new Error('contract_not_deployed');
  return {
    to: meta.address,
    data: iface.encodeFunctionData('mint', []),
    value: '0x0',
    chainId: X_LAYER.chainId,
  };
}
