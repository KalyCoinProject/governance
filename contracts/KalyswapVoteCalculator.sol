pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IMiniChefV2 {
    struct UserInfo {
        uint256 amount;
        int256 rewardDebt;
    }

    function lpTokens() external view returns (address[] memory);
    function userInfo(uint pid, address user) external view returns (IMiniChefV2.UserInfo memory);
}

interface IKalyswapPair {
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
}

interface IKalyswapERC20 {
    function balanceOf(address owner) external view returns (uint);
    function getCurrentVotes(address account) external view returns (uint);
    function delegates(address account) external view returns (address);
}

interface IStakingRewards {
    function stakingToken() external view returns (address);
    function balanceOf(address owner) external view returns (uint);
}

// SPDX-License-Identifier: MIT
contract KalyswapVoteCalculator is Ownable {

    IKalyswapERC20 kswap;
    IMiniChefV2 miniChef;

    constructor(address _kswap, address _miniChef) {
        kswap = IKalyswapERC20(_kswap);
        miniChef = IMiniChefV2(_miniChef);
    }

    function getVotesFromFarming(address voter, uint[] calldata pids) external view returns (uint votes) {
        address[] memory lpTokens = miniChef.lpTokens();

        for (uint i; i<pids.length; i++) {
            // Skip invalid pids
            if (pids[i] >= lpTokens.length) continue;

            address pglAddress = lpTokens[pids[i]];
            IKalyswapPair pair = IKalyswapPair(pglAddress);

            uint pair_total_KSWAP = kswap.balanceOf(pglAddress);
            uint pair_total_PGL = pair.totalSupply(); // Could initially be 0 in rare pre-mint situations

            uint PGL_hodling = pair.balanceOf(voter);
            uint PGL_staking = miniChef.userInfo(pids[i], voter).amount;

            votes += ((PGL_hodling + PGL_staking) * pair_total_KSWAP) / pair_total_PGL;
        }
    }

    function getVotesFromStaking(address voter, address[] calldata stakes) external view returns (uint votes) {
        for (uint i; i<stakes.length; i++) {
            IStakingRewards staking = IStakingRewards(stakes[i]);

            // Safety check to ensure staking token is KSWAP
            if (staking.stakingToken() == address(kswap)) {
                votes += staking.balanceOf(voter);
            }
        }
    }

    function getVotesFromWallets(address voter) external view returns (uint votes) {
        // Votes delegated to the voter
        votes += kswap.getCurrentVotes(voter);

        // Voter has never delegated
        if (kswap.delegates(voter) == address(0)) {
            votes += kswap.balanceOf(voter);
        }
    }

}
