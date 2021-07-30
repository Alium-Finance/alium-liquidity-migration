// SPDX-License-Identifier: MIT
pragma solidity >=0.6.2;
pragma abicoder v2;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { TransferHelper } from "./libraries/TransferHelper.sol";

import { IUniswapV2Router01 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";

import { IUniswapV3Factory } from '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import { IUniswapV3Pool, IUniswapV3PoolActions } from '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import { INonfungiblePositionManager } from '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';

import { IAliumRouter01 } from "./interfaces/IAliumRouter.sol";

/**
 * @title AliumVamp liquidity migrator.
 * @dev Contract to convert liquidity from uniswapV3 to aliumV1.1 router
 * (Uniswap/Mooniswap) to our pairs.
 */
contract AliumVampV2 is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // 10 minutes in blocks, ~3 sec per block
    uint256 public constant LIQUIDITY_DEADLINE = 10 * 20;

    IAliumRouter01 public ourRouter;

    event RouterChanged(address indexed oldRouter, address indexed newRouter);

    constructor(address _ourRouter) public {
        require(
            _ourRouter != address(0),
            "AliumVampV2: _ourRouter address should not be 0"
        );

        ourRouter = IAliumRouter01(_ourRouter);
    }

    /**
     * @dev Main function that converts third-party liquidity
     * (represented by LP-tokens) to our own LP-tokens
     */
    function deposit(address _uniV3PositionManager, uint256 _tokenId) external {
        (
            ,
            ,
            address token0,
            address token1,
            ,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,

        ) = INonfungiblePositionManager(_uniV3PositionManager).positions(_tokenId);

        INonfungiblePositionManager.CollectParams memory _collectParams;
        _collectParams.tokenId = _tokenId;
        _collectParams.recipient = address(this);
        _collectParams.amount0Max = type(uint128).max;
        _collectParams.amount1Max = type(uint128).max;

        INonfungiblePositionManager.DecreaseLiquidityParams memory _liquidityParams;
        _liquidityParams.tokenId = _tokenId;
        _liquidityParams.liquidity = liquidity;
        _liquidityParams.amount0Min = type(uint256).min;
        _liquidityParams.amount1Min = type(uint256).min;
        _liquidityParams.deadline = block.timestamp + LIQUIDITY_DEADLINE;

        // claim and remove liquidity from uniV3 pool
        (uint256 amount0, uint256 amount1) =
        INonfungiblePositionManager(_uniV3PositionManager).collect(_collectParams);
        (uint256 amount0_, uint256 amount1_) =
        INonfungiblePositionManager(_uniV3PositionManager).decreaseLiquidity(_liquidityParams);

        amount0 += amount0_;
        amount1 += amount1_;

        // burn token id
        INonfungiblePositionManager(_uniV3PositionManager).burn(_tokenId);

        // add liquidity to alium
        _addLiquidity(
            token0,
            token1,
            amount0,
            amount1,
            msg.sender
        );
    }

    /**
     * @dev Change router address
     */
    function changeRouter(address _newRouter) external onlyOwner {
        require(_newRouter != address(0), "New Router address is wrong");

        emit RouterChanged(address(ourRouter), _newRouter);
        ourRouter = IUniswapV2Router01(_newRouter);
    }

    function _addLiquidity(
        address _token0,
        address _token1,
        uint256 _amount0,
        uint256 _amount1,
        address _receiver
    ) internal {
        TransferHelper.safeApprove(_token0, address(ourRouter), _amount0);
        TransferHelper.safeApprove(_token1, address(ourRouter), _amount1);

        (uint256 amountOut0, uint256 amountOut1, ) = ourRouter.addLiquidity(
            address(_token0),
            address(_token1),
            _amount0,
            _amount1,
            0,
            0,
            _receiver,
            block.timestamp + LIQUIDITY_DEADLINE
        );

        // return the change
        if (amountOut0 < _amount0) {
            // consumed less tokens than given
            TransferHelper.safeTransfer(
                _token0,
                address(msg.sender),
                _amount0.sub(amountOut0)
            );
        }

        if (amountOut1 < _amount1) {
            // consumed less tokens than given
            TransferHelper.safeTransfer(
                _token1,
                address(msg.sender),
                _amount1.sub(amountOut1)
            );
        }
        TransferHelper.safeApprove(_token0, address(ourRouter), 0);
        TransferHelper.safeApprove(_token1, address(ourRouter), 0);
    }
}
