/**
 * Mezo Protocol network config and contract addresses.
 *
 * Mezo is a Bitcoin-backed stablecoin protocol (Liquity-style) with MUSD
 * as its native stablecoin. BTC is used as collateral via Troves.
 *
 * Docs: https://mezo.org/docs/developers
 */

export const MEZO_TESTNET = {
  chainId: 31611,
  chainIdHex: '0x7B8B',
  name: 'Mezo Testnet',
  rpc: 'https://rpc.test.mezo.org',
  explorer: 'https://explorer.test.mezo.org',
  currency: 'BTC',
  faucet: 'https://faucet.test.mezo.org',
} as const;

export const MEZO_MAINNET = {
  chainId: 31612,
  chainIdHex: '0x7B8C',
  name: 'Mezo Mainnet',
  rpc: 'https://rpc.mezo.org',
  explorer: 'https://explorer.mezo.org',
  currency: 'BTC',
} as const;

// Use testnet by default for hackathon demo
export const MEZO = MEZO_TESTNET;

// ─── Contract addresses ────────────────────────────────────────────────────

export const MEZO_CONTRACTS_TESTNET = {
  TroveManager:      '0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0',
  BorrowerOperations:'0xCdF7028ceAB81fA0C6971208e83fa7872994beE5',
  PriceFeed:         '0x86bCF0841622a5dAC14A313a15f96A95421b9366',
  HintHelpers:       '0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6',
  SortedTroves:      '0x722E4D24FD6Ff8b0AC679450F3D91294607268fA',
  MUSD:              '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
  // AMM pools (Uniswap-style) for yield display
  PoolMUSD_BTC:      '0x52e604c44417233b6CcEDDDc0d640A405Caacefb',
  PoolMUSD_mUSDC:    '0xEd812AEc0Fecc8fD882Ac3eccC43f3aA80A6c356',
  PoolMUSD_mUSDT:    '0x10906a9E9215939561597b4C8e4b98F93c02031A',
} as const;

export const MEZO_CONTRACTS_MAINNET = {
  TroveManager:      '0x94AfB503dBca74aC3E4929BACEeDfCe19B93c193',
  BorrowerOperations:'0x44b1bac67dDA612a41a58AAf779143B181dEe031',
  PriceFeed:         '0xc5aC5A8892230E0A3e1c473881A2de7353fFcA88',
  HintHelpers:       '0xD267b3bE2514375A075fd03C3D9CBa6b95317DC3',
  SortedTroves:      '0x8C5DB4C62BF29c1C4564390d10c20a47E0b2749f',
  MUSD:              '0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186',
  PoolMUSD_BTC:      '0x52e604c44417233b6CcEDDDc0d640A405Caacefb',
  PoolMUSD_mUSDC:    '0xEd812AEc0Fecc8fD882Ac3eccC43f3aA80A6c356',
  PoolMUSD_mUSDT:    '0x10906a9E9215939561597b4C8e4b98F93c02031A',
} as const;

export const MEZO_CONTRACTS = MEZO_CONTRACTS_TESTNET;

// ─── Minimal ABIs ─────────────────────────────────────────────────────────

/** TroveManager: read Trove state for a given borrower address */
export const TROVE_MANAGER_ABI = [
  // Returns the debt (MUSD) of a Trove, in 1e18 units
  'function getTroveDebt(address _borrower) view returns (uint256)',
  // Returns the collateral (BTC/tBTC) of a Trove, in 1e18 units
  'function getTroveColl(address _borrower) view returns (uint256)',
  // 0=nonExistent, 1=active, 2=closedByOwner, 3=closedByLiquidation, 4=closedByRedemption
  'function getTroveStatus(address _borrower) view returns (uint256)',
  // Current collateralization ratio (ICR) — caller must divide by 1e18
  'function getCurrentICR(address _borrower, uint256 _price) view returns (uint256)',
] as const;

/** PriceFeed: fetch the current BTC price in USD (1e18 precision) */
export const PRICE_FEED_ABI = [
  'function fetchPrice() view returns (uint256)',
] as const;

/** BorrowerOperations: open/close/adjust Troves — write functions for reference */
export const BORROWER_OPERATIONS_ABI = [
  'function openTrove(uint256 _maxFeePercentage, uint256 _MUSDAmount, address _upperHint, address _lowerHint) payable',
  'function closeTrove()',
  'function adjustTrove(uint256 _maxFeePercentage, uint256 _collWithdrawal, uint256 _MUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint) payable',
] as const;

// ─── Constants ────────────────────────────────────────────────────────────

export const MUSD_DECIMALS = 18;
export const TBTC_DECIMALS = 18;

/** Minimum MUSD borrow amount (Liquity-style). */
export const MIN_MUSD_BORROW = 1800;

/** Gas compensation reserved when opening a Trove (subtracted from MCR math). */
export const MUSD_GAS_COMPENSATION = 200;

/** Minimum collateralization ratio (110% = liquidation threshold). */
export const MIN_COLLATERAL_RATIO = 1.1;

/** Recommended safe collateralization ratio. */
export const SAFE_COLLATERAL_RATIO = 1.5;

/** Borrowing fee range (1% min, up to 5%). */
export const BORROW_FEE_MIN = 0.01;
export const BORROW_FEE_MAX = 0.05;

/** Trove status codes returned by getTroveStatus(). */
export const TROVE_STATUS = {
  0: 'nonExistent',
  1: 'active',
  2: 'closedByOwner',
  3: 'closedByLiquidation',
  4: 'closedByRedemption',
} as const;
