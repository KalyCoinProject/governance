const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:",deployer.address);

    const initBalance = await deployer.getBalance();
    console.log("Account balance:", initBalance.toString());

    // Airdrop tokens
    const WKLC = ethers.utils.getAddress("0x069255299Bb729399f3CECaBdc73d15d3D10a2A3");

    // Timelock constants
    const DELAY = 14 * 24 * 60 * 60 // 14 days

    // Deploy KSWAP
    const KSWAP = await ethers.getContractFactory("Kswap");
    const kswap = await KSWAP.deploy(deployer.address);
    await kswap.deployed()

    // Deploy TreasuryVester
    const TreasuryVester = await ethers.getContractFactory("TreasuryVester");
    const treasury = await TreasuryVester.deploy(kswap.address);
    await treasury.deployed();

    // Deploy CommunityTreasury
    const Community = await ethers.getContractFactory('CommunityTreasury')
    const community = await Community.deploy(kswap.address);
    await community.deployed();

    // Deploy LiquidityPoolManager
    const LpManager = await ethers.getContractFactory("LiquidityPoolManager");
    const lpManager = await LpManager.deploy(WKLC, kswap.address,
        treasury.address);
    await lpManager.deployed();

    // Deploy Timelock
    const Timelock = await ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(deployer.address, DELAY);
    await timelock.deployed();

    // Deploy Governor
    const Governor = await ethers.getContractFactory("GovernorAlpha");
    const governor = await Governor.deploy(timelock.address, kswap.address, deployer.address);
    await governor.deployed();

    console.log("KSWAP address:              ", kswap.address);
    console.log("TreasuryVester address:   ", treasury.address);
    console.log("CommunityTreasury address:", community.address);
    console.log("Timelock address:         ", timelock.address);
    console.log("GovernorAlpha address:    ", governor.address);
    console.log("LpManager address:        ", lpManager.address);

    const endBalance = await deployer.getBalance();
    console.log("Deploy cost: ", initBalance.sub(endBalance).toString())
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
