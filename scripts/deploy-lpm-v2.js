const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

const { KSWAP_ADDRESS, TREASURY_VESTER_ADDRESS } = require("./mainnet-constants");
const { KLC_ETH, KLC_WBTC, KLC_LINK, KLC_KSWAP, KLC_USDT, KLC_SUSHI,
    KLC_DAI, KLC_AAVE, KLC_UNI, KLC_YFI, KSWAP_ETH, KSWAP_WBTC, KSWAP_LINK,
    KSWAP_USDT, KSWAP_SUSHI, KSWAP_DAI, KSWAP_AAVE, KSWAP_UNI, KSWAP_YFI } = require("./mainnet-pools");

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
    await lpManager.addWhitelistedPool(KLC_ETH, 100);
    console.log("Whitelisted KLC_ETH");

    await lpManager.addWhitelistedPool(KLC_WBTC, 100);
    console.log("Whitelisted KLC_WBTC");

    await lpManager.addWhitelistedPool(KLC_LINK, 100);
    console.log("Whitelisted KLC_LINK");

    await lpManager.addWhitelistedPool(KLC_USDT, 100);
    console.log("Whitelisted KLC_USDT");

    await lpManager.addWhitelistedPool(KLC_SUSHI,100);
    console.log("Whitelisted KLC_SUSH");

    await lpManager.addWhitelistedPool(KLC_DAI, 100);
    console.log("Whitelisted KLC_DAI");

    await lpManager.addWhitelistedPool(KLC_AAVE, 100);
    console.log("Whitelisted KLC_AAVE");

    await lpManager.addWhitelistedPool(KLC_UNI, 100);
    console.log("Whitelisted KLC_UNI");

    await lpManager.addWhitelistedPool(KLC_YFI, 100);
    console.log("Whitelisted KLC_YFI");

    await lpManager.addWhitelistedPool(KLC_KSWAP, 300);
    console.log("Whitelisted KLC_KSWAP");

    await lpManager.addWhitelistedPool(KSWAP_ETH, 300);
    console.log("Whitelisted KSWAP_ETH");

    await lpManager.addWhitelistedPool(KSWAP_WBTC, 300);
    console.log("Whitelisted KSWAP_WBTC");

    await lpManager.addWhitelistedPool(KSWAP_LINK,300);
    console.log("Whitelisted KSWAP_LIN");

    await lpManager.addWhitelistedPool(KSWAP_USDT, 300);
    console.log("Whitelisted KSWAP_USDT");

    await lpManager.addWhitelistedPool(KSWAP_SUSHI, 300);
    console.log("Whitelisted KSWAP_SUSHI");

    await lpManager.addWhitelistedPool(KSWAP_DAI, 300);
    console.log("Whitelisted KSWAP_DAI");

    await lpManager.addWhitelistedPool(KSWAP_AAVE, 300);
    console.log("Whitelisted KSWAP_AAVE");

    await lpManager.addWhitelistedPool(KSWAP_UNI, 300);
    console.log("Whitelisted KSWAP_UNI");

    await lpManager.addWhitelistedPool(KSWAP_YFI,300);
    console.log("Whitelisted KSWAP_YFI");

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
