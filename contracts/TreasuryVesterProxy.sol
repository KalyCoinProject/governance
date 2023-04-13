pragma solidity 0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITreasuryVester {
    function claim() external returns (uint);
    function recipient() external returns (address);
}

interface IMiniChefV2 {
    function fundRewards(uint256 newFunding, uint256 duration) external;
}

// SPDX-License-Identifier: MIT

contract TreasuryVesterProxy is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public kswap;
    ITreasuryVester public treasuryVester;
    IMiniChefV2 public chef;
    address public treasury;

    uint constant KSWAP_INITIAL_MAX_SUPPLY = 538_000_000e18;
    uint constant KSWAP_NEW_MAX_SUPPLY = 230_000_000e18;
    uint constant TREASURY_TARGET_BALANCE = 30_000_000e18;
    uint constant KSWAP_VESTING_CLIFF = 86_400;
    uint constant DIVERSION_STEP = 1_000e18;
    address constant BURN_ADDRESS = address(0x000000000000000000000000000000000000dEaD);

    bool initialized;
    uint public kswapVested;

    uint public distributionCount;

    uint public treasuryDiversionRemaining;

    uint public diversionAmount;
    uint public diversionGain;

    constructor(address _kswap, address _treasuryVester, address _treasury, address _chef) {
        require(
            _kswap != address(0)
            && _treasuryVester != address(0)
            && _treasury != address(0)
            && _chef != address(0),
            "TreasuryVesterProxy::Cannot construct with zero address"
        );

        kswap = IERC20(_kswap);
        treasuryVester = ITreasuryVester(_treasuryVester);
        treasury = _treasury;
        chef = IMiniChefV2(_chef);
    }

    function init() external onlyOwner {
        require(treasuryVester.recipient() == address(this), "TreasuryVesterProxy::Invalid treasury vester recipient");

        uint unvestedKswap = kswap.balanceOf(address(treasuryVester));
        uint treasuryBalance = kswap.balanceOf(treasury);

        // KSWAP that has already been vested
        kswapVested = KSWAP_INITIAL_MAX_SUPPLY - unvestedKswap;

        // KSWAP that should be diverted to the treasury to reach the target balance
        treasuryDiversionRemaining = TREASURY_TARGET_BALANCE - treasuryBalance;

        // Required for chef.fundRewards()
        kswap.approve(address(chef), type(uint256).max);

        initialized = true;
    }

    function claimAndDistribute() external {
        require(initialized == true, "TreasuryVesterProxy::Not initialized");
        uint vestedAmountRemaining = treasuryVester.claim();
        require(vestedAmountRemaining > 0, "TreasuryVesterProxy::Nothing vested");

        // Increase rate of diversion gain once every 300 days
        if (distributionCount % 300 == 0) {
            diversionGain += DIVERSION_STEP;
        }

        // Increase diversion every 30 days
        if (distributionCount % 30 == 0) {
            diversionAmount += diversionGain;
        }

        // Clamps diversionAmount to [1, vestedAmountRemaining]
        if (diversionAmount > vestedAmountRemaining) {
            diversionAmount = vestedAmountRemaining;
        }

        uint treasuryAmountMax = (diversionAmount > treasuryDiversionRemaining)
            ? treasuryDiversionRemaining // Avoid overfunding Treasury
            : diversionAmount;
        uint chefAmountMax = vestedAmountRemaining - diversionAmount;

        if (treasuryDiversionRemaining > 0) {
            uint treasuryAmount = kswapVested + treasuryAmountMax > KSWAP_NEW_MAX_SUPPLY
                ? KSWAP_NEW_MAX_SUPPLY - kswapVested // Avoid overvesting KSWAP
                : treasuryAmountMax;

            kswapVested += treasuryAmount;
            vestedAmountRemaining -= treasuryAmount;
            treasuryDiversionRemaining -= treasuryAmount;
            kswap.safeTransfer(treasury, treasuryAmount);
        }

        if (kswapVested < KSWAP_NEW_MAX_SUPPLY) {
            uint chefAmount = (kswapVested + chefAmountMax > KSWAP_NEW_MAX_SUPPLY)
                ? KSWAP_NEW_MAX_SUPPLY - kswapVested // Avoid overvesting KSWAP
                : chefAmountMax;

            if (chefAmount > 0) {
                kswapVested += chefAmount;
                vestedAmountRemaining -= chefAmount;
                chef.fundRewards(chefAmount, KSWAP_VESTING_CLIFF);
            }
        }

        if (vestedAmountRemaining > 0) {
            // Logical burn since KSWAP cannot be sent to the 0 address
            kswap.safeTransfer(BURN_ADDRESS, vestedAmountRemaining);
        }

        distributionCount++;
    }

}
