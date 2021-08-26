import chai from "chai";

import { ethers } from "hardhat";
import { Signer } from "ethers";
import { assert, expect } from "chai";

// import { BigNumber, BigNumberish, constants, Contract, ContractTransaction, utils, Wallet } from 'ethers'
import { constants, BigNumber, BigNumberish, utils } from "ethers";
import { solidity } from "ethereum-waffle";


import {
    abi as FACTORY_ABI,
    bytecode as FACTORY_BYTECODE,
} from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'

// import {
//     abi as NONFUNGIBLE_POSITION_MANAGER_ABI,
//     bytecode as NONFUNGIBLE_POSITION_MANAGER_BYTECODE,
// } from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
//
// import {
//     abi as NONFUNGIBLE_TOKEN_POSITION_DESCRIPTOR_ABI,
//     bytecode as NONFUNGIBLE_TOKEN_POSITION_DESCRIPTOR_BYTECODE,
// } from '@uniswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json'


chai.use(solidity);

const {
    expectEvent,
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');
const { BN, ether } = require("@openzeppelin/test-helpers");
const { MaxUint256 } = constants;

const MaxUint128 = (new BN(2)).pow(new BN(128)).sub(new BN(1))

const FeeAmount = Object.freeze({
    LOW: 500,
    MEDIUM: 3000,
    HIGH: 10000,
})

const getMinTick = (tickSpacing: number): number => Math.ceil(-887272 / tickSpacing) * tickSpacing
const getMaxTick = (tickSpacing: number): number => Math.floor(887272 / tickSpacing) * tickSpacing

// console.log(getMinTick(60))
// console.log(getMaxTick(60))

const TICK_SPACINGS = (data: number): number => {
    if (FeeAmount.LOW === data)
        return 10;
    if (FeeAmount.MEDIUM === data)
        return 60;
    if (FeeAmount.HIGH === data)
        return 200;

    return 0;
}

// returns the sqrt price as a 64x96
export function encodePriceSqrt(reserve1: number, reserve0: number): BigNumber {
    return BigNumber.from(
            new BN(Math.sqrt(
                    new BN(reserve1.toString()).div(new BN(reserve0))
                )
            )
            .mul(new BN(2).pow(new BN(96)))
            .toString()
    )
}

export function getPositionKey(address: string, lowerTick: number, upperTick: number): string {
    return utils.keccak256(utils.solidityPack(['address', 'int24', 'int24'], [address, lowerTick, upperTick]))
}

function timestamp(offset: number = 0): number|Error {
    if (offset < 0) {
        throw new Error('timestamp <offset>: negative number has been passed')
    }

    return Math.floor(Date.now() / 1000) + offset
}

describe('AliumVampUniV3 test',  () => {
    let accounts: readonly Signer[]

    let OWNER: any
    let ALICE: any
    let BOB: any

    let OWNER_SIGNER: any
    let ALICE_SIGNER: any
    let BOB_SIGNER: any

    let uniswapV3Factory: any
    let positionManager: any
    let tokenDescriptor: any
    let usdx: any
    let usdy: any
    let alm: any
    let weth: any
    let aliumVampUniV3: any
    let aliumPair: any
    let aliumRouter: any
    let aliumFactory: any

    before('start', async () => {
        accounts = await ethers.getSigners();

        OWNER_SIGNER = accounts[0];
        ALICE_SIGNER = accounts[1];
        BOB_SIGNER = accounts[2];

        OWNER = await OWNER_SIGNER.getAddress()
        ALICE = await ALICE_SIGNER.getAddress()
        BOB = await BOB_SIGNER.getAddress()

        const AliumFactory = await ethers.getContractFactory('AliumFactory');
        const AliumRouter = await ethers.getContractFactory('AliumRouter');

        // const UniswapV3Factory = await ethers.getContractFactory(
        //     FACTORY_ABI,
        //     FACTORY_BYTECODE
        // );
        // const NonfungiblePositionManager = await ethers.getContractFactory(
        //     NONFUNGIBLE_POSITION_MANAGER_ABI,
        //     NONFUNGIBLE_POSITION_MANAGER_BYTECODE
        // );
        // const NonfungibleTokenPositionDescriptor = await ethers.getContractFactory(
        //     NONFUNGIBLE_TOKEN_POSITION_DESCRIPTOR_ABI,
        //     NONFUNGIBLE_TOKEN_POSITION_DESCRIPTOR_BYTECODE
        // );

        const NFTDescriptor = await ethers.getContractFactory('NFTDescriptor')
        const nftDescriptorLib = await NFTDescriptor.deploy();

        const UniswapV3Factory = await ethers.getContractFactory('UniswapV3Factory')
        const NonfungiblePositionManager = await ethers.getContractFactory('NonfungiblePositionManager')
        const NonfungibleTokenPositionDescriptor = await ethers.getContractFactory('NonfungibleTokenPositionDescriptor', {
            libraries: {
                NFTDescriptor: nftDescriptorLib.address,
            },
        })

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
        const AliumVampUniV3 = await ethers.getContractFactory('AliumVampUniV3');
        const WETH = await ethers.getContractFactory('WETH');

        // IncreaseLiquidity

        usdx = await ERC20Mock.deploy('Test bitcoin', 'BTC', 8)
        usdy = await ERC20Mock.deploy('Test ethereum', 'ETH', 18)
        alm = await ERC20Mock.deploy('Test alium', 'ALM', 18)
        weth = await WETH.deploy();

        uniswapV3Factory = await UniswapV3Factory.deploy();

        tokenDescriptor = await NonfungibleTokenPositionDescriptor.deploy(weth.address)

        positionManager = await NonfungiblePositionManager.deploy(
            uniswapV3Factory.address,
            weth.address,
            tokenDescriptor.address
        )

        aliumFactory = await AliumFactory.deploy(OWNER)
        aliumRouter = await AliumRouter.deploy(aliumFactory.address, weth.address)

        aliumVampUniV3 = await AliumVampUniV3.deploy(aliumRouter.address)
    })

    describe.only('liquidity migration process', () => {
        it.only('should success create alium liquidity from uniswapV3 on deposit call', async () => {

            // let x: number = 1,
            //     y: number = 1;
            // encodePriceSqrt(x, y)

            await usdx.approve(positionManager.address, MaxUint256)
            await usdy.approve(positionManager.address, MaxUint256)

            let poolAddress = await positionManager.connect(OWNER_SIGNER).createAndInitializePoolIfNecessary(
                usdx.address,
                usdy.address,
                FeeAmount.MEDIUM,
                encodePriceSqrt(1, 1)
            )

            let poolAddressResult = await poolAddress.wait()
            console.log(poolAddressResult)

            // let positionKey = getPositionKey(
            //     OWNER,
            //     getMinTick(TICK_SPACINGS(FeeAmount.MEDIUM)),
            //     getMinTick(TICK_SPACINGS(FeeAmount.MEDIUM))
            // )
            //
            // console.log(positionKey)

            // const {
            //     fee,
            //     token0,
            //     token1,
            //     tickLower,
            //     tickUpper,
            //     liquidity,
            //     tokensOwed0,
            //     tokensOwed1,
            //     feeGrowthInside0LastX128,
            //     feeGrowthInside1LastX128,
            // } = await positionManager.positions(1)

            // console.log(liquidity)

            //getMinTick(TICK_SPACINGS(FeeAmount.MEDIUM))
            // process.exit(123)

            let mintResponse = await positionManager.connect(OWNER_SIGNER).mint({
                token0: usdx.address,
                token1: usdy.address,
                tickLower: getMinTick(TICK_SPACINGS(FeeAmount.MEDIUM)),
                tickUpper: getMaxTick(TICK_SPACINGS(FeeAmount.MEDIUM)),
                fee: FeeAmount.MEDIUM,
                recipient: OWNER,
                amount0Desired: 15,
                amount1Desired: 15,
                amount0Min: 0,
                amount1Min: 0,
                deadline: timestamp(1000)
            })

            console.log(mintResponse)

            // const {
            //     fee,
            //     token0,
            //     token1,
            //     tickLower,
            //     tickUpper,
            //     liquidity,
            //     tokensOwed0,
            //     tokensOwed1,
            //     feeGrowthInside0LastX128,
            //     feeGrowthInside1LastX128,
            // } = await positionManager.positions(1)
            //
            // console.log(liquidity)

            let tokenId = 1 // mintResponse.tokenId

            // await aliumVampUniV3.deposit(positionManager.address, tokenId)

        })

        it('should deposit fail if uniswapV3 not approved', () => {
            //
        })

        it('should deposit fail if uniswapV3 has empty liquidity', () => {
            //
        })

        it('should deposit fail if token is not acceptable (not in whitelist)', () => {
            //
        })
    })

});
