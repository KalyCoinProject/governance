// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

/**
 *  Contract for administering the Airdrop of KSWAP to UNI and SUSHI holders.
 *  26.9 million KSWAP will be made available in the airdrop. After the
 *  Airdrop period is over, all unclaimed KSWAP will be transferred to the
 *  community treasury.
 */
contract Airdrop {
    // token addresses
    address public kswap;
    address public uni;
    address public sushi;

    address public owner;
    address public remainderDestination;

    // amount of KSWAP to transfer
    mapping (address => uint96) public withdrawAmount;

    uint public totalAllocated;

    bool public claimingAllowed;

    uint constant public TOTAL_AIRDROP_SUPPLY = 26_000_000e18;

    // Events
    event ClaimingAllowed();
    event ClaimingOver();
    event KswapClaimed(address claimer, uint amount);

    /**
     * Initializes the contract. Sets token addresses, owner, and leftover token
     * destination. Claiming period is not enabled.
     *
     * @param kswap_ the KSWAP token contract address
     * @param uni_ the UNI token contract address
     * @param sushi_ the SUSHI token contract address
     * @param owner_ the privileged contract owner
     * @param remainderDestination_ address to transfer remaining KSWAP to when
     *     claiming ends. Should be community treasury.
     */
    constructor(address kswap_,
                address uni_,
                address sushi_,
                address owner_,
                address remainderDestination_) {
        kswap = kswap_;
        uni = uni_;
        sushi = sushi_;
        owner = owner_;
        remainderDestination = remainderDestination_;
        claimingAllowed = false;
        totalAllocated = 0;
    }

    /**
     * Changes the address that receives the remaining KSWAP at the end of the
     * claiming period. Can only be set by the contract owner.
     *
     * @param remainderDestination_ address to transfer remaining KSWAP to when
     *     claiming ends.
     */
    function setRemainderDestination(address remainderDestination_) external {
        require(msg.sender == owner, 'Airdrop::setRemainderDestination: unauthorized');
        remainderDestination = remainderDestination_;
    }

    /**
     * Changes the contract owner. Can only be set by the contract owner.
     *
     * @param owner_ new contract owner address
     */
    function setowner(address owner_) external {
        require(msg.sender == owner, 'Airdrop::setowner: unauthorized');
        owner = owner_;
    }

    /**
     * Enable the claiming period and allow user to claim KSWAP. Before activation,
     * this contract must have a KSWAP balance equal to the total airdrop KSWAP
     * supply of 16.9 million KSWAP. All claimable KSWAP tokens must be whitelisted
     * before claiming is enabled. Only callable by the owner.
     */
    function allowClaiming() external {
        require(IKSWAP(kswap).balanceOf(address(this)) >= TOTAL_AIRDROP_SUPPLY, 'Airdrop::allowClaiming: incorrect KSWAP supply');
        require(msg.sender == owner, 'Airdrop::allowClaiming: unauthorized');
        claimingAllowed = true;
        emit ClaimingAllowed();
    }

    /**
     * End the claiming period. All unclaimed KSWAP will be transferred to the address
     * specified by remainderDestination. Can only be called by the owner.
     */
    function endClaiming() external {
        require(msg.sender == owner, 'Airdrop::endClaiming: unauthorized');
        require(claimingAllowed, "Airdrop::endClaiming: Claiming not started");

        claimingAllowed = false;
        emit ClaimingOver();

        // Transfer remainder
        uint amount = IKSWAP(kswap).balanceOf(address(this));
        require(IKSWAP(kswap).transfer(remainderDestination, amount), 'Airdrop::endClaiming: Transfer failed');
    }

    /**
     * Withdraw your KSWAP. In order to qualify for a withdrawl, the caller's address
     * must be whitelisted. In addition, the calling address must have one whole UNI
     * or SUSHI token. All KSWAP must be claimed at once. Only the full amount can be
     * claimed and only one claim is allowed per user.
     */
    function claim() external {
        // tradeoff: if you only transfer one but you held both, you can't claim
        require(claimingAllowed, 'Airdrop::claim: Claiming is not allowed');
        require(withdrawAmount[msg.sender] > 0, 'Airdrop::claim: No KSWAP to claim');

        uint oneToken = 1e18;
        require(IUni(uni).balanceOf(msg.sender) >= oneToken || ISushi(sushi).balanceOf(msg.sender) >= oneToken,
            'Airdrop::claim: Insufficient UNI or SUSHI balance');

        uint amountToClaim = withdrawAmount[msg.sender];
        withdrawAmount[msg.sender] = 0;

        emit KswapClaimed(msg.sender, amountToClaim);

        require(IKSWAP(kswap).transfer(msg.sender, amountToClaim), 'Airdrop::claim: Transfer failed');
    }

    /**
     * Whitelist an address to claim KSWAP. Specify the amount of KSWAP to be allocated.
     * That address will then be able to claim that amount of KSWAP during the claiming
     * period if it has sufficient UNI and SUSHI balance. The transferrable amount of
     * KSWAP must be nonzero. Total amount allocated must be less than or equal to the
     * total airdrop supply. Whitelisting must occur before the claiming period is
     * enabled. Addresses may only be added one time. Only called by the owner.
     *
     * @param addr address that may claim KSWAP
     * @param kswapOut the amount of KSWAP that addr may withdraw
     */
    function whitelistAddress(address addr, uint96 kswapOut) public {
        require(msg.sender == owner, 'Airdrop::whitelistAddress: unauthorized');
        require(!claimingAllowed, 'Airdrop::whitelistAddress: claiming in session');
        require(kswapOut > 0, 'Airdrop::whitelistAddress: No KSWAP to allocated');
        require(withdrawAmount[addr] == 0, 'Airdrop::whitelistAddress: address already added');

        withdrawAmount[addr] = kswapOut;

        totalAllocated = totalAllocated + kswapOut;
        require(totalAllocated <= TOTAL_AIRDROP_SUPPLY, 'Airdrop::whitelistAddress: Exceeds KSWAP allocation');
    }

    /**
     * Whitelist multiple addresses in one call. Wrapper around whitelistAddress.
     * All parameters are arrays. Each array must be the same length. Each index
     * corresponds to one (address, kswap) tuple. Only callable by the owner.
     */
    function whitelistAddresses(address[] memory addrs, uint96[] memory kswapOuts) external {
        require(msg.sender == owner, 'Airdrop::whitelistAddresses: unauthorized');
        require(addrs.length == kswapOuts.length,
                'Airdrop::whitelistAddresses: incorrect array length');
        for (uint i = 0; i < addrs.length; i++) {
            whitelistAddress(addrs[i], kswapOuts[i]);
        }
    }
}

interface IKSWAP {
    function balanceOf(address account) external view returns (uint);
    function transfer(address dst, uint rawAmount) external returns (bool);
}

interface IUni {
    function balanceOf(address account) external view returns (uint);
}

interface ISushi {
    function balanceOf(address account) external view returns (uint);
}