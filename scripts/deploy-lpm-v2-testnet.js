const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

const { KSWAP_ADDRESS, TREASURY_VESTER_ADDRESS } = require("./testnet-constants");
const { KLC_KSWAP, KLC_SUSHI, KLC_UNI, KSWAP_SUSHI, KSWAP_UNI } = require("./testnet-pools");

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:",deployer.address);

    const initBalance = await deployer.getBalance();
    console.log("Account balance:", initBalance.toString());

    const WKLC = ethers.utils.getAddress("0x069255299Bb729399f3CECaBdc73d15d3D10a2A3");

    // Deploy LiquidityPoolManagerV2
    const LpManager = await ethers.getContractFactory("LiquidityPoolManagerV2");
    const lpManager = await LpManager.deploy(WKLC, KSWAP_ADDRESS,
        TREASURY_VESTER_ADDRESS);
    await lpManager.deployed();

    console.log("LpManagerV2 address: ", lpManager.address);

    // whitelist pools
    await lpManager.addWhitelistedPool(KLC_SUSHI,100);
    console.log("Whitelisted KLC_SUSH");

    await lpManager.addWhitelistedPool(KLC_UNI, 100);
    console.log("Whitelisted KLC_UNI");

    await lpManager.addWhitelistedPool(KLC_KSWAP, 300);
    console.log("Whitelisted KLC_KSWAP");

    await lpManager.addWhitelistedPool(KSWAP_SUSHI, 300);
    console.log("Whitelisted KSWAP_SUSHI");

    await lpManager.addWhitelistedPool(KSWAP_UNI, 300);
    console.log("Whitelisted KSWAP_UNI");

    await lpManager.setKlcKswapPair(KLC_KSWAP);
    console.log("KLC/KSWAP set")

    const endBalance = await deployer.getBalance();
    console.log("Deploy cost: ", initBalance.sub(endBalance).toString())
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
