require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

const RPC = process.env.X_LAYER_RPC_URL || "https://rpc.xlayer.tech";
const KEY = process.env.DEPLOYER_PRIVATE_KEY;
const FORK = process.env.FORK === "1";

/**
 * Hardhat config for the X Cup contract layer.
 * CommonJS (.cjs) because the repo root is an ESM project ("type":"module").
 * - sources live in apps/xcup/contracts/ (Parimutuel, CupOracleV3, ArbiterMultisig, FanPassSBT, BracketNFT)
 * - unit tests run on a clean in-memory chain (no network)
 * - the fork integration test enables mainnet forking only when FORK=1
 *
 * @type {import('hardhat/config').HardhatUserConfig}
 */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: "./apps/xcup/contracts",
    tests: "./apps/xcup/contracts/test",
    artifacts: "./apps/xcup/contracts/artifacts-hh",
    cache: "./apps/xcup/contracts/cache-hh",
  },
  networks: {
    // X Layer (chain 196) is not in Hardhat's built-in hardfork registry, so a fork
    // must be told which hardfork the chain runs — otherwise executing calls against
    // the forked block fails with "No known hardfork ... in chain with id 196".
    hardhat: FORK
      ? {
          forking: { url: RPC },
          chains: { 196: { hardforkHistory: { cancun: 0 } } },
        }
      : {},
    xlayer: { url: RPC, chainId: 196, accounts: KEY ? [KEY] : [] },
  },
};
