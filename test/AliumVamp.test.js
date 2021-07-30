const { BN, ether } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');
const { constants } = require('ethers');
const { MaxUint256 } = constants;

const AliumFactory = artifacts.require('AliumFactory');
const AliumPair = artifacts.require('AliumPair');
const AliumRouter = artifacts.require('AliumRouter');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const ERC20Mock = artifacts.require('ERC20Mock');
const AliumVamp = artifacts.require('AliumVamp');
const WETH = artifacts.require('WETH');

// MockUSDX.numberFormat = 'String';

let uniswapFactory;
let uniswapFactory2;
let uniswapPair;
let uniswapPairUSDX_WETH;
let usdx;
let usdy;
let usdz;
let weth;
let vamp;
let aliumPair;
let aliumRouter, aliumFactory;

/**
 *Token  Decimals
V ETH    (18)
  USDT   (6)
  USDB   (18)
V USDC   (6)
V DAI    (18)
V EMRX   (8)
V WETH   (18)
v WBTC   (8)
  renBTC (8)
*/

contract('AliumVamp test',  (accounts) => {
    const [
        owner,
        alice,
        bob,
        dave,
        henry,
        ivan
    ] = accounts;

    before('config & deploy', async () => {
        uniswapFactory = await UniswapV2Factory.new(owner);
        uniswapFactory2 = await UniswapV2Factory.new(owner);

        usdx = await ERC20Mock.new("USDX stable coin", "USDX", 18);
        usdy = await ERC20Mock.new("USDY stable coin", "USDY", 8);
        usdz = await ERC20Mock.new("USDZ stable coin", "USDZ", 6);
        
        usdx.mint(owner, new BN(MaxUint256.toString()));
        usdy.mint(owner, new BN(MaxUint256.toString()));
        usdz.mint(owner, new BN(MaxUint256.toString()));

        weth = await WETH.new();

        /* USDX - USDZ pair (DAI - USDC) */
        await uniswapFactory.createPair(weth.address, usdz.address);
        await uniswapFactory2.createPair(weth.address, usdz.address);

        const pairAddress = await uniswapFactory.getPair(weth.address, usdz.address);
        const pairAddress2 = await uniswapFactory2.getPair(weth.address, usdz.address);

        uniswapPair = await UniswapV2Pair.at(pairAddress);
        uPair2 = await UniswapV2Pair.at(pairAddress2);

        /* USDX - WETH pair (DAI - ETH) */
        await uniswapFactory.createPair(usdx.address, weth.address);
        await uniswapFactory2.createPair(usdx.address, weth.address);

        const pairAddressUSDX_WETH = await uniswapFactory.getPair(usdx.address, weth.address);
        uniswapPairUSDX_WETH = await UniswapV2Pair.at(pairAddressUSDX_WETH);

        const wethToPair = new BN(1).mul(new BN(10).pow(new BN(await weth.decimals()))).toString();
        const usdzToPair = new BN(40).mul(new BN(10).pow(new BN(await usdz.decimals()))).toString();
    
        const usdxToPair_USDXWETH = new BN(400).mul(new BN(10).pow(new BN(await usdx.decimals()))).toString();
        const wethToPair_USDXWETH = new BN(1).mul(new BN(10).pow(new BN(await weth.decimals()))).toString();

        await weth.deposit({ value: wethToPair });
        await weth.transfer(uPair2.address, wethToPair);
        await usdz.transfer(uPair2.address, usdzToPair);
        await uPair2.mint(bob);

        await weth.deposit({ value: wethToPair });
        await weth.deposit({ value: '10000000000000000' });
        await weth.transfer(uniswapPair.address, wethToPair);
        await usdz.transfer(uniswapPair.address, usdzToPair);
        await uniswapPair.mint(alice);
        let ttt = new BN(wethToPair);
        let ttt2 = new BN(usdzToPair);
        await weth.deposit({ value: ttt.mul(new BN(10)).toString()});
        await weth.transfer(uniswapPair.address, ttt.mul(new BN(10)).toString());
        await usdz.transfer(uniswapPair.address, ttt2.mul(new BN(10)).toString());
        await uniswapPair.mint(bob);

        await weth.deposit({ value: ttt.mul(new BN(30)).toString() });
        await weth.transfer(uniswapPair.address, ttt.mul(new BN(30)).toString());
        await usdz.transfer(uniswapPair.address, ttt2.mul(new BN(30)).toString());
        await uniswapPair.mint(dave);

        await usdx.transfer(bob, usdxToPair_USDXWETH);
        await usdx.transfer(uniswapPairUSDX_WETH.address, usdxToPair_USDXWETH);
        await weth.deposit({ value: wethToPair_USDXWETH });
        await weth.transfer(uniswapPairUSDX_WETH.address, wethToPair_USDXWETH);
        await uniswapPairUSDX_WETH.mint(alice); 
        await usdx.transfer(alice, '1000000000000');
        await weth.transfer(alice, '1000000000000');

        aliumFactory = await AliumFactory.new(ivan);
        console.log(`INIT CODE HASH: ${await aliumFactory.INIT_CODE_PAIR_HASH()}`)

        aliumRouter = await AliumRouter.new(aliumFactory.address, weth.address);

        await weth.approve(aliumRouter.address, new BN(MaxUint256.toString()), {from: alice});
        await usdx.approve(aliumRouter.address, new BN(MaxUint256.toString()), {from: alice});

        let deadlockTime = new BN((Date.now() / 1000) + 120);

        if (Number(await weth.allowance(alice, aliumRouter.address)) < 100000000) {
            throw new Error('Not allowed weth')
        }
        if (Number(await usdx.allowance(alice, aliumRouter.address)) < 100000000) {
            throw new Error('Not allowed usdx')
        }

        await aliumRouter.addLiquidity(
            usdx.address,
            weth.address,
            new BN('100000000').toString(),
            new BN('100000000').toString(),
            new BN('0').toString(),
            new BN('0').toString(),
            alice,
            deadlockTime,
            {from: alice}
        );
        let p_a = await aliumFactory.getPair(usdx.address, weth.address);
        aliumPair = await AliumPair.at(p_a);

        vamp = await AliumVamp.new([p_a, pairAddress, pairAddressUSDX_WETH], [0, 0, 0], aliumRouter.address, {from: henry});

        await uniswapPair.approve(vamp.address, MaxUint256.toString(), {from: alice});
        await aliumPair.approve(vamp.address, MaxUint256.toString(), {from: alice});

    });

    describe('Process allowed tokens lists', async () => {
      it('should successfully get tokens list length under admin', async () => {
        let b = await vamp.getAllowedTokensLength({from: henry});
        console.log('We have %d allowed tokens', b);
        assert.equal(b, 0);
      });

      it('should successfully get tokens list length under non-admin wallet', async () => {
        let b = await vamp.getAllowedTokensLength();
        assert.equal(b, 0);
      });

      it('should successfully add tokens under admin', async () => {
        let tx = await vamp.addAllowedToken(weth.address, {from: henry});
        console.log('Adding allowed token gas used: %d', tx.receipt.gasUsed);
        await vamp.addAllowedToken(usdz.address, {from: henry});
        let b = await vamp.getAllowedTokensLength({from: henry});
        console.log('Now we have %d allowed tokens', b);
        assert.equal(b, 2);
      });

      it('should successfully list tokens under admin', async () => {
        await vamp.addAllowedToken(weth.address, {from: henry});
        await vamp.addAllowedToken(usdz.address, {from: henry});
        let b = await vamp.getAllowedTokensLength({from: henry});
        assert.equal(b, 2);
        b = await vamp.allowedTokens(0, {from: henry});
        assert.equal(b, weth.address);
        b = await vamp.allowedTokens(1, {from: henry});
        assert.equal(b, usdz.address);
      });

      it('should allow to list LP-tokens', async () => {
        let b = await vamp.lpTokensInfoLength();
        console.log(b);
        assert.equal(b, 3);
	    b = await vamp.lpTokensInfo(1);
        assert.equal(b.lpToken, uniswapPair.address);
	    b = await vamp.lpTokensInfo(0);
        assert.equal(b.lpToken, aliumPair.address);
      });

      it('should succeed to list tokens under non-admin wallet', async () => {
        await vamp.addAllowedToken(usdz.address, {from: henry});
        let b = await vamp.allowedTokens(0);
        assert.equal(b, usdz.address);
      });
    });

    describe('Deposit LP-tokens to our contract', async () => {
      it('should be transferring Uniswap tokens successfully', async () => {
        let r = await uniswapPair.getReserves();
        console.log('Pair rsv: %d, %d', r[0].toString(), r[1].toString());
        let b = await uniswapPair.balanceOf(alice);
        console.log('Alice has %d LP-tokens', b);
        let tx = await vamp.deposit(1, 40000000, {from: alice});
        console.log('Gas used for LP-tokens transfer: ' + tx.receipt.gasUsed);
      });
      
      it('should be transferring Alium tokens successfully', async () => {
        console.log('AliumPair address is %s', aliumPair);
        let b = await aliumPair.balanceOf(alice);
        console.log('Alice has %d LP-tokens', b);
        let tx = await vamp.deposit(0, 1000000, {from: alice});
        console.log('Gas used for LP-tokens transfer: ' + tx.receipt.gasUsed);
      });
    });
});
