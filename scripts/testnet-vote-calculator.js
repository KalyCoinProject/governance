const { ethers } = require('hardhat');

const { KSWAP_ADDRESS, MINICHEF_V2_ADDRESS } = require("./testnet-constants");

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const initBalance = await deployer.getBalance();
    console.log("Account balance:", initBalance.toString());

    const kswap = ethers.utils.getAddress(KSWAP_ADDRESS);
    const miniChefV2 = ethers.utils.getAddress(MINICHEF_V2_ADDRESS);

    // Deploy KalyswapVoteCalculator
    const KalyswapVoteCalculator = await ethers.getContractFactory("KalyswapVoteCalculator");
    const kalyswapVoteCalculator = await KalyswapVoteCalculator.deploy(
      kswap,
      miniChefV2,
    );
    await kalyswapVoteCalculator.deployed();

    console.log("KalyswapVoteCalculator address: ", kalyswapVoteCalculator.address);

    const endBalance = await deployer.getBalance();
    console.log("Deploy cost: ", initBalance.sub(endBalance).toString());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
