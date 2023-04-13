pragma solidity ^0.5.16;

import "@kalycoinproject/exchange-contracts/contracts/kalyswap-core/KalyswapFactory.sol";
import "@kalycoinproject/exchange-contracts/contracts/kalyswap-core/KalyswapPair.sol";


contract PangFactory is KalyswapFactory {
    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }
}