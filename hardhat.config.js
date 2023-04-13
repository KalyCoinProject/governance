require("@nomiclabs/hardhat-waffle");
//require("@tenderly/hardhat-tenderly");
require("solidity-coverage");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.16"
      },
      {
        version: "0.6.4"
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      {
        version: "0.6.11"
      },
      {
        version: "0.6.12"
      },
      {
        version: "0.7.4"
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      {
        version: "0.8.1",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      }
    ],
    overrides: {
      "contracts/Airdrop.sol": {
        version: "0.8.0",
        settings: { }
      }
    }
  },
  networks: {
    kaly: {
      url: "https://testnetrpc.kalychain.io/rpc",
      accounts: ['Private_Key_Goes_Here'],
      gas: 3000000,
      gasPrice: 8000000000,
      
    }
  },
  etherscan: {
    apiKey: {
      kaly: "abc"
    },
    customChains: [
      {
        network: "kaly",
        chainId: 3889,
        allowUnlimitedContractSize: true,
        gas: 3000000,
        gasPrice: 8000000000,
        urls: {
          apiURL: "https://testnet.kalyscan.io/api",
          browserURL: "https://testnet.kalyscan.io"
        }
      }
    ]
  }
};
