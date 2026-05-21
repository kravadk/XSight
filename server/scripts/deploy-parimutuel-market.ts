import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { JsonRpcProvider, Wallet, ContractFactory, isAddress } from 'ethers';
import 'dotenv/config';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const CONTRACT_PATH = path.join(ROOT, 'contracts', 'ParimutuelMarket.sol');
const OUT_DIR = path.join(ROOT, 'contracts', 'artifacts');

const rpcUrl = process.env.X_LAYER_RPC_URL ?? 'https://rpc.xlayer.tech';
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
const usdc = process.env.USDC_ADDRESS ?? '';
const oracle = process.env.CUP_ORACLE_V2_ADDRESS ?? '';
const operator = process.env.AGENTIC_WALLET_ADDRESS ?? '';
const treasury = process.env.PARIMUTUEL_TREASURY || operator;
const feeBps = Number(process.env.PARIMUTUEL_FEE_BPS ?? 0);

if (!privateKey) throw new Error('DEPLOYER_PRIVATE_KEY is required');
if (!isAddress(usdc)) throw new Error('USDC_ADDRESS must be a valid address');
if (!isAddress(oracle)) throw new Error('CUP_ORACLE_V2_ADDRESS must be a valid address');
if (!isAddress(operator)) throw new Error('AGENTIC_WALLET_ADDRESS (operator) must be a valid address');
if (!isAddress(treasury)) throw new Error('PARIMUTUEL_TREASURY must be a valid address');
if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) {
  throw new Error('PARIMUTUEL_FEE_BPS must be an integer 0..1000');
}

const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'ParimutuelMarket.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input))) as {
  errors?: Array<{ severity: 'error' | 'warning'; formattedMessage: string }>;
  contracts: Record<string, Record<string, { abi: unknown[]; evm: { bytecode: { object: string } } }>>;
};

for (const err of output.errors ?? []) {
  (err.severity === 'error' ? process.stderr : process.stdout).write(`${err.formattedMessage}\n`);
}
if ((output.errors ?? []).some((e) => e.severity === 'error')) {
  throw new Error('Solidity compilation failed');
}

const compiled = output.contracts['ParimutuelMarket.sol']?.ParimutuelMarket;
if (!compiled) throw new Error('ParimutuelMarket artifact not found in solc output');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'ParimutuelMarket.json'),
  JSON.stringify({ abi: compiled.abi, bytecode: compiled.evm.bytecode.object }, null, 2),
);

const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(privateKey, provider);
const net = await provider.getNetwork();

console.log(`[parimutuel] deploying from ${wallet.address}`);
console.log(`[parimutuel] rpc=${rpcUrl} chainId=${net.chainId}`);
console.log(`[parimutuel] args usdc=${usdc} oracle=${oracle} operator=${operator} treasury=${treasury} feeBps=${feeBps}`);

const factory = new ContractFactory(compiled.abi, compiled.evm.bytecode.object, wallet);
const contract = await factory.deploy(usdc, oracle, operator, treasury, feeBps);
console.log(`[parimutuel] tx=${contract.deploymentTransaction()?.hash ?? 'pending'}`);
await contract.waitForDeployment();
const address = await contract.getAddress();

console.log(`[parimutuel] deployed=${address}`);
console.log(`[parimutuel] set PARIMUTUEL_MARKET_ADDRESS=${address}`);
