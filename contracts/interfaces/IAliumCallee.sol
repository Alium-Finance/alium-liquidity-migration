// SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;

interface IAliumCallee {
    function aliumCall(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}
