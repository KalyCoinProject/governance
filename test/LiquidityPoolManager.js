// test/LiquidityPoolManager.js
// Load dependencies
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');
const Web3 = require('web3');

const OWNER_ADDRESS = ethers.utils.getAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
const TREASURY_VESTER = ethers.utils.getAddress("0xd187C6C8C6aeE0F021F92cB02887A21D529e26cb");

const balanceOf = Web3.utils.sha3('balanceOf(address)').slice(0,10);
const totalSupply = Web3.utils.sha3('totalSupply()').slice(0,10);
const token0 = Web3.utils.sha3('token0()').slice(0,10);
const token1 = Web3.utils.sha3('token1()').slice(0,10);
const claimMethod = Web3.utils.sha3('claim()').slice(0,10);
const getReserves = Web3.utils.sha3('getReserves()').slice(0,10);
const getKswapLiquidity = Web3.utils.sha3('getKswapLiquidity(address)').slice(0,10);

let web3 = new Web3('http://localhost:9560');

const oneToken = BigNumber.from("1000000000000000000");

const TOTAL_AMOUNT = ethers.BigNumber.from("512000000000000000000000000");
const STARTING_AMOUNT = BigNumber.from('175342465000000000000000');
const HALVING = 1460;
const INTERVAL = 86400;

