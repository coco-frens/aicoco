const env = require('node-env-file')
env(__dirname + '/.env')

require("@nomicfoundation/hardhat-toolbox");
// require("@nomiclabs/hardhat-etherscan")
// require("@nomicfoundation/hardhat-verify")

const lastBlock = 15139242

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.21",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ]
  },
  networks: {
    hardhat: {
      accounts: { mnemonic: process.env.MNEMONIC },
      forking: {
        url: 'http://192.168.1.104:8545',
        blockNumber: lastBlock
      }
    },
    mainnet: {
      url: 'http://192.168.1.104:8545',
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    sepolia: {
      url: process.env.SEPOLIA_URL,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
