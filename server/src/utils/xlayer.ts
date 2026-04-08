export const X_LAYER = {
  chainId: 196,
  chainIdHex: '0xC4',
  name: 'X Layer Mainnet',
  rpc: 'https://rpc.xlayer.tech',
  rpcAlt: 'https://xlayerrpc.okx.com',
  explorer: 'https://www.okx.com/web3/explorer/xlayer',
  gasToken: 'OKB',
  zeroGasAssets: ['USDT', 'USDG'] as const,
} as const;

export const X_LAYER_TESTNET = {
  chainId: 1952,
  chainIdHex: '0x7A0',
  name: 'X Layer Testnet',
  rpc: 'https://testrpc.xlayer.tech/terigon',
  faucet: 'https://web3.okx.com/xlayer/faucet',
} as const;
