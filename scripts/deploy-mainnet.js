const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:",deployer.address);

    const initBalance = await deployer.getBalance();
    console.log("Account balance:", initBalance.toString());

    // Airdrop tokens
    const UNI = ethers.utils.getAddress("0xf39f9671906d8630812f9d9863bBEf5D523c84Ab");
    const SUSHI = ethers.utils.getAddress("0x39cf1BD5f15fb22eC3D9Ff86b0727aFc203427cc");
    const WKLC = ethers.utils.getAddress("0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7");

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

    // Deploy Airdrop
    const Airdrop = await ethers.getContractFactory("Airdrop");
    const airdrop = await Airdrop.deploy(kswap.address, UNI, SUSHI, deployer.address, community.address);
    await airdrop.deployed();

    // Deploy Timelock
    const Timelock = await ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(deployer.address, DELAY);
    await timelock.deployed();

    // Deploy Governor
    const Governor = await ethers.getContractFactory("GovernorAlpha");
    const governor = await Governor.deploy(timelock.address, kswap.address, deployer.address);
    await governor.deployed();

    console.log("KSWAP address:              ", kswap.address);
    console.log("TreasuryVester address:   ", treasury.address)
    console.log("CommunityTreasury address:", community.address)
    console.log("Airdrop address:          ", airdrop.address);
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
