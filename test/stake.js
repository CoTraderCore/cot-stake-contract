import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const TokenA = artifacts.require('TokenA');
const TokenB = artifacts.require('TokenB');
const Exchange = artifacts.require('Exchange');

contract('Exchange', function([_, wallet]) {

  beforeEach(async function() {
    // Tokens config
    this.nameA = "Token A";
    this.symbolA = "TKNA";

    this.nameB = "Token B";
    this.symbolB = "TKNB";

    this.decimals = 18;
    this.totalSupply = 1000000000;


    // Deploy Token A
    this.tokenA = await TokenA.new(
      this.nameA,
      this.symbolA,
      this.decimals,
      this.totalSupply
    );

    // Deploy Token B
    this.tokenB = await TokenB.new(
      this.nameB,
      this.symbolB,
      this.decimals,
      this.totalSupply
    );

    // Deploy Exchange
    this.exchange = await Exchange.new();


    // transfer some tokens B to Exchange
    await this.tokenB.transfer(this.exchange.address, 1000000000);

    // approve some A tokens to exchange
    await this.tokenA.approve(this.exchange.address, 10000);
  });

  describe('Convert A to B', function() {
    it('sender get B token', async function() {
      await this.exchange.convert(this.tokenA.address, this.tokenB.address, 1000)
      const balance = await this.tokenB.balanceOf(_)
      assert.equal(balance, 1000)
    });

    it('sender send A token', async function() {
      const balanceBefore = await this.tokenA.balanceOf(_)
      await this.exchange.convert(this.tokenA.address, this.tokenB.address, 1000)
      const balanceAfter = await this.tokenA.balanceOf(_)
      assert.notEqual(balanceBefore, balanceAfter)
    });
  });

  describe('Convert B to A', function() {
    it('sender get back A token from Exchange when send B token', async function() {
      const balanceABefore = await this.tokenA.balanceOf(_)
      await this.exchange.convert(this.tokenA.address, this.tokenB.address, 1000)
      await this.tokenB.approve(this.exchange.address, 1000)
      await this.exchange.convert(this.tokenB.address, this.tokenA.address, 1000)
      const balanceAAfter = await this.tokenA.balanceOf(_)
      assert.equal(web3.utils.fromWei(balanceABefore), web3.utils.fromWei(balanceAAfter))
    });
  });

});
