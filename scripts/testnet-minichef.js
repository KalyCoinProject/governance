const { ethers, network } = require('hardhat');

const {
    KSWAP_ADDRESS,
    TREASURY_VESTER_ADDRESS,
    COMMUNITY_TREASURY_ADDRESS,
    TIMELOCK_ADDRESS,
    GOVERNOR_ADDRESS,
    KALYSWAP_MULTISIG,
} = require("./testnet-constants");
const { BigNumber } = require('ethers');



const TWO_MILLION_KSWAP = BigNumber.from('2000000' + '0'.repeat(18));

const poolConfig = [
    [3000, '0xda3F0695B56Aa23534A9b5299D336D0A2a1579BD'], // WKLC-KSWAP
    [2000, '0xcD3cf1fF75EE9bccD69DfDA834A75ec2394AC00f'], // WKLC-SUSHI
    [1000, '0x1DE86fbEe65296A1222E39C0c5b25C80e4Dbd4E3'], // WKLC-UNI
    [500, '0x2068F2438700c9e63B0C493727B2a1cA556aFC1E'], // KSWAP-SUSHI
    [300, '0xE46FcF8CE00EF96B69A029FbAB8dc09671F821a7'], // KSWAP-UNI
];


async function main() {

    const [deployer, user1] = await ethers.getSigners();

    const KSWAP = await ethers.getContractFactory("Kswap");
    const kswap = await KSWAP.attach(KSWAP_ADDRESS);

    // Large KSWAP holder
    const acc = '0xaE51f2EfE70e57b994BE8F7f97C4dC824c51802a';


    // Self delegate
    await kswap.connect(acc);

    console.log("Deploying contracts with the account:", deployer.address);

    const GovernorAlpha = await ethers.getContractFactory("GovernorAlpha");
    const governorAlpha = await GovernorAlpha.attach(GOVERNOR_ADDRESS);

    const CommunityTreasury = await ethers.getContractFactory("CommunityTreasury");
    const communityTreasury = await CommunityTreasury.attach(COMMUNITY_TREASURY_ADDRESS);

    const TreasuryVester = await ethers.getContractFactory("TreasuryVester");
    const treasuryVester = await TreasuryVester.attach(TREASURY_VESTER_ADDRESS);

    // Deploy MiniChefV2
    const MiniChef = await ethers.getContractFactory("MiniChefV2");
    const miniChef = await MiniChef.deploy(
        kswap.address,
        deployer.address,
    );
    await miniChef.deployed();
    console.log("Deployed MiniChefV2:", miniChef.address);

    // Deploy TreasuryVesterProxy
    const TreasuryVesterProxy = await ethers.getContractFactory(`TreasuryVesterProxy`);
    const treasuryVesterProxy = await TreasuryVesterProxy.deploy(
        kswap.address,
        treasuryVester.address,
        communityTreasury.address,
        miniChef.address
    );
    await treasuryVesterProxy.deployed();
    console.log(`Deployed TreasuryVesterProxy:`, treasuryVesterProxy.address);
    console.log();

    // Add funder
    console.log(`Adding funders`);
    await miniChef.addFunder(treasuryVesterProxy.address);
    console.log(`Done`);

    // Set owners to timelock
    console.log(`Setting owners`);
    await miniChef.transferOwnership(TIMELOCK_ADDRESS);
    await treasuryVesterProxy.transferOwnership(TIMELOCK_ADDRESS);
    console.log(`Done`);

    // Governance proposal
    const targets = [
        communityTreasury.address, // transfer
        kswap.address, // approve
        treasuryVester.address, // setRecipient
        treasuryVesterProxy.address, // init
        miniChef.address, // fundRewards
        miniChef.address, // create pools
        miniChef.address, // transferOwnership
    ];
    const values = [0, 0, 0, 0, 0, 0, 0];
    const sigs = [
        'transfer(address,uint256)',
        'approve(address,uint256)',
        'setRecipient(address)',
        'init()',
        'fundRewards(uint256,uint256)',
        'addPools(uint256[],address[],address[])',
        'transferOwnership(address)'
    ];
    const callDatas = [
        ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [TIMELOCK_ADDRESS, TWO_MILLION_KSWAP]),
        ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [miniChef.address, TWO_MILLION_KSWAP]),
        ethers.utils.defaultAbiCoder.encode(['address'], [treasuryVesterProxy.address]),
        0, // empty bytes
        ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256'], [TWO_MILLION_KSWAP, 30 * 86400]),
        ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]', 'address[]'], [
            poolConfig.map(entry => entry[0]),
            poolConfig.map(entry => entry[1]),
            poolConfig.map(entry => ethers.constants.AddressZero)
        ]),
        ethers.utils.defaultAbiCoder.encode(['address'], [KALYSWAP_MULTISIG])
    ];

    const description =
`# Kalyswap Tokenomics
TLDR: Implement Kalyswap tokenomics change with improved farming system

## What is the goal?
Kalyswap is moving to a significantly improved tokenomics system allowing the protocol to best compete with other DEXes and strategically allocate rewards to liquidity providers! 

## What is changing?
The system powering farming rewards will require one final migration and will receive boosted rewards for the first 30 days to compensate farmers for the transition. 

This will shorten the total token emission period because emitting KSWAP over 28 years is too long of a timeframe for DeFi. The diluted market cap of Kalyswap will change from 530m KSWAP to 230m KSWAP over the course of approximately 3 years from now. 

This will also grow the treasury from 13m KSWAP to 30m KSWAP over the course of 29 months, enabling Kalyswap to further innovate and continue to add new features and improve the user experience.
 
The farming pools will be focused to 37 farms at launch and can still be amended by the community via the Kalyswap multisig.

## How does this impact users?
Users will benefit from increased rewards and more competitive farms. 

Users will need to take a single action and migrate their funds from the current farm into the new farm (note: this will need to be done for each pool a user is in).

## Technical Proposal
We will deploy MiniChefV2 which will manage the farming rewards. 

We will implement TreasuryVesterProxy around the TreasuryVester that will divert funds over the course of 960 days to farming rewards, the treasury, and burning excess KSWAP. 

We will transfer 2M KSWAP from CommunityTreasury to MiniChefV2 boosting the first 30 days of the new rewards system. 

We will add farming pools with their respective weights.`;

    console.log(`Submitting proposal`);
    await governorAlpha.connect(acc).propose(targets, values, sigs, callDatas, description);
    const proposalNumber = await governorAlpha.proposalCount();
    console.log(`Made proposal #${proposalNumber}`);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    console.log(`Voting yes on proposal #${proposalNumber}`);
    await governorAlpha.connect(acc).castVote(proposalNumber, true);
    console.log('Done');

    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine");

    console.log(`Queuing proposal #${proposalNumber}`);
    await governorAlpha.queue(proposalNumber);
    console.log('Done');

    await ethers.provider.send("evm_increaseTime", [86400 * 2]);
    await ethers.provider.send("evm_mine");

    console.log(`Executing proposal #${proposalNumber}`);
    await governorAlpha.execute(
        proposalNumber,
        {
            gasLimit: 7000000
        }
    );
    console.log('Done');
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
