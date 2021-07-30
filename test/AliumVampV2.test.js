const { BN, ether } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');
const { constants } = require('ethers');
const { MaxUint256 } = constants;

const AliumFactory = artifacts.require('AliumFactory');
const AliumPair = artifacts.require('AliumPair');
const AliumRouter = artifacts.require('AliumRouter');

const NonfungiblePositionManager = artifacts.require('INonfungiblePositionManager');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const ERC20Mock = artifacts.require('ERC20Mock');
const AliumVampV2 = artifacts.require('AliumVampV2');
const WETH = artifacts.require('WETH');

// MockUSDX.numberFormat = 'String';

let uniswapFactoryV3;
let usdx;
let usdy;
let usdz;
let weth;
let vampV2;
let aliumPair;
let aliumRouter
let liumFactory;

contract('AliumVampV2 test',  (accounts) => {
    const [
        owner,
        alice,
        bob,
        dave
    ] = accounts;

    describe('liquidity migration process', () => {
        it('should success create alium liquidity from uniswapV3 on deposit call', () => {
            //
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
