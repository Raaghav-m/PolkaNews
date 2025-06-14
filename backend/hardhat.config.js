require("@nomicfoundation/hardhat-toolbox");
require("@parity/hardhat-polkadot");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  resolc: {
    version: "1.5.2",
    compilerSource: "npm",
    settings: {
      optimizer: {
        enabled: true,
        parameters: "z",
        fallbackOz: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      polkavm: true,
      forking: {
        url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      },
      adapterConfig: {
        adapterBinaryPath: "./bin/eth-rpc",
        dev: true,
      },
    },
    polkadotHubTestnet: {
      polkavm: true,
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [process.env.PRIVATE_KEY],
    },
    assetHubWestend: {
      polkavm: true,

      url: "https://westend-asset-hub-rpc.polkadot.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1000,
      gasPrice: 1000000000, // 1 gwei
      gasMultiplier: 1.2,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache-pvm",
    artifacts: "./artifacts-pvm",
  },
};
