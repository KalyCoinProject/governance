// test/Airdrop.js
// Load dependencies
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');
const Web3 = require('web3');

const OWNER_ADDRESS = ethers.utils.getAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
const TREASURY = ethers.utils.getAddress("0x4750c43867ef5f89869132eccf19b9b6c4286e1a");
const UNPRIVILEGED_ADDRESS = ethers.utils.getAddress("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65");

const AIRDROP_SUPPLY = ethers.BigNumber.from("26000000000000000000000000");

const balanceOf = Web3.utils.sha3('balanceOf(address)').slice(0,10);

const oneToken = BigNumber.from('1000000000000000000')


// Start test block
describe('Airdrop', function () {
    before(async function () {
        this.Airdrop = await ethers.getContractFactory("Airdrop");
        this.KSWAP = await ethers.getContractFactory("Kswap");
        this.MockContract = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
        this.MockSushiContract = await ethers.getContractFactory("contracts/MockContract.sol:MockContract");
    });

    beforeEach(async function () {
        this.mockUni = await this.MockContract.deploy()
        await this.mockUni.deployed()
        this.mockSushi = await this.MockSushiContract.deploy()
        await this.mockSushi.deployed()
        this.kswap = await this.KSWAP.deploy(OWNER_ADDRESS);
        await this.kswap.deployed();
        this.airdrop = await this.Airdrop.deploy(this.kswap.address, this.mockUni.address, this.mockSushi.address, OWNER_ADDRESS, TREASURY);
        await this.airdrop.deployed();

    });

    // Test cases

    //////////////////////////////
    //       Constructor
    //////////////////////////////
    describe("Constructor", function () {
        it('kswap default', async function () {
            expect((await this.airdrop.kswap())).to.equal(this.kswap.address);
        });
        it('uni default', async function () {
            expect((await this.airdrop.uni())).to.equal(this.mockUni.address);
        });
        it('sushi default', async function () {
            expect((await this.airdrop.sushi())).to.equal(this.mockSushi.address);
        });
        it('owner default', async function () {
            expect((await this.airdrop.owner())).to.equal(OWNER_ADDRESS);
        });
        it('remainderDestination default', async function () {
            expect((await this.airdrop.remainderDestination())).to.equal(TREASURY);
        });
        it('claiming default', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
        });
        it('totalAllocated default', async function () {
            expect((await this.airdrop.totalAllocated())).to.equal(0);
        });
    });

    //////////////////////////////
    //  setRemainderDestination
    //////////////////////////////
    describe("setRemainderDestination", function () {
        it('set remainder successfully', async function () {
            expect((await this.airdrop.remainderDestination())).to.not.equal(UNPRIVILEGED_ADDRESS);
            await this.airdrop.setRemainderDestination(UNPRIVILEGED_ADDRESS);
            expect((await this.airdrop.remainderDestination())).to.equal(UNPRIVILEGED_ADDRESS);
        });

        it('set remainder unsuccessfully', async function () {
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.setRemainderDestination(altAddr.getAddress())).to.be.revertedWith(
                "Airdrop::setRemainderDestination: unauthorized");
        });
    });

    //////////////////////////////
    //     setowner
    //////////////////////////////
    describe("setowner", function () {
        it('set owner successfully', async function () {
            expect((await this.airdrop.owner())).to.not.equal(UNPRIVILEGED_ADDRESS);
            await this.airdrop.setowner(UNPRIVILEGED_ADDRESS);
            expect((await this.airdrop.owner())).to.equal(UNPRIVILEGED_ADDRESS);
        });

        it('set owner unsuccessfully', async function () {
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.setowner(altAddr.getAddress())).to.be.revertedWith(
                "Airdrop::setowner: unauthorized");
        });
    });

    //////////////////////////////
    //     allowClaiming
    //////////////////////////////
    describe("allowClaiming", function () {
        it('set claiming successfully', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;
        });

        it('ClaimingAllowed emitted', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);

            await expect(this.airdrop.allowClaiming()).to.emit(this.airdrop, 'ClaimingAllowed')
        });

        it('set claiming insufficient KSWAP', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await expect(this.airdrop.allowClaiming()).to.be.revertedWith(
                'Airdrop::allowClaiming: incorrect KSWAP supply');
        });

        it('set claiming unathorized', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);

            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.allowClaiming()).to.be.revertedWith(
                'Airdrop::allowClaiming: unauthorized');
        });

        it('set claiming unathorized and insufficient KSWAP', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.allowClaiming()).to.be.revertedWith(
                'Airdrop::allowClaiming: incorrect KSWAP supply');
        });
    });

    //////////////////////////////
    //       endClaiming
    //////////////////////////////
    describe("endClaiming", function () {
        it('end claiming successfully', async function () {
            // allow claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // end claiming
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(AIRDROP_SUPPLY);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(0);
        });

        it('claiming not started', async function () {
            // end claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await expect(this.airdrop.endClaiming()).to.be.revertedWith("Airdrop::endClaiming: Claiming not started");
        });

        it('ClaimingOver emitted', async function () {
            // allow claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            await expect(this.airdrop.endClaiming()).to.emit(this.airdrop, 'ClaimingOver')
        });

        it('end claiming with some claimed KSWAP', async function () {
            // whitelist address
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            const kswapOut = oneToken.mul(100)
            const requiredUni = oneToken.mul(10000)
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);

            // enable claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // claim
            await altContract.claim();

            // end claiming
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(AIRDROP_SUPPLY.sub(kswapOut));
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(0);
        });

        it('end claiming with all claimed KSWAP', async function () {
            // whitelist address
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            const kswapOut = AIRDROP_SUPPLY;
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);

            // enable claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // claim
            await altContract.claim();

            // end claiming
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(0);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(0);
        });

        it('end claiming unauthorized', async function () {
            // allow claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // end claiming
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.endClaiming()).to.be.revertedWith(
                'Airdrop::endClaiming: unauthorized');
        });
    });

    //////////////////////////////
    //          claim
    //////////////////////////////
    describe("claim", function () {
        it('successful claim', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);
        });

        it('event emitted', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await expect(altContract.claim()).to.emit(altContract, "KswapClaimed").withArgs(altAddr.address, kswapOut);

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);
        });

        it('claiming not enabled', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: Claiming is not allowed');
        });

        it('KSWAP already claimed', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);

            // Try to claim again
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: No KSWAP to claim');
        });

        it('Insufficient UNI', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken;
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni.sub(new BigNumber.from(1)));
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: Insufficient UNI or SUSHI balance');
        });

        it('Insufficient SUSHI', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = ethers.BigNumber.from('0');
            const requiredSushi = oneToken
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi.sub(new BigNumber.from(1)));

            // Claim
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: Insufficient UNI or SUSHI balance');
        });

        it('Insufficient UNI and insufficient SUSHI', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = ethers.BigNumber.from('100000');
            const requiredSushi = ethers.BigNumber.from('500000');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni.sub(new BigNumber.from(1)));
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi.sub(new BigNumber.from(1)));

            // Claim
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: Insufficient UNI or SUSHI balance');
        });

        it('Excess UNI', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni.add(new BigNumber.from(100)));
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);
        });

        it('Excess SUSHI', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = ethers.BigNumber.from('0');
            const requiredSushi = oneToken.mul(5000)
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi.add(new BigNumber.from(100)));

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);
        });

        it('Only UNI required', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);
        });

        it('Only SUSHI required', async function () {
// Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = ethers.BigNumber.from('0');
            const requiredSushi = oneToken.mul(432)
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);
        });

        it('UNI and SUSHI required', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('543254243');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);
        });

        it('Nothing to claim', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('0');
            const requiredUni = ethers.BigNumber.from('0');
            const requiredSushi = ethers.BigNumber.from('0');

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Attempt claim
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: No KSWAP to claim');
        });

        it('Nothing to claim but balances present', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('0');
            const requiredUni = ethers.BigNumber.from('1000');
            const requiredSushi = ethers.BigNumber.from('54350');

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Attempt claim
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: No KSWAP to claim');
        });

        it('Multiple successful claims', async function () {
            [ , altAddr, addr3] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            altContract2 = await this.airdrop.connect(addr3);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);
            await this.airdrop.whitelistAddress(addr3.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(addr3.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Check balance starts at 0

            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);
            expect(await this.kswap.balanceOf(addr3.getAddress())).to.equal(0);

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await altContract.claim();
            await altContract2.claim();


            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);
            expect(await this.kswap.balanceOf(addr3.getAddress())).to.equal(kswapOut);
        });
    });

    //////////////////////////////
    //     whitelistAddress
    //////////////////////////////
    describe("whitelistAddress", function () {
        it('Add address only UNI', async function () {
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            await this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(kswapOut);
        });

        it('Add address only SUSHI', async function () {
            const kswapOut = ethers.BigNumber.from('500');
            const requiredUni = ethers.BigNumber.from('0');
            const requiredSushi = ethers.BigNumber.from('10000');

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            await this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(kswapOut);
        });

        it('Add address UNI and SUSHI', async function () {
            const kswapOut = ethers.BigNumber.from('2000');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('20000');

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            await this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(kswapOut);
        });

        it('Exceeds KSWAP supply', async function () {
            const kswapOut = ethers.BigNumber.from('1') + AIRDROP_SUPPLY;
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            await expect(this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut)).to.be.revertedWith(
                'Airdrop::whitelistAddress: Exceeds KSWAP allocation'
            );
        });

        it('Exceeds KSWAP supply cummulatively', async function () {
            const kswapOut = AIRDROP_SUPPLY.sub(new BigNumber.from(1));
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            await this.airdrop.whitelistAddress(OWNER_ADDRESS, kswapOut);

            await expect(this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut)).to.be.revertedWith(
                'Airdrop::whitelistAddress: Exceeds KSWAP allocation'
            );
        });

        it('Unauthorized call', async function () {
            const kswapOut = AIRDROP_SUPPLY;
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);

            await expect(altContract.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut)).to.be.revertedWith(
                'Airdrop::whitelistAddress: unauthorized'
            );
        });

        it('No KSWAP', async function () {
            const kswapOut = ethers.BigNumber.from('0');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            await expect(this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut)).to.be.revertedWith(
                'Airdrop::whitelistAddress: No KSWAP to allocated'
            );
        });

        it('Whitelist multiple', async function () {
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            expect(await this.airdrop.withdrawAmount(OWNER_ADDRESS)).to.equal(0);

            await this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut);
            await this.airdrop.whitelistAddress(OWNER_ADDRESS, kswapOut);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(kswapOut);

            expect(await this.airdrop.withdrawAmount(OWNER_ADDRESS)).to.equal(kswapOut);
        });

        it('Address added twice', async function () {
            const kswapOut = ethers.BigNumber.from('2000');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('20000');

            await this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut);
            await expect(this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut)).to.be.revertedWith(
                'Airdrop::whitelistAddress: address already added'
            );

        });

        it('Claiming in session', async function () {
            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Attempt to whitelist address
            const kswapOut = ethers.BigNumber.from('2000');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('20000');

            await expect(this.airdrop.whitelistAddress(UNPRIVILEGED_ADDRESS, kswapOut)).to.be.revertedWith(
                'Airdrop::whitelistAddress: claiming in session'
            );
        });
    });

    //////////////////////////////
    //    whitelistAddresses
    //////////////////////////////
    describe("whitelistAddresses", function () {
        it('Add single address', async function () {
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            await this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS], [kswapOut]);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(kswapOut);
        });

        it('Add multiple addresses', async function () {
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            const kswapOut2 = ethers.BigNumber.from('543');
            const requiredUni2 = ethers.BigNumber.from('453');
            const requiredSushi2 = ethers.BigNumber.from('78654');

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            expect(await this.airdrop.withdrawAmount(OWNER_ADDRESS)).to.equal(0);

            await this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS, OWNER_ADDRESS],
                [kswapOut, kswapOut2]);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(kswapOut);

            expect(await this.airdrop.withdrawAmount(OWNER_ADDRESS)).to.equal(kswapOut2);
        });

        it('Exceeds KSWAP supply cummulatively', async function () {
            const kswapOut = AIRDROP_SUPPLY;
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            await expect(this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS, OWNER_ADDRESS],
                [kswapOut, kswapOut])).to.be.revertedWith(
                'Airdrop::whitelistAddress: Exceeds KSWAP allocation'
            );
        });

        it('Unauthorized call', async function () {
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);

            await expect(altContract.whitelistAddresses([UNPRIVILEGED_ADDRESS], [kswapOut])).to.be.revertedWith(
                'Airdrop::whitelistAddresses: unauthorized'
            );
        });

        it('Address added twice', async function () {
            const kswapOut = ethers.BigNumber.from('2000');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('20000');

            await expect(this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS, UNPRIVILEGED_ADDRESS],
                [kswapOut, kswapOut])).to.be.revertedWith(
                'Airdrop::whitelistAddress: address already added'
            );

        });

        it('Incorrect addr length', async function () {
            const kswapOut = ethers.BigNumber.from('2000');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('20000');

            await expect(this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS],
                [kswapOut, kswapOut])).to.be.revertedWith(
                'Airdrop::whitelistAddresses: incorrect array length'
            );
        });

        it('Incorrect kswap length', async function () {
            const kswapOut = ethers.BigNumber.from('2000');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('20000');

            await expect(this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS, OWNER_ADDRESS],
                [kswapOut])).to.be.revertedWith(
                'Airdrop::whitelistAddresses: incorrect array length'
            );
        });

    });

    //////////////////////////////
    //       End-to-End
    //////////////////////////////
    describe("End-to-End", function () {
        it('Single claim', async function () {
            // Check balance starts at 0
            [ , altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');
            await this.airdrop.whitelistAddress(altAddr.getAddress(), kswapOut);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);

            // End claiming
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(AIRDROP_SUPPLY.sub(kswapOut));
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(0);
        });

        it('Multiple claims', async function () {
            // Check balance starts at 0
            [ , altAddr, addr3] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            altContract2 = await this.airdrop.connect(addr3);
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(0);
            expect(await this.kswap.balanceOf(addr3.getAddress())).to.equal(0);

            // Whitelist address
            const kswapOut = ethers.BigNumber.from('100');
            const kswapOut2 = ethers.BigNumber.from('4326543');
            const requiredUni = oneToken.mul(1000);
            const requiredSushi = ethers.BigNumber.from('0');

            await this.airdrop.whitelistAddresses([altAddr.getAddress(), addr3.getAddress()], [kswapOut, kswapOut2]);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(kswapOut);
            expect(await this.airdrop.withdrawAmount(addr3.getAddress())).to.equal(kswapOut2);

            // Enable claiming
            await this.kswap.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Mock UNI and SUSHI balances
            await this.mockUni.givenMethodReturnUint(balanceOf, requiredUni);
            await this.mockSushi.givenMethodReturnUint(balanceOf, requiredSushi);

            // Claim
            await altContract.claim();
            await altContract2.claim();

            // Check balance has increased
            expect(await this.kswap.balanceOf(altAddr.getAddress())).to.equal(kswapOut);
            expect(await this.kswap.balanceOf(addr3.getAddress())).to.equal(kswapOut2);

            // End claiming
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.kswap.balanceOf(TREASURY)).to.equal(AIRDROP_SUPPLY.sub(kswapOut).sub(kswapOut2));
            expect(await this.kswap.balanceOf(this.airdrop.address)).to.equal(0);
        });
    });
});