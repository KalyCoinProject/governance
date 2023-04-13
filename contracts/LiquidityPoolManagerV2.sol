pragma solidity ^0.7.6;

import "openzeppelin-contracts-legacy/access/Ownable.sol";
import "openzeppelin-contracts-legacy/math/SafeMath.sol";
import "openzeppelin-contracts-legacy/utils/EnumerableSet.sol";
import "openzeppelin-contracts-legacy/utils/ReentrancyGuard.sol";

import "./StakingRewards.sol";

/**
 * Contract to distribute KSWAP tokens to whitelisted trading pairs. After deploying,
 * whitelist the desired pairs and set the klcKswapPair. When initial administration
 * is complete. Ownership should be transferred to the Timelock governance contract.
 */
contract LiquidityPoolManagerV2 is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint;

    // Whitelisted pairs that offer KSWAP rewards
    // Note: KLC/KSWAP is an KLC pair
    EnumerableSet.AddressSet private klcPairs;
    EnumerableSet.AddressSet private kswapPairs;

    // Maps pairs to their associated StakingRewards contract
    mapping(address => address) public stakes;

    // Map of pools to weights
    mapping(address => uint) public weights;

    // Fields to control potential fee splitting
    bool public splitPools;
    uint public klcSplit;
    uint public kswapSplit;

    // Known contract addresses for WKLC and KSWAP
    address public wklc;
    address public kswap;

    // KLC/KSWAP pair used to determine KSWAP liquidity
    address public klcKswapPair;

    // TreasuryVester contract that distributes KSWAP
    address public treasuryVester;

    uint public numPools = 0;

    bool private readyToDistribute = false;

    // Tokens to distribute to each pool. Indexed by klcPairs then kswapPairs.
    uint[] public distribution;

    uint public unallocatedKswap = 0;

    constructor(address wklc_,
                address kswap_,
                address treasuryVester_) {
        require(wklc_ != address(0) && kswap_ != address(0) && treasuryVester_ != address(0),
                "LiquidityPoolManager::constructor: Arguments can't be the zero address");
        wklc = wklc_;
        kswap = kswap_;
        treasuryVester = treasuryVester_;
    }

    /**
     * Check if the given pair is a whitelisted pair
     *
     * Args:
     *   pair: pair to check if whitelisted
     *
     * Return: True if whitelisted
     */
    function isWhitelisted(address pair) public view returns (bool) {
        return klcPairs.contains(pair) || kswapPairs.contains(pair);
    }

    /**
     * Check if the given pair is a whitelisted KLC pair. The KLC/KSWAP pair is
     * considered an KLC pair.
     *
     * Args:
     *   pair: pair to check
     *
     * Return: True if whitelisted and pair contains KLC
     */
    function isKlcPair(address pair) external view returns (bool) {
        return klcPairs.contains(pair);
    }

    /**
     * Check if the given pair is a whitelisted KSWAP pair. The KLC/KSWAP pair is
     * not considered a KSWAP pair.
     *
     * Args:
     *   pair: pair to check
     *
     * Return: True if whitelisted and pair contains KSWAP but is not KLC/KSWAP pair
     */
    function isKswapPair(address pair) external view returns (bool) {
        return kswapPairs.contains(pair);
    }

    /**
     * Sets the KLC/KSWAP pair. Pair's tokens must be KLC and KSWAP.
     *
     * Args:
     *   pair: KLC/KSWAP pair
     */
    function setKlcKswapPair(address klcKswapPair_) external onlyOwner {
        require(klcKswapPair_ != address(0), 'LiquidityPoolManager::setKlcKswapPair: Pool cannot be the zero address');
        klcKswapPair = klcKswapPair_;
    }

    /**
     * Adds a new whitelisted liquidity pool pair. Generates a staking contract.
     * Liquidity providers may stake this liquidity provider reward token and
     * claim KSWAP rewards proportional to their stake. Pair must contain either
     * KLC or KSWAP. Associates a weight with the pair. Rewards are distributed
     * to the pair proportionally based on its share of the total weight.
     *
     * Args:
     *   pair: pair to whitelist
     *   weight: how heavily to distribute rewards to this pool relative to other
     *     pools
     */
    function addWhitelistedPool(address pair, uint weight) external onlyOwner {
        require(!readyToDistribute,
                'LiquidityPoolManager::addWhitelistedPool: Cannot add pool between calculating and distributing returns');
        require(pair != address(0), 'LiquidityPoolManager::addWhitelistedPool: Pool cannot be the zero address');
        require(isWhitelisted(pair) == false, 'LiquidityPoolManager::addWhitelistedPool: Pool already whitelisted');
        require(weight > 0, 'LiquidityPoolManager::addWhitelistedPool: Weight cannot be zero');

        address token0 = IKalyswapPair(pair).token0();
        address token1 = IKalyswapPair(pair).token1();

        require(token0 != token1, 'LiquidityPoolManager::addWhitelistedPool: Tokens cannot be identical');

        // Create the staking contract and associate it with the pair
        address stakeContract = address(new StakingRewards(kswap, pair));
        stakes[pair] = stakeContract;

        weights[pair] = weight;

        // Add as an KLC or KSWAP pair
        if (token0 == kswap || token1 == kswap) {
            require(kswapPairs.add(pair), 'LiquidityPoolManager::addWhitelistedPool: Pair add failed');
        } else if (token0 == wklc || token1 == wklc) {
            require(klcPairs.add(pair), 'LiquidityPoolManager::addWhitelistedPool: Pair add failed');
        } else {
            // The governance contract can be used to deploy an altered
            // LiquidityPoolManager if non-KLC/KSWAP pools are desired.
            revert("LiquidityPoolManager::addWhitelistedPool: No KLC or KSWAP in the pair");
        }

        numPools = numPools.add(1);
    }

    /**
     * Delists a whitelisted pool. Liquidity providers will not receiving future rewards.
     * Already vested funds can still be claimed. Re-whitelisting a delisted pool will
     * deploy a new staking contract.
     *
     * Args:
     *   pair: pair to remove from whitelist
     */
    function removeWhitelistedPool(address pair) external onlyOwner {
        require(!readyToDistribute,
                'LiquidityPoolManager::removeWhitelistedPool: Cannot remove pool between calculating and distributing returns');
        require(isWhitelisted(pair), 'LiquidityPoolManager::removeWhitelistedPool: Pool not whitelisted');

        address token0 = IKalyswapPair(pair).token0();
        address token1 = IKalyswapPair(pair).token1();

        stakes[pair] = address(0);
        weights[pair] = 0;

        if (token0 == kswap || token1 == kswap) {
            require(kswapPairs.remove(pair), 'LiquidityPoolManager::removeWhitelistedPool: Pair remove failed');
        } else {
            require(klcPairs.remove(pair), 'LiquidityPoolManager::removeWhitelistedPool: Pair remove failed');
        }
        numPools = numPools.sub(1);
    }

    /**
     * Adjust the weight of an existing pool
     *
     * Args:
     *   pair: pool to adjust weight of
     *   weight: new weight
     */
    function changeWeight(address pair, uint weight) external onlyOwner {
        require(weights[pair] > 0, 'LiquidityPoolManager::changeWeight: Pair not whitelisted');
        require(weight > 0, 'LiquidityPoolManager::changeWeight: Remove pool instead');
        weights[pair] = weight;
    }

    /**
     * Activates the fee split mechanism. Divides rewards between KLC
     * and KSWAP pools regardless of liquidity. KLC and KSWAP pools will
     * receive a fixed proportion of the pool rewards. The KLC and KSWAP
     * splits should correspond to percentage of rewards received for
     * each and must add up to 100. For the purposes of fee splitting,
     * the KLC/KSWAP pool is a KSWAP pool. This method can also be used to
     * change the split ratio after fee splitting has been activated.
     *
     * Args:
     *   klcSplit: Percent of rewards to distribute to KLC pools
     *   kswapSplit: Percent of rewards to distribute to KSWAP pools
     */
    function activateFeeSplit(uint klcSplit_, uint kswapSplit_) external onlyOwner {
        require(klcSplit_.add(kswapSplit_) == 100, "LiquidityPoolManager::activateFeeSplit: Split doesn't add to 100");
        require(!(klcSplit_ == 100 || kswapSplit_ == 100), "LiquidityPoolManager::activateFeeSplit: Split can't be 100/0");
        splitPools = true;
        klcSplit = klcSplit_;
        kswapSplit = kswapSplit_;
    }

    /**
     * Deactivates fee splitting.
     */
    function deactivateFeeSplit() external onlyOwner {
        require(splitPools, "LiquidityPoolManager::deactivateFeeSplit: Fee split not activated");
        splitPools = false;
        klcSplit = 0;
        kswapSplit = 0;
    }

    /**
     * Calculates the amount of liquidity in the pair. For an KLC pool, the liquidity in the
     * pair is two times the amount of KLC. Only works for KLC pairs.
     *
     * Args:
     *   pair: KLC pair to get liquidity in
     *
     * Returns: the amount of liquidity in the pool in units of KLC
     */
    function getKlcLiquidity(address pair) public view returns (uint) {
        (uint reserve0, uint reserve1, ) = IKalyswapPair(pair).getReserves();

        uint liquidity = 0;

        // add the klc straight up
        if (IKalyswapPair(pair).token0() == wklc) {
            liquidity = liquidity.add(reserve0);
        } else {
            require(IKalyswapPair(pair).token1() == wklc, 'LiquidityPoolManager::getKlcLiquidity: One of the tokens in the pair must be WKLC');
            liquidity = liquidity.add(reserve1);
        }
        liquidity = liquidity.mul(2);
        return liquidity;
    }

    /**
     * Calculates the amount of liquidity in the pair. For a KSWAP pool, the liquidity in the
     * pair is two times the amount of KSWAP multiplied by the price of KLC per KSWAP. Only
     * works for KSWAP pairs.
     *
     * Args:
     *   pair: KSWAP pair to get liquidity in
     *   conversionFactor: the price of KLC to KSWAP
     *
     * Returns: the amount of liquidity in the pool in units of KLC
     */
    function getKswapLiquidity(address pair, uint conversionFactor) public view returns (uint) {
        (uint reserve0, uint reserve1, ) = IKalyswapPair(pair).getReserves();

        uint liquidity = 0;

        // add the kswap straight up
        if (IKalyswapPair(pair).token0() == kswap) {
            liquidity = liquidity.add(reserve0);
        } else {
            require(IKalyswapPair(pair).token1() == kswap, 'LiquidityPoolManager::getKswapLiquidity: One of the tokens in the pair must be KSWAP');
            liquidity = liquidity.add(reserve1);
        }

        uint oneToken = 1e18;
        liquidity = liquidity.mul(conversionFactor).mul(2).div(oneToken);
        return liquidity;
    }

    /**
     * Calculates the price of swapping KLC for 1 KSWAP
     *
     * Returns: the price of swapping KLC for 1 KSWAP
     */
    function getKlcKswapRatio() public view returns (uint conversionFactor) {
        require(!(klcKswapPair == address(0)), "LiquidityPoolManager::getKlcKswapRatio: No KLC-KSWAP pair set");
        (uint reserve0, uint reserve1, ) = IKalyswapPair(klcKswapPair).getReserves();

        if (IKalyswapPair(klcKswapPair).token0() == wklc) {
            conversionFactor = quote(reserve1, reserve0);
        } else {
            conversionFactor = quote(reserve0, reserve1);
        }
    }

    /**
     * Determine how the vested KSWAP allocation will be distributed to the liquidity
     * pool staking contracts. Must be called before distributeTokens(). Tokens are
     * distributed to pools based on relative liquidity proportional to total
     * liquidity. Should be called after vestAllocation()/
     */
    function calculateReturns() public {
        require(!readyToDistribute, 'LiquidityPoolManager::calculateReturns: Previous returns not distributed. Call distributeTokens()');
        require(unallocatedKswap > 0, 'LiquidityPoolManager::calculateReturns: No KSWAP to allocate. Call vestAllocation().');
        if (kswapPairs.length() > 0) {
            require(!(klcKswapPair == address(0)), 'LiquidityPoolManager::calculateReturns: Klc/KSWAP Pair not set');
        }

        // Calculate total liquidity
        distribution = new uint[](numPools);
        uint klcLiquidity = 0;
        uint kswapLiquidity = 0;

        // Add liquidity from KLC pairs
        for (uint i = 0; i < klcPairs.length(); i++) {
            address pair = klcPairs.at(i);
            uint pairLiquidity = getKlcLiquidity(pair);
            uint weightedLiquidity = pairLiquidity.mul(weights[pair]);
            distribution[i] = weightedLiquidity;
            klcLiquidity = SafeMath.add(klcLiquidity, weightedLiquidity);
        }

        // Add liquidity from KSWAP pairs
        if (kswapPairs.length() > 0) {
            uint conversionRatio = getKlcKswapRatio();
            for (uint i = 0; i < kswapPairs.length(); i++) {
                address pair = kswapPairs.at(i);
                uint pairLiquidity = getKswapLiquidity(pair, conversionRatio);
                uint weightedLiquidity = pairLiquidity.mul(weights[pair]);
                distribution[i + klcPairs.length()] = weightedLiquidity;
                kswapLiquidity = SafeMath.add(kswapLiquidity, weightedLiquidity);
            }
        }

        // Calculate tokens for each pool
        uint transferred = 0;
        if (splitPools) {
            uint klcAllocatedKswap = unallocatedKswap.mul(klcSplit).div(100);
            uint kswapAllocatedKswap = unallocatedKswap.sub(klcAllocatedKswap);

            for (uint i = 0; i < klcPairs.length(); i++) {
                uint pairTokens = distribution[i].mul(klcAllocatedKswap).div(klcLiquidity);
                distribution[i] = pairTokens;
                transferred = transferred.add(pairTokens);
            }

            if (kswapPairs.length() > 0) {
                uint conversionRatio = getKlcKswapRatio();
                for (uint i = 0; i < kswapPairs.length(); i++) {
                    uint pairTokens = distribution[i + klcPairs.length()].mul(kswapAllocatedKswap).div(kswapLiquidity);
                    distribution[i + klcPairs.length()] = pairTokens;
                    transferred = transferred.add(pairTokens);
                }
            }
        } else {
            uint totalLiquidity = klcLiquidity.add(kswapLiquidity);

            for (uint i = 0; i < distribution.length; i++) {
                uint pairTokens = distribution[i].mul(unallocatedKswap).div(totalLiquidity);
                distribution[i] = pairTokens;
                transferred = transferred.add(pairTokens);
            }
        }
        readyToDistribute = true;
    }

    /**
     * After token distributions have been calculated, actually distribute the vested KSWAP
     * allocation to the staking pools. Must be called after calculateReturns().
     */
    function distributeTokens() public nonReentrant {
        require(readyToDistribute, 'LiquidityPoolManager::distributeTokens: Previous returns not allocated. Call calculateReturns()');
        readyToDistribute = false;
        address stakeContract;
        uint rewardTokens;
        for (uint i = 0; i < distribution.length; i++) {
            if (i < klcPairs.length()) {
                stakeContract = stakes[klcPairs.at(i)];
            } else {
                stakeContract = stakes[kswapPairs.at(i - klcPairs.length())];
            }
            rewardTokens = distribution[i];
            if (rewardTokens > 0) {
                require(IKSWAP(kswap).transfer(stakeContract, rewardTokens), 'LiquidityPoolManager::distributeTokens: Transfer failed');
                StakingRewards(stakeContract).notifyRewardAmount(rewardTokens);
            }
        }
        unallocatedKswap = 0;
    }

    /**
     * Fallback for distributeTokens in case of gas overflow. Distributes KSWAP tokens to a single pool.
     * distibuteTokens() must still be called once to reset the contract state before calling vestAllocation.
     *
     * Args:
     *   pairIndex: index of pair to distribute tokens to, KLC pairs come first in the ordering
     */
    function distributeTokensSinglePool(uint pairIndex) external nonReentrant {
        require(readyToDistribute, 'LiquidityPoolManager::distributeTokensSinglePool: Previous returns not allocated. Call calculateReturns()');
        require(pairIndex < numPools, 'LiquidityPoolManager::distributeTokensSinglePool: Index out of bounds');

        address stakeContract;
        if (pairIndex < klcPairs.length()) {
            stakeContract = stakes[klcPairs.at(pairIndex)];
        } else {
            stakeContract = stakes[kswapPairs.at(pairIndex - klcPairs.length())];
        }

        uint rewardTokens = distribution[pairIndex];
        if (rewardTokens > 0) {
            distribution[pairIndex] = 0;
            require(IKSWAP(kswap).transfer(stakeContract, rewardTokens), 'LiquidityPoolManager::distributeTokens: Transfer failed');
            StakingRewards(stakeContract).notifyRewardAmount(rewardTokens);
        }
    }

    /**
     * Calculate pool token distribution and distribute tokens. Methods are separate
     * to use risk of approaching the gas limit. There must be vested tokens to
     * distribute, so this method should be called after vestAllocation.
     */
    function calculateAndDistribute() external {
        calculateReturns();
        distributeTokens();
    }

    /**
     * Claim today's vested tokens for the manager to distribute. Moves tokens from
     * the TreasuryVester to the LiquidityPoolManager. Can only be called if all
     * previously allocated tokens have been distributed. Call distributeTokens() if
     * that is not the case. If any additional KSWAP tokens have been transferred to this
     * this contract, they will be marked as unallocated and prepared for distribution.
     */
    function vestAllocation() external nonReentrant {
        require(unallocatedKswap == 0, 'LiquidityPoolManager::vestAllocation: Old KSWAP is unallocated. Call distributeTokens().');
        unallocatedKswap = ITreasuryVester(treasuryVester).claim();
        require(unallocatedKswap > 0, 'LiquidityPoolManager::vestAllocation: No KSWAP to claim. Try again tomorrow.');

        // Check if we've received extra tokens or didn't receive enough
        uint actualBalance = IKSWAP(kswap).balanceOf(address(this));
        require(actualBalance >= unallocatedKswap, "LiquidityPoolManager::vestAllocation: Insufficient KSWAP transferred");
        unallocatedKswap = actualBalance;
    }

    /**
     * Calculate the equivalent of 1e18 of token A denominated in token B for a pair
     * with reserveA and reserveB reserves.
     *
     * Args:
     *   reserveA: reserves of token A
     *   reserveB: reserves of token B
     *
     * Returns: the amount of token B equivalent to 1e18 of token A
     */
    function quote(uint reserveA, uint reserveB) internal pure returns (uint amountB) {
        require(reserveA > 0 && reserveB > 0, 'KalyswapLibrary: INSUFFICIENT_LIQUIDITY');
        uint oneToken = 1e18;
        amountB = SafeMath.div(SafeMath.mul(oneToken, reserveB), reserveA);
    }

}

interface ITreasuryVester {
    function claim() external returns (uint);
}

interface IKSWAP {
    function balanceOf(address account) external view returns (uint);
    function transfer(address dst, uint rawAmount) external returns (bool);
}

interface IKalyswapPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function factory() external view returns (address);
    function balanceOf(address owner) external view returns (uint);
    function transfer(address to, uint value) external returns (bool);
    function burn(address to) external returns (uint amount0, uint amount1);
    function getReserves() external view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast);
}
