// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.16;

import './BlockTimestamp.sol';

abstract contract PeripheryValidation is BlockTimestamp {
    modifier checkDeadline(uint256 deadline) {
        require(_blockTimestamp() <= deadline, 'Transaction too old');
        _;
    }
}