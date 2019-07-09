// TODO write tests
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Token = artifacts.require('Token');
const Stake = artifacts.require('Stake');

contract('Stake', function([_, wallet]) {

  beforeEach(async function() {
    // Tokens config
    this.name = "TEST";
    this.symbol = "TST";

    this.decimals = 18;
    this.totalSupply = 1000000000;

    // Deploy Token
    this.token = await Token.new(
      this.name,
      this.symbol,
      this.decimals,
      this.totalSupply
    );

    // Deploy Exchange
    this.stake = await Stake.new(this.token.address);

    // Send some tokens to user
    await this.token.transfer(wallet, 10000)
  });

  describe('Deposit', function() {
    const oneYear = 31556926;
    it('User can not do deposit if owner not add reserve', async function() {
      await this.token.approve(this.stake.address, 10000);
      await this.stake.deposit(10000, oneYear).should.be.rejectedWith(EVMRevert);
    });

    it('User can do deposit if owner add reserve', async function() {
      await this.token.approve(this.stake.address, 10000, {from: wallet});
      await this.token.approve(this.stake.address, 20000, {from: _});
      await this.stake.addReserve(20000, {from: _});
      await this.stake.deposit(10000, oneYear, {from: wallet}).should.be.fulfilled;
    });
  });

});
