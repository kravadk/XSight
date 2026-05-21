import { Wallet } from 'ethers';

const wallet = Wallet.createRandom();

console.log('Fresh XSight demo wallet');
console.log('');
console.log(`AGENTIC_WALLET_ADDRESS=${wallet.address}`);
console.log(`DEPLOYER_PRIVATE_KEY=${wallet.privateKey}`);
console.log('');
console.log('Put both values in server/.env only.');
console.log('Fund AGENTIC_WALLET_ADDRESS with OKB on X Layer before deploying CupOracle.');
console.log('Never commit server/.env or paste the private key into chat.');