// Start test block
describe('LiquidityPoolManager', function () {
    before(async function () {
        this.KSWAP = await ethers.getContractFactory("Kswap");
        this.LpManager = await ethers.getContractFactory("LiquidityPoolManagerV2");
        this.LpManager2 = await ethers.getContractFactory("LiquidityPoolManagerV2");

        this.MockPairKlc = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
        this.MockPairKswap = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
        this.MockPairKlcKswap = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
        this.MockWklc = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
        this.MockTreasuryVester = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");

        [ , this.altAddr, this.addr3] = await ethers.getSigners();

        // ABIs for mocks
        this.WKLC = await ethers.getContractFactory("WKLC");
        this.wklc = await this.WKLC.deploy();
        await this.wklc.deployed();

        this.AltCoin = await ethers.getContractFactory("WKLC");
        this.altCoin = await this.AltCoin.deploy();
        await this.altCoin.deployed();

        this.altCoin2 = await this.AltCoin.deploy();
        await this.altCoin2.deployed();

        this.TreasuryVester = await ethers.getContractFactory("TreasuryVester");
    });

    beforeEach(async function () {
        this.mockPairKlc = await this.MockPairKlc.deploy();
        await this.mockPairKlc.deployed();

        this.mockPairKlc2 = await this.MockPairKlc.deploy();
        await this.mockPairKlc2.deployed();

        this.mockPairKswap = await this.MockPairKswap.deploy();
        await this.mockPairKswap.deployed();

        this.mockPairKlcKswap = await this.MockPairKlcKswap.deploy();
        await this.mockPairKlcKswap.deployed();

        this.mockWklc = await this.MockWklc.deploy();
        await this.mockWklc.deployed();

        this.mockTreasuryVester = await this.MockTreasuryVester.deploy();
        await this.mockTreasuryVester.deployed();

        this.kswap = await this.KSWAP.deploy(OWNER_ADDRESS);
        await this.kswap.deployed();

        this.lpManager = await this.LpManager.deploy(this.mockWklc.address, this.kswap.address,
                                                     this.mockTreasuryVester.address);
        await this.lpManager.deployed();

        this.treasury = await this.TreasuryVester.deploy(this.kswap.address);
        await this.treasury.deployed();

        this.lpManagerTreasury = await this.LpManager2.deploy(this.mockWklc.address, this.kswap.address,
            this.treasury.address);
        await this.lpManagerTreasury.deployed()

        this.altContract = await this.lpManager.connect(this.altAddr);
        this.alt3Contract = await this.lpManager.connect(this.addr3);
    });

    // Test cases

    //////////////////////////////
    //       Constructor
    //////////////////////////////
    describe("Constructor", function () {
        it('Wklc default', async function () {
            expect((await this.lpManager.wklc())).to.equal(this.mockWklc.address);
        });
        it('KSWAP default', async function () {
            expect((await this.lpManager.kswap())).to.equal(this.kswap.address);
        });
        it('Treasury Vester default', async function () {
            expect((await this.lpManager.treasuryVester())).to.equal(this.mockTreasuryVester.address);
        });
    });

    //////////////////////////////
    //       isWhitelisted
    //////////////////////////////

    // covered by other tests

    //////////////////////////////
    //       isKlcPair
    //////////////////////////////

    //covered by other tests

    //////////////////////////////
    //       isKswapPair
    //////////////////////////////

    // covered by other tests

    //////////////////////////////
    //       setowner
    //////////////////////////////
    describe("setowner", function () {
        it('Transfer owner successfully', async function () {
            expect((await this.lpManager.owner())).to.not.equal(this.altAddr.address);
            await this.lpManager.transferOwnership(this.altAddr.address);
            expect((await this.lpManager.owner())).to.equal(this.altAddr.address);
        });

        it('Transfer owner unsuccessfully', async function () {
            await expect(this.altContract.transferOwnership(this.altAddr.address)).to.be.revertedWith(
                "Ownable: caller is not the owner");
        });

        it('Renounce owner successfully', async function () {
            expect((await this.lpManager.owner())).to.not.equal(ethers.constants.AddressZero);
            await this.lpManager.renounceOwnership();
            expect((await this.lpManager.owner())).to.equal(ethers.constants.AddressZero);
        });

        it('Renounce owner unsuccessfully', async function () {
            await expect(this.altContract.renounceOwnership()).to.be.revertedWith(
                "Ownable: caller is not the owner");
        });
    });

    //////////////////////////////
    //      setKlcKswapPair
    //////////////////////////////
    describe("setKlcKswapPair", function () {
        it('Set pool successfully', async function () {
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);
            expect(await this.lpManager.klcKswapPair()).to.equal(this.mockPairKlcKswap.address);
        });

        it('Set pool to zero address', async function () {
            // Set address normally
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);
            expect(await this.lpManager.klcKswapPair()).to.equal(this.mockPairKlcKswap.address);

            // Try setting to zero address
            await expect(this.lpManager.setKlcKswapPair(ethers.constants.AddressZero)).to.be.revertedWith(
                'LiquidityPoolManager::setKlcKswapPair: Pool cannot be the zero address');
        });

        it('Set pool unauthorized', async function () {
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);
            await expect(this.altContract.setKlcKswapPair(this.mockPairKlcKswap.address)).to.be.revertedWith('Ownable: caller is not the owner');
        });
    });

    //////////////////////////////
    //    addWhitelistedPool
    //////////////////////////////
    describe("addWhitelistedPool", function () {
        it('Add KLC pool, token0 == WKLC', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
        });

        it('Increases numPools', async function () {
            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.numPools()).to.equal(1);
        });

        it('Add KLC pool, token1 == WKLC', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
        });

        it('Add KSWAP pool, token0 == KSWAP', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.true;
        });

        it('Add KSWAP pool, token1 == KSWAP', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.true;
        });

        it('Add pool unauthorized', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await expect(this.altContract.addWhitelistedPool(this.mockPairKlc.address, 1)).to.be.revertedWith(
                'Ownable: caller is not the owner');
        });

        it('Add pool no klc or kswap', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            // just use a random address for the second coin
            await this.mockPairKswap.givenMethodReturnAddress(token1, OWNER_ADDRESS);
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);

            // Whitelist pool
            await expect(this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1)).to.be.revertedWith(
                "LiquidityPoolManager::addWhitelistedPool: No KLC or KSWAP in the pair");

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.false;
        });

        it('Pool already added', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.true;

            // Try adding again
            await expect(this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1)).to.be.revertedWith(
                'LiquidityPoolManager::addWhitelistedPool: Pool already whitelisted');
        });

        it('Pool is zero address', async function () {
            // Try adding again
            await expect(this.lpManager.addWhitelistedPool(ethers.constants.AddressZero, 1)).to.be.revertedWith(
                'LiquidityPoolManager::addWhitelistedPool: Pool cannot be the zero address');
        });

        it('Corrupt Distribution', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();

            // Attempt to add a second pool
            await expect(this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1)).to.be.revertedWith(
                'LiquidityPoolManager::addWhitelistedPool: Cannot add pool between calculating and distributing returns'
            );
        });

        it('Add pool, identical tokens', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.false;

            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);

            // Whitelist pool
            await expect(this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1)).to.be.revertedWith(
                "LiquidityPoolManager::addWhitelistedPool: Tokens cannot be identical"
            );
        });

        it('Set weight properly', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 5);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.weights(this.mockPairKlc.address)).to.equal(5);
        });

        it('Set weight at 0', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await expect(this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 0)).to.be.revertedWith(
                'LiquidityPoolManager::addWhitelistedPool: Weight cannot be zero'
            );
        });

        it('KLC-KSWAP Pool is a KSWAP Pool', async function () {
            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKlcKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlcKswap.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);

            // Setup mocks
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.kswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlcKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlcKswap.address)).to.be.true;
        });
    });

    //////////////////////////////
    //   removeWhitelistedPool
    //////////////////////////////
    describe("removeWhitelistedPool", function () {
        it('Remove KLC pool', async function () {
            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlc.address);

            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
        });

        it('Decrement numPools', async function () {
            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            expect(await this.lpManager.numPools()).to.equal(1);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlc.address);

            // Check numPools decremented
            expect(await this.lpManager.numPools()).to.equal(0);
        });

        it('Remove KSWAP pool', async function () {
            // Setup mocks
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.true;

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKswap.address);

            // Check pools are empty
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.false;
        });

        it('Pool not listed', async function () {
            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Remove pool
            await expect(this.lpManager.removeWhitelistedPool(this.mockPairKlc.address)).to.be.revertedWith(
                'LiquidityPoolManager::removeWhitelistedPool: Pool not whitelisted'
            );
        });

        it('Remove pool unauthorized', async function () {
            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;

            // Remove pool
            await expect(this.altContract.removeWhitelistedPool(this.mockPairKlc.address)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('Remove first Klc pool with multiple choices', async function () {
            // Setup mocks, all with be KLC pairs, despite names
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.altCoin2.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlcKswap.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlc.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove second Klc pool with multiple choices', async function () {
            // Setup mocks, all with be KLC pairs, despite names
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.altCoin2.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlcKswap.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKswap.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove third Klc pool with multiple choices', async function () {
            // Setup mocks, all with be KLC pairs, despite names
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.altCoin2.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlcKswap.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlcKswap.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.false;
            expect(await this.lpManager.isKlcPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKlcPair(this.mockPairKlcKswap.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove first KSWAP pool with multiple choices', async function () {
            // Setup mocks, all with be KLC pairs, despite names
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, OWNER_ADDRESS);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlcKswap.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlc.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove second KSWAP pool with multiple choices', async function () {
            // Setup mocks, all with be KLC pairs, despite names
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, OWNER_ADDRESS);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlcKswap.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKswap.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Remove third KSWAP pool with multiple choices', async function () {
            // Setup mocks, all with be KLC pairs, despite names
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token0, TREASURY_VESTER);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, OWNER_ADDRESS);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            // Whitelist pools
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);

            // Check pools added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlcKswap.address)).to.be.true;

            // Remove first pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlcKswap.address);

            // Check pools are filled properly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.false;
            expect(await this.lpManager.isKswapPair(this.mockPairKlc.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKswap.address)).to.be.true;
            expect(await this.lpManager.isKswapPair(this.mockPairKlcKswap.address)).to.be.false;
            expect(await this.lpManager.klcKswapPair()).to.equal(ethers.constants.AddressZero);
        });

        it('Corrupt Distribution', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);;

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();

            // Attempt to add a second pool
            await expect(this.lpManager.removeWhitelistedPool(this.mockPairKlc.address)).to.be.revertedWith(
                'LiquidityPoolManager::removeWhitelistedPool: Cannot remove pool between calculating and distributing returns'
            );
        });

        it('Weight set to zero', async function () {
            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 5);

            // Check pool added correctly
            expect(await this.lpManager.weights(this.mockPairKlc.address)).to.equal(5);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlc.address);

            // Check pools are empty
            expect(await this.lpManager.weights(this.mockPairKlc.address)).to.equal(0);
        });

        it('Remove KLC/KSWAP Pool', async function () {
            // Setup mocks
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 5);

            // Check pool added correctly
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.true;

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlcKswap.address);

            // Check pool removed
            expect(await this.lpManager.isWhitelisted(this.mockPairKlcKswap.address)).to.be.false;
        });
    });

    //////////////////////////////
    //     changeWeight
    //////////////////////////////
    describe("changeWeight", function () {
        it('Change successfully', async function () {
            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check weight set correctly
            expect(await this.lpManager.weights(this.mockPairKlc.address)).to.equal(1);

            // Change weight
            await this.lpManager.changeWeight(this.mockPairKlc.address, 5);

            // Check weight set correctly
            expect(await this.lpManager.weights(this.mockPairKlc.address)).to.equal(5);
        });

        it('Pair not whitelisted', async function () {
            // Change weight
            await expect(this.lpManager.changeWeight(this.mockPairKlc.address, 5)).to.be.revertedWith(
                'LiquidityPoolManager::changeWeight: Pair not whitelisted');
        });

        it('Set weight to zero', async function () {
            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check weight set correctly
            expect(await this.lpManager.weights(this.mockPairKlc.address)).to.equal(1);

            // Change weight
            await expect(this.lpManager.changeWeight(this.mockPairKlc.address, 0)).to.be.revertedWith(
                'LiquidityPoolManager::changeWeight: Remove pool instead');
        });

        it('Insufficient privilege', async function () {
            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check weight set correctly
            expect(await this.lpManager.weights(this.mockPairKlc.address)).to.equal(1);

            // Change weight
            await expect(this.altContract.changeWeight(this.mockPairKlc.address, 5)).to.be.revertedWith(
                'Ownable: caller is not the owner')
        });
    });

    //////////////////////////////
    //   activateFeeSplit
    //////////////////////////////
    describe("activateFeeSplit", function () {
        it('Activate successfully', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.klcSplit()).to.equal(0);
            expect(await this.lpManager.kswapSplit()).to.equal(0);

            await this.lpManager.activateFeeSplit(30, 70);

            expect(await this.lpManager.splitPools()).to.be.true;
            expect(await this.lpManager.klcSplit()).to.equal(30);
            expect(await this.lpManager.kswapSplit()).to.equal(70);
        });

        it('Change after activating', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.klcSplit()).to.equal(0);
            expect(await this.lpManager.kswapSplit()).to.equal(0);

            await this.lpManager.activateFeeSplit(30, 70);

            expect(await this.lpManager.splitPools()).to.be.true;
            expect(await this.lpManager.klcSplit()).to.equal(30);
            expect(await this.lpManager.kswapSplit()).to.equal(70);

            await this.lpManager.activateFeeSplit(66, 34);

            expect(await this.lpManager.splitPools()).to.be.true;
            expect(await this.lpManager.klcSplit()).to.equal(66);
            expect(await this.lpManager.kswapSplit()).to.equal(34);
        });

        it('Over 100', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.klcSplit()).to.equal(0);
            expect(await this.lpManager.kswapSplit()).to.equal(0);

            await expect(this.lpManager.activateFeeSplit(300, 70)).to.be.revertedWith(
                "LiquidityPoolManager::activateFeeSplit: Split doesn't add to 100"
            );
        });

        it('Under 100', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.klcSplit()).to.equal(0);
            expect(await this.lpManager.kswapSplit()).to.equal(0);

            await expect(this.lpManager.activateFeeSplit(30, 30)).to.be.revertedWith(
                "LiquidityPoolManager::activateFeeSplit: Split doesn't add to 100"
            );
        });

        it('Klc 100', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.klcSplit()).to.equal(0);
            expect(await this.lpManager.kswapSplit()).to.equal(0);

            await expect(this.lpManager.activateFeeSplit(100, 0)).to.be.revertedWith(
                "LiquidityPoolManager::activateFeeSplit: Split can't be 100/0"
            );
        });

        it('KSWAP 100', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.klcSplit()).to.equal(0);
            expect(await this.lpManager.kswapSplit()).to.equal(0);

            await expect(this.lpManager.activateFeeSplit(0, 100)).to.be.revertedWith(
                "LiquidityPoolManager::activateFeeSplit: Split can't be 100/0"
            );
        });

        it('Insufficient privilege', async function () {
            await expect(this.altContract.activateFeeSplit(50, 50)).to.be.revertedWith(
                'Ownable: caller is not the owner')
        });
    });

    //////////////////////////////
    //   deactivateFeeSplit
    //////////////////////////////
    describe("deactivateFeeSplit", function () {
        it('Deactivate successfully', async function () {
            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.klcSplit()).to.equal(0);
            expect(await this.lpManager.kswapSplit()).to.equal(0);

            await this.lpManager.activateFeeSplit(30, 70);

            expect(await this.lpManager.splitPools()).to.be.true;
            expect(await this.lpManager.klcSplit()).to.equal(30);
            expect(await this.lpManager.kswapSplit()).to.equal(70);

            await this.lpManager.deactivateFeeSplit();

            // check false default
            expect(await this.lpManager.splitPools()).to.be.false;
            expect(await this.lpManager.klcSplit()).to.equal(0);
            expect(await this.lpManager.kswapSplit()).to.equal(0);
        });

        it('Not activated', async function () {
            await expect(this.lpManager.deactivateFeeSplit()).to.be.revertedWith(
                'LiquidityPoolManager::deactivateFeeSplit: Fee split not activated')
        });

        it('Insufficient privilege', async function () {
            await expect(this.altContract.deactivateFeeSplit()).to.be.revertedWith(
                'Ownable: caller is not the owner')
        });
    });

    //////////////////////////////
    //     getKlcLiquidity
    //////////////////////////////
    describe("getKlcLiquidity", function () {
        it('Get pair liquidity, KLC is token0', async function () {
            // klc is token 0
            const reserve0 = 1000;
            const reserve1 = 500;
            const timestamp = 1608676399;

            const expectedLiquidity = 2000;

            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getKlcLiquidity(this.mockPairKlc.address);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('Get pair liquidity, KLC is token1', async function () {
            // klc is token 1
            const reserve0 = 1000;
            const reserve1 = 500;
            const timestamp = 1608676399;

            const expectedLiquidity = 1000;

            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getKlcLiquidity(this.mockPairKlc.address);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('KLC not in pair', async function () {
            const reserve0 = 1000;
            const reserve1 = 500;
            const timestamp = 1608676399;

            // Setup mocks
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            await expect(this.lpManager.getKlcLiquidity(this.mockPairKlc.address)).to.be.revertedWith(
                "LiquidityPoolManager::getKlcLiquidity: One of the tokens in the pair must be WKLC");
        });
    });


    //////////////////////////////
    //     getKswapLiquidity
    //////////////////////////////
    describe("getKswapLiquidity", function () {
        it('Get pair liquidity, KSWAP is token0, KLC is bigger', async function () {
            // KSWAP is token 0
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            //const conversionFactor = BigNumber.from('40').mul(oneToken);;
            const conversionFactor = BigNumber.from('25000000000000000');

            const expectedLiquidity = BigNumber.from('10').mul(oneToken);

            // Setup mocks
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('Get pair liquidity, KSWAP is token1, KLC is bigger', async function () {
            // KSWAP is token 1
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            const conversionFactor = BigNumber.from('25000000000000000');

            const expectedLiquidity = BigNumber.from('50').mul(oneToken);

            // Setup mocks
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('Kswap not in pair', async function () {
            const reserve0 = BigNumber.from('1000').mul(oneToken);
            const reserve1 = BigNumber.from('500').mul(oneToken);
            const timestamp = 1608676399;
            const conversionFactor = BigNumber.from('40').mul(oneToken);

            // Setup mocks
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            await expect(this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor)).to.be.revertedWith(
                "LiquidityPoolManager::getKswapLiquidity: One of the tokens in the pair must be KSWAP");
        });

        it('Get pair liquidity, KSWAP is token0, KLC is smaller', async function () {
            // KSWAP is token 0
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            const conversionFactor = BigNumber.from('40').mul(oneToken);

            const expectedLiquidity = BigNumber.from('16000').mul(oneToken);

            // Setup mocks
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('Get pair liquidity, KSWAP is token1, KLC is smaller', async function () {
            // KSWAP is token 1
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            const conversionFactor = BigNumber.from('40').mul(oneToken);

            const expectedLiquidity = BigNumber.from('80000').mul(oneToken);

            // Setup mocks
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);

            // Calculate liquidity
            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end liquidity calculation, KLC more valuable', async function () {
            // KLC-KSWAP
            // KLC 1
            // KSWAP 40

            // KSWAP-ALT
            // KSWAP 200
            // ALT 1000
            const klcReserve = oneToken;
            const kswapReserve1 = BigNumber.from('40').mul(oneToken);
            const timestamp = 1608676399;

            const kswapReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedLiquidity = BigNumber.from("10").mul(oneToken);

            // Setup mocks for KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [klcReserve, kswapReserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for KSWAP-ALT pair
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const kswapReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, kswapReserve2, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, kswapReserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end liquidity calculation, KSWAP more valuable', async function () {
            // KLC-KSWAP
            // KLC 40
            // KSWAP 1

            // KSWAP-ALT
            // KSWAP 200
            // ALT 1000
            const klcReserve = BigNumber.from('40').mul(oneToken);
            const kswapReserve1 = oneToken;
            const timestamp = 1608676399;

            const kswapReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedLiquidity = BigNumber.from("16000").mul(oneToken);

            // Setup mocks for KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [klcReserve, kswapReserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for KSWAP-ALT pair
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const kswapReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, kswapReserve2, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, kswapReserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end liquidity calculation, KLC more valuable, token order swapped', async function () {
            // KLC-KSWAP
            // KLC 1
            // KSWAP 40

            // KSWAP-ALT
            // KSWAP 200
            // ALT 1000
            const klcReserve = oneToken;
            const kswapReserve1 = BigNumber.from('40').mul(oneToken);
            const timestamp = 1608676399;

            const kswapReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedLiquidity = BigNumber.from("10").mul(oneToken);

            // Setup mocks for KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [kswapReserve1, klcReserve, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for KSWAP-ALT pair
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const kswapReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, kswapReserve2, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, kswapReserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end liquidity calculation, KSWAP more valuable, token order swapped', async function () {
            // KLC-KSWAP
            // KLC 40
            // KSWAP 1

            // KSWAP-ALT
            // KSWAP 200
            // ALT 1000
            const klcReserve = BigNumber.from('40').mul(oneToken);
            const kswapReserve1 = oneToken;
            const timestamp = 1608676399;

            const kswapReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedLiquidity = BigNumber.from("16000").mul(oneToken);

            // Setup mocks for KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [kswapReserve1, klcReserve, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for KSWAP-ALT pair
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const kswapReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, kswapReserve2, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, kswapReserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end real numbers', async function () {
            // KLC-KSWAP
            // KLC 5.09533
            // KSWAP 490.73308

            // KSWAP-ALT
            // KSWAP 7866.999
            // ALT 455.999
            const klcReserve = BigNumber.from('5095330000000000000');
            const kswapReserve1 = BigNumber.from('490733080000000000000');
            const timestamp = 1608676399;

            const kswapReserve2 = BigNumber.from('7866999000000000000000');
            const altReserve = BigNumber.from('455999000000000000000');

            //const expectedConversionFactor = BigNumber.from('96310362626169453205');
            const expectedConversionFactor = BigNumber.from('10383098689821358');
            const expectedLiquidity = BigNumber.from("163367654019451867129");

            // Setup mocks for KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [klcReserve, kswapReserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for KSWAP-ALT pair
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const kswapReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, kswapReserve2, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, kswapReserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            expect(conversionFactor).to.equal(expectedConversionFactor);

            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end real numbers, reversed', async function () {
            // KLC-KSWAP
            // KLC 5.09533
            // KSWAP 490.73308

            // KSWAP-ALT
            // KSWAP 455.999
            // ALT 7866.999
            const klcReserve = BigNumber.from('5095330000000000000');
            const kswapReserve1 = BigNumber.from('490733080000000000000');
            const timestamp = 1608676399;

            const kswapReserve2 = BigNumber.from('455999000000000000000');
            const altReserve = BigNumber.from('7866999000000000000000');

            const expectedConversionFactor = BigNumber.from('10383098689821358');
            const expectedLiquidity = BigNumber.from("9469365238919698853");

            // Setup mocks for KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [klcReserve, kswapReserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for KSWAP-ALT pair
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const kswapReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, kswapReserve2, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, kswapReserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            expect(conversionFactor).to.equal(expectedConversionFactor);

            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);


            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end, equal ratio', async function () {
            // KLC-KSWAP
            // KLC 5.09533
            // KSWAP 490.73308

            // KSWAP-ALT
            // KSWAP 7866.999
            // ALT 455.999
            const klcReserve = BigNumber.from('1').mul(oneToken);
            const kswapReserve1 = BigNumber.from('1').mul(oneToken);
            const timestamp = 1608676399;

            const kswapReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedConversionFactor = BigNumber.from('10383098689821358');
            const expectedLiquidity = BigNumber.from('400').mul(oneToken);

            // Setup mocks for KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [klcReserve, kswapReserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for KSWAP-ALT pair
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const kswapReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, kswapReserve2, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, kswapReserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            //expect(conversionFactor).to.equal(expectedConversionFactor);

            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });

        it('End-to-end, equal ratio inflated', async function () {
            // KLC-KSWAP
            // KLC 5.09533
            // KSWAP 490.73308

            // KSWAP-ALT
            // KSWAP 7866.999
            // ALT 455.999
            const klcReserve = BigNumber.from('1000').mul(oneToken);
            const kswapReserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const kswapReserve2 = BigNumber.from('200').mul(oneToken);
            const altReserve = BigNumber.from('1000').mul(oneToken);

            const expectedConversionFactor = BigNumber.from('10383098689821358');
            const expectedLiquidity = BigNumber.from('400').mul(oneToken);

            // Setup mocks for KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [klcReserve, kswapReserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            // Setup mocks for KSWAP-ALT pair
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.altCoin.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const kswapReserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [altReserve, kswapReserve2, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, kswapReserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            //expect(conversionFactor).to.equal(expectedConversionFactor);

            const liquidity = await this.lpManager.getKswapLiquidity(this.mockPairKswap.address, conversionFactor);

            // Check liquidity calculated correctly
            expect(liquidity).to.equal(expectedLiquidity);
        });
    });

    //////////////////////////////
    //     getKlcKswapRatio
    //////////////////////////////
    describe("getKlcKswapRatio", function () {
        it('KLC more valuable', async function () {
            // KLC 200
            // KSWAP 1000
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const expectedConversionFactor = BigNumber.from("200000000000000000");

            // Setup mocks
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            // Check liquidity calculated correctly
            expect(conversionFactor).to.equal(expectedConversionFactor);
        });

        it('KSWAP more valuable', async function () {
            // KLC 200
            // KSWAP 1000
            const reserve0 = BigNumber.from('1000').mul(oneToken);
            const reserve1 = BigNumber.from('200').mul(oneToken);
            const timestamp = 1608676399;

            const expectedConversionFactor = BigNumber.from("5").mul(oneToken);

            // Setup mocks
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            // Check liquidity calculated correctly
            expect(conversionFactor).to.equal(expectedConversionFactor);
        });

        it('KLC more valuable, reverse token order', async function () {
            // KLC 200
            // KSWAP 1000
            const reserve1 = BigNumber.from('200').mul(oneToken);
            const reserve0 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const expectedConversionFactor = BigNumber.from("200000000000000000");

            // Setup mocks
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            const conversionFactor = await this.lpManager.getKlcKswapRatio();

            // Check liquidity calculated correctly
            expect(conversionFactor).to.equal(expectedConversionFactor);
        });

        it('KSWAP more valuable', async function () {
            // KLC 200
            // KSWAP 1000
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const reserve0 = BigNumber.from('200').mul(oneToken);
            const timestamp = 1608676399;

            const expectedConversionFactor = BigNumber.from("5").mul(oneToken);

            // Setup mocks
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.kswap.address);

            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturn);

            var conversionFactor = await this.lpManager.getKlcKswapRatio();

            // Check liquidity calculated correctly
            expect(conversionFactor).to.equal(expectedConversionFactor);
        });

    });


    //////////////////////////////
    //    calculateReturns
    //          and
    //    distributeTokens
    //////////////////////////////
    describe("calculateReturns and distributeTokens", function () {
        it('Distribute all to one KLC pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            // Get stake contract
            const stakeContract = await this.lpManager.stakes(this.mockPairKlc.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Distribute without calculating', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute

            await expect(this.lpManager.distributeTokens()).to.be.revertedWith(
                'LiquidityPoolManager::distributeTokens: Previous returns not allocated. Call calculateReturns()'
            );
        });

        it('Distribute all to one KSWAP pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('200').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Distribute all to KLC-KSWAP pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('200').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract = await this.lpManager.stakes(this.mockPairKlcKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Distribute to one KSWAP and one KLC pool equally', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(vestAmount/2);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(vestAmount/2);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Distribute to one KSWAP and one KLC pool 1/3 and 2/3', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveKlc0 = BigNumber.from('200').mul(oneToken);
            const reserveKlc1 = BigNumber.from('1000').mul(oneToken);

            const reserveKswap0 = BigNumber.from('400').mul(oneToken);
            const reserveKswap1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc0, reserveKlc1, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKswap0, reserveKswap1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/3));
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(Math.floor(2*vestAmount/3));
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(1);
        });

        it('Distribute to one KSWAP, one KLC, and KLC/KSWAP pool equally', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveKlc0 = BigNumber.from('1000').mul(oneToken);
            const reserveKlc1 = BigNumber.from('1000').mul(oneToken);

            const reserveKswap0 = BigNumber.from('1000').mul(oneToken);
            const reserveKswap1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc0, reserveKlc1, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKswap0, reserveKswap1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairKlcKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/3));
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(Math.floor(vestAmount/3));
            expect(await this.kswap.balanceOf(stakeContract3)).to.equal(Math.floor(vestAmount/3));
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(1);
        });

        it('No tokens to distribute', async function () {
            // Initialize pools
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);

            // distribute
            await expect(this.lpManager.calculateReturns()).to.be.revertedWith(
                "LiquidityPoolManager::calculateReturns: No KSWAP to allocate. Call vestAllocation()."
            );
        });

        it('KLC-KSWAP not set', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await expect(this.lpManager.calculateReturns()).to.be.revertedWith(
                "LiquidityPoolManager::calculateReturns: Klc/KSWAP Pair not set");
        });

        it('Extra KSWAP Tokens', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Send extra KSWAP
            await this.kswap.transfer(this.lpManager.address, vestAmount);

            // Initialize pools
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(2*vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract = await this.lpManager.stakes(this.mockPairKlc.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);
        });
    });

    //////////////////////////////
    //  Weighted Distribution
    //////////////////////////////
    describe("Distribution with weights", function () {
        it('Equal liquidity different weights', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 2);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/3));
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(Math.floor(2*vestAmount/3));
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(1);
        });

        it('Different liquidity different weights', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveKlc0 = BigNumber.from('200').mul(oneToken);
            const reserveKlc1 = BigNumber.from('1000').mul(oneToken);

            const reserveKswap0 = BigNumber.from('400').mul(oneToken);
            const reserveKswap1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc0, reserveKlc1, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKswap0, reserveKswap1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 2);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/2));
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(Math.floor(vestAmount/2));
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Equal liquidity different weights, flipped', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('1000').mul(oneToken);
            const reserve1 = BigNumber.from('200').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 2);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(Math.floor(2*vestAmount/3));
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(Math.floor(vestAmount/3));
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(1);
        });

        it('Different liquidity different weights, flipped', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserveKlc0 = BigNumber.from('400').mul(oneToken);
            const reserveKlc1 = BigNumber.from('1000').mul(oneToken);

            const reserveKswap0 = BigNumber.from('200').mul(oneToken);
            const reserveKswap1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc0, reserveKlc1, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKswap0, reserveKswap1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 2);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(Math.floor(vestAmount/2));
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(Math.floor(vestAmount/2));
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);
        });
    });

    //////////////////////////////
    //  Split Distribution
    //////////////////////////////
    describe("Split Distribution", function () {
        it('Equal split, same liquidity, equal weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 50;
            const kswapSplit = 50;
            const klcWeight = 1
            const kswapWeight = 1
            const klcKswapReserveKlc = 1000;
            const klcKswapReserveKswap = 1000;

            const expectedKlcReward = Math.floor(vestAmount/2);
            const expectedKswapReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, different liquidity, equal weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 50;
            const kswapSplit = 50;
            const klcWeight = 1
            const kswapWeight = 1
            const klcKswapReserveKlc = 300;
            const klcKswapReserveKswap = 1000;

            // doesn't depend on liqudity, so should be same
            const expectedKlcReward = Math.floor(vestAmount/2);
            const expectedKswapReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, different liquidity, equal weights, flipped', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 50;
            const kswapSplit = 50;
            const klcWeight = 1
            const kswapWeight = 1
            const klcKswapReserveKlc = 1000;
            const klcKswapReserveKswap = 300;

            // doesn't depend on liqudity, so should be same
            const expectedKlcReward = Math.floor(vestAmount/2);
            const expectedKswapReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, equal liquidity, equal weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 75;
            const kswapSplit = 25;
            const klcWeight = 1
            const kswapWeight = 1
            const klcKswapReserveKlc = 1000;
            const klcKswapReserveKswap = 1000;

            const expectedKlcReward = Math.floor(3*vestAmount/4);
            const expectedKswapReward = Math.floor(vestAmount/4);
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, equal liquidity, equal weights, flipped', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 25;
            const kswapSplit = 75;
            const klcWeight = 1
            const kswapWeight = 1
            const klcKswapReserveKlc = 1000;
            const klcKswapReserveKswap = 1000;

            const expectedKlcReward = Math.floor(vestAmount/4);
            const expectedKswapReward = Math.floor(3*vestAmount/4);
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, Different liquidity, equal weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 66;
            const kswapSplit = 34;
            const klcWeight = 1
            const kswapWeight = 1
            const klcKswapReserveKlc = 1000;
            const klcKswapReserveKswap = 200;

            const expectedKlcReward = 660;
            const expectedKswapReward = 340;
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, Different liquidity, equal weights, flipped', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 34;
            const kswapSplit = 66;
            const klcWeight = 1
            const kswapWeight = 1
            const klcKswapReserveKlc = 1000;
            const klcKswapReserveKswap = 200;

            const expectedKlcReward = 340;
            const expectedKswapReward = 660;
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, same liquidity, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 50;
            const kswapSplit = 50;
            const klcWeight = 5
            const kswapWeight = 7
            const klcKswapReserveKlc = 300;
            const klcKswapReserveKswap = 1000;

            // doesn't depend on liqudity, so should be same
            const expectedKlcReward = Math.floor(vestAmount/2);
            const expectedKswapReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, different liquidity, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 50;
            const kswapSplit = 50;
            const klcWeight = 6
            const kswapWeight = 1
            const klcKswapReserveKlc = 300;
            const klcKswapReserveKswap = 1000;

            // doesn't depend on liqudity, so should be same
            const expectedKlcReward = Math.floor(vestAmount/2);
            const expectedKswapReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, equal liquidity, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 75;
            const kswapSplit = 25;
            const klcWeight = 4
            const kswapWeight = 3
            const klcKswapReserveKlc = 1000;
            const klcKswapReserveKswap = 1000;

            const expectedKlcReward = Math.floor(3*vestAmount/4);
            const expectedKswapReward = Math.floor(vestAmount/4);
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Different split, Different liquidity, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 66;
            const kswapSplit = 34;
            const klcWeight = 3
            const kswapWeight = 4
            const klcKswapReserveKlc = 1000;
            const klcKswapReserveKswap = 200;

            const expectedKlcReward = 660;
            const expectedKswapReward = 340;
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Multiple pairs, equal split, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 50;
            const kswapSplit = 50;
            const klcWeight = 30
            const klc2Weight = 10
            const klcKswapWeight = 10
            const kswapWeight = 40

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcPool2ReserveKswap = BigNumber.from('1000').mul(oneToken);
            const klcPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcKswapReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcKswapReserveKswap = BigNumber.from('1000').mul(oneToken);

            const expectedKlcReward = 375;
            const expectedKlc2Reward = 125;
            const expectedKlcKswapReward = 100;
            const expectedKswapReward = 400;

            const leftover = 0;

            // Vest tokens
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc2.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlc2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            const reserveReturnKlc2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [klcPool2ReserveAltcoin, klcPool2ReserveKswap, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);
            await this.mockPairKlc2.givenMethodReturn(getReserves, reserveReturnKlc2);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, kswapWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, klcKswapWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc2.address, klc2Weight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlcKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlc2.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairKlcKswap.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairKlc2.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(stakeContract3)).to.equal(expectedKlcKswapReward);
            expect(await this.kswap.balanceOf(stakeContract4)).to.equal(expectedKlc2Reward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        })

        it('Multiple tokens, different split, different weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 25;
            const kswapSplit = 75;
            const klcWeight = 30
            const klcKswapWeight = 10
            const kswapWeight = 40
            const klc2Weight = 10

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcPool2ReserveKswap = BigNumber.from('1000').mul(oneToken);
            const klcPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcKswapReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcKswapReserveKswap = BigNumber.from('1000').mul(oneToken);

            const expectedKlcReward = 187;
            const expectedKlcKswapReward = 150;
            const expectedKswapReward = 600;
            const expectedKlc2Reward = 62;
            const leftover = 1;

            // Vest tokens
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc2.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlc2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            const reserveReturnKlc2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [klcPool2ReserveAltcoin, klcPool2ReserveKswap, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);
            await this.mockPairKlc2.givenMethodReturn(getReserves, reserveReturnKlc2);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, kswapWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, klcKswapWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc2.address, klc2Weight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlcKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlc2.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairKlcKswap.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairKlc2.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(stakeContract3)).to.equal(expectedKlcKswapReward);
            expect(await this.kswap.balanceOf(stakeContract4)).to.equal(expectedKlc2Reward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Multiple tokens, different split, different weights, post remove', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 25;
            const kswapSplit = 75;
            const klcWeight = 30
            const klcKswapWeight = 10
            const kswapWeight = 40
            const klc2Weight = 10

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcPool2ReserveKswap = BigNumber.from('1000').mul(oneToken);
            const klcPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcKswapReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcKswapReserveKswap = BigNumber.from('1000').mul(oneToken);

            const expectedKlcReward = 250;
            const expectedKlcKswapReward = 150;
            const expectedKswapReward = 600;
            const expectedKlc2Reward = 0;
            const leftover = 0;

            // Vest tokens
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc2.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlc2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            const reserveReturnKlc2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [klcPool2ReserveAltcoin, klcPool2ReserveKswap, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);
            await this.mockPairKlc2.givenMethodReturn(getReserves, reserveReturnKlc2);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, kswapWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, klcKswapWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc2.address, klc2Weight);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlc2.address);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlcKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlc2.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairKlcKswap.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairKlc2.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(stakeContract3)).to.equal(expectedKlcKswapReward);
            expect(await this.kswap.balanceOf(stakeContract4)).to.equal(expectedKlc2Reward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Multiple tokens, different split, different weights, post remove, flipped', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 25;
            const kswapSplit = 75;
            const klcWeight = 30
            const klcKswapWeight = 10
            const kswapWeight = 40
            const klc2Weight = 10

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcPool2ReserveKswap = BigNumber.from('1000').mul(oneToken);
            const klcPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcKswapReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcKswapReserveKswap = BigNumber.from('1000').mul(oneToken);

            const expectedKlcReward = 187;
            const expectedKlcKswapReward = 0;
            const expectedKswapReward = 750;
            const expectedKlc2Reward = 62;
            const leftover = 1;

            // Vest tokens
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc2.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlc2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            const reserveReturnKlc2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [klcPool2ReserveAltcoin, klcPool2ReserveKswap, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);
            await this.mockPairKlc2.givenMethodReturn(getReserves, reserveReturnKlc2);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, kswapWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, klcWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, klcKswapWeight);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc2.address, klc2Weight);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlcKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlcKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlc2.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairKlcKswap.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairKlc2.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(stakeContract3)).to.equal(expectedKlcKswapReward);
            expect(await this.kswap.balanceOf(stakeContract4)).to.equal(expectedKlc2Reward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Equal split, change weights', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 50;
            const kswapSplit = 50;
            const klcWeight = 6
            const kswapWeight = 1
            const klcKswapReserveKlc = 300;
            const klcKswapReserveKswap = 1000;

            // doesn't depend on liqudity, so should be same
            const expectedKlcReward = Math.floor(vestAmount/2);
            const expectedKswapReward = Math.floor(vestAmount/2);
            const leftover = 0;

            // Vest tokens

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split

            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Change weights
            await this.lpManager.changeWeight(this.mockPairKlc.address, klcWeight);
            await this.lpManager.changeWeight(this.mockPairKswap.address, kswapWeight);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });

        it('Change weights, Multiple tokens, different split', async function () {
            // Test Parameters
            const vestAmount = 1000;
            const klcSplit = 25;
            const kswapSplit = 75;
            const klcWeight = 30
            const klcKswapWeight = 10
            const kswapWeight = 40
            const klc2Weight = 10

            const klcPoolReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const kswapPoolReserveKswap = BigNumber.from('1000').mul(oneToken);
            const kswapPoolReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcPool2ReserveKswap = BigNumber.from('1000').mul(oneToken);
            const klcPool2ReserveAltcoin = BigNumber.from('1000').mul(oneToken);

            const klcKswapReserveKlc = BigNumber.from('1000').mul(oneToken);
            const klcKswapReserveKswap = BigNumber.from('1000').mul(oneToken);

            const expectedKlcReward = 187;
            const expectedKlcKswapReward = 0;
            const expectedKswapReward = 750;
            const expectedKlc2Reward = 62;
            const leftover = 1;

            // Vest tokens
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize split
            await this.lpManager.activateFeeSplit(klcSplit, kswapSplit);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc2.givenMethodReturnAddress(token1, this.mockWklc.address);
            await this.mockPairKlc2.givenMethodReturnAddress(token0, this.altCoin2.address);

            const timestamp = 1608676399;

            const reserveReturnKlc = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcPoolReserveKlc, klcPoolReserveAltcoin, timestamp]);
            const reserveReturnKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [kswapPoolReserveKswap, kswapPoolReserveAltcoin, timestamp]);
            const reserveReturnKlc2 = web3.eth.abi.encodeParameters(
                    ["uint112", "uint112", "uint32"],
                    [klcPool2ReserveAltcoin, klcPool2ReserveKswap, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturnKswap);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturnKlc);
            await this.mockPairKlc2.givenMethodReturn(getReserves, reserveReturnKlc2);

            // Initialize KLC-KSWAP pair
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(
                ["uint112", "uint112", "uint32"],
                [klcKswapReserveKlc, klcKswapReserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlcKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc2.address, 1);

            // Change weights
            await this.lpManager.changeWeight(this.mockPairKswap.address, kswapWeight);
            await this.lpManager.changeWeight(this.mockPairKlc.address, klcWeight);
            await this.lpManager.changeWeight(this.mockPairKlcKswap.address, klcKswapWeight);
            await this.lpManager.changeWeight(this.mockPairKlc2.address, klc2Weight);

            // Remove pool
            await this.lpManager.removeWhitelistedPool(this.mockPairKlcKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlcKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKlc2.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokens();

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);
            const stakeContract3 = await this.lpManager.stakes(this.mockPairKlcKswap.address);
            const stakeContract4 = await this.lpManager.stakes(this.mockPairKlc2.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(expectedKlcReward);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(expectedKswapReward);
            expect(await this.kswap.balanceOf(stakeContract3)).to.equal(expectedKlcKswapReward);
            expect(await this.kswap.balanceOf(stakeContract4)).to.equal(expectedKlc2Reward);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(leftover);
        });
    });

    //////////////////////////////
    //  singleTokenDistribution
    //////////////////////////////
    describe("singleTokenDistribution", function () {
        it('Distribute single pool KLC pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(0);

            // Get stake contract
            const stakeContract = await this.lpManager.stakes(this.mockPairKlc.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);

            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);
            await this.lpManager.distributeTokens();
            expect(await this.lpManager.unallocatedKswap()).to.equal(0);
        });

        it('Distribute single pool KSWAP pool', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('200').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(0);

            const stakeContract = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);

            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);
            await this.lpManager.distributeTokens();
            expect(await this.lpManager.unallocatedKswap()).to.equal(0);
        });

        it('Distribute all single pools', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(1);

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(0);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(vestAmount/2);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount/2);

            await this.lpManager.distributeTokensSinglePool(0);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(vestAmount/2);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(vestAmount/2);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);

            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);
            await this.lpManager.distributeTokens();
            expect(await this.lpManager.unallocatedKswap()).to.equal(0);
        });

        it('Distribute single then multiple', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKswap.givenMethodReturnAddress(token0, this.kswap.address);
            await this.mockPairKswap.givenMethodReturnAddress(token1, this.altCoin.address);

            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);

            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKswap.givenMethodReturn(getReserves, reserveReturn);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Initialize KLC-KSWAP pair
            const reserveKlc = BigNumber.from('1000').mul(oneToken);
            const reserveKswap = BigNumber.from('1000').mul(oneToken);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token0, this.wklc.address);
            await this.mockPairKlcKswap.givenMethodReturnAddress(token1, this.kswap.address);

            const reserveReturnKlcKswap = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserveKlc, reserveKswap, timestamp]);
            await this.mockPairKlcKswap.givenMethodReturn(getReserves, reserveReturnKlcKswap);
            await this.lpManager.setKlcKswapPair(this.mockPairKlcKswap.address);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKswap.address, 1);
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.mockPairKswap.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(0);

            const stakeContract1 = await this.lpManager.stakes(this.mockPairKlc.address);
            const stakeContract2 = await this.lpManager.stakes(this.mockPairKswap.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(vestAmount/2);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount/2);

            await this.lpManager.distributeTokens();

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract1)).to.equal(vestAmount/2);
            expect(await this.kswap.balanceOf(stakeContract2)).to.equal(vestAmount/2);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);
        });

        it('Index out of bounds', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // distribute
            await this.lpManager.calculateReturns();
            await expect(this.lpManager.distributeTokensSinglePool(1)).to.be.revertedWith('LiquidityPoolManager::distributeTokensSinglePool: Index out of bounds');
        });

        it('Distribution not calculated', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // distribute without calcualting
            await expect(this.lpManager.distributeTokensSinglePool(1)).to.be.revertedWith(
                'LiquidityPoolManager::distributeTokensSinglePool: Previous returns not allocated. Call calculateReturns()');
        });

        it('Call vest before distbuteTokens', async function () {
            // Vest tokens
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            // Initialize pools
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManager.addWhitelistedPool(this.mockPairKlc.address, 1);

            // Check balances
            expect(await this.kswap.balanceOf(this.mockPairKlc.address)).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(vestAmount);

            // distribute
            await this.lpManager.calculateReturns();
            await this.lpManager.distributeTokensSinglePool(0);

            // Get stake contract
            const stakeContract = await this.lpManager.stakes(this.mockPairKlc.address);

            // Check balances
            expect(await this.kswap.balanceOf(stakeContract)).to.equal(vestAmount);
            expect(await this.kswap.balanceOf(this.lpManager.address)).to.equal(0);

            // Don't call distributeTokens()
            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await expect(this.lpManager.vestAllocation()).to.be.revertedWith('LiquidityPoolManager::vestAllocation: Old KSWAP is unallocated. Call distributeTokens().');
        });
    });

    //////////////////////////////
    //     vestAllocation
    //////////////////////////////
    describe("vestAllocation", function () {
        it('Successful vest with mock', async function () {
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);

            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            expect(await this.lpManager.unallocatedKswap()).to.equal(0);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);
        });

        it('Unallocated tokens remain', async function () {
            const vestAmount = 1000;
            await this.kswap.transfer(this.lpManager.address, vestAmount);

            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            expect(await this.lpManager.unallocatedKswap()).to.equal(0);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(vestAmount);

            await this.kswap.transfer(this.lpManager.address, vestAmount);
            await expect(this.lpManager.vestAllocation()).to.be.revertedWith(
                "LiquidityPoolManager::vestAllocation: Old KSWAP is unallocated. Call distributeTokens().");
        });

        it('No tokens to claim with mock', async function () {
            const vestAmount = 0;

            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            await expect(this.lpManager.vestAllocation()).to.be.revertedWith(
                "LiquidityPoolManager::vestAllocation: No KSWAP to claim. Try again tomorrow.");
        });

        it('KSWAP not transferred', async function () {
            const vestAmount = 1000;
            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            expect(await this.lpManager.unallocatedKswap()).to.equal(0);
            await expect(this.lpManager.vestAllocation()).to.be.revertedWith(
                "LiquidityPoolManager::vestAllocation: Insufficient KSWAP transferred");
        });

        it('Extra KSWAP Tokens', async function () {
            const vestAmount = 1000;
            const extraKswap = 1000;
            const totalTransfer = vestAmount + extraKswap;
            await this.kswap.transfer(this.lpManager.address, totalTransfer);

            await this.mockTreasuryVester.givenMethodReturnUint(claimMethod, vestAmount);

            expect(await this.lpManager.unallocatedKswap()).to.equal(0);
            await this.lpManager.vestAllocation();
            expect(await this.lpManager.unallocatedKswap()).to.equal(totalTransfer);
        });
    });

    //////////////////////////////
    //          quote
    //////////////////////////////

    // method borrowed directly from KalyswapLibrary (formerly UniswapLibrary)

    //////////////////////////////
    //       End-to-End
    //////////////////////////////
    describe("End-to-End", function () {
        it('Successful vest', async function () {
            await this.kswap.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.kswap.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.lpManagerTreasury.address);

            // Start Vesting
            await this.treasury.startVesting();

            expect(await this.lpManagerTreasury.unallocatedKswap()).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManagerTreasury.address)).to.equal(0);
            await this.lpManagerTreasury.vestAllocation();
            expect(await this.lpManagerTreasury.unallocatedKswap()).to.equal(STARTING_AMOUNT);
        });

        it('Multiple Successful vests', async function () {
            await this.kswap.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.kswap.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.lpManagerTreasury.address);

            // Start Vesting
            await this.treasury.startVesting();

            // Add a whitelisted token
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManagerTreasury.addWhitelistedPool(this.mockPairKlc.address, 1);

            expect(await this.lpManagerTreasury.unallocatedKswap()).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManagerTreasury.address)).to.equal(0);
            await this.lpManagerTreasury.vestAllocation();
            expect(await this.lpManagerTreasury.unallocatedKswap()).to.equal(STARTING_AMOUNT);

            await this.lpManagerTreasury.calculateReturns();
            await this.lpManagerTreasury.distributeTokens();

            await ethers.provider.send("evm_increaseTime", [INTERVAL]);

            expect(await this.lpManagerTreasury.unallocatedKswap()).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManagerTreasury.address)).to.equal(0);
            await this.lpManagerTreasury.vestAllocation();
            expect(await this.lpManagerTreasury.unallocatedKswap()).to.equal(STARTING_AMOUNT);
        });

        it('Too early vest', async function () {
            await this.kswap.transfer(this.treasury.address, TOTAL_AMOUNT);
            expect(await this.kswap.balanceOf(this.treasury.address)).to.equal(TOTAL_AMOUNT);
            await this.treasury.setRecipient(this.lpManagerTreasury.address);

            // Start Vesting
            await this.treasury.startVesting();

            // Add a whitelisted token
            await this.mockPairKlc.givenMethodReturnAddress(token0, this.mockWklc.address);
            await this.mockPairKlc.givenMethodReturnAddress(token1, this.altCoin.address);

            const reserve0 = BigNumber.from('200').mul(oneToken);
            const reserve1 = BigNumber.from('1000').mul(oneToken);
            const timestamp = 1608676399;

            const reserveReturn = web3.eth.abi.encodeParameters(["uint112", "uint112", "uint32"], [reserve0, reserve1, timestamp]);
            await this.mockPairKlc.givenMethodReturn(getReserves, reserveReturn);

            // Whitelist pool
            await this.lpManagerTreasury.addWhitelistedPool(this.mockPairKlc.address, 1);

            expect(await this.lpManagerTreasury.unallocatedKswap()).to.equal(0);
            expect(await this.kswap.balanceOf(this.lpManagerTreasury.address)).to.equal(0);
            await this.lpManagerTreasury.vestAllocation();
            expect(await this.lpManagerTreasury.unallocatedKswap()).to.equal(STARTING_AMOUNT);

            await this.lpManagerTreasury.calculateReturns();
            await this.lpManagerTreasury.distributeTokens();

            await ethers.provider.send("evm_increaseTime", [INTERVAL - 3]);

            await expect(this.lpManagerTreasury.vestAllocation()).to.be.revertedWith('TreasuryVester::claim: not time yet');
        });
    });



});