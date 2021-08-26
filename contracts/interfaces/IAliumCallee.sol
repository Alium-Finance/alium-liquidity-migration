// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6;

interface IAliumCallee {
    function aliumCall(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}
