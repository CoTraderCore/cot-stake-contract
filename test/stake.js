import { BN } from 'web3-utils';

import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const BigNumber = BN;

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
    this.totalSupply = ether(1000000000000);

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
    await this.token.transfer(wallet, ether(10000000))
  });

  describe('Deposit', function() {
    const oneYear = 31556926;
    it('User can not do deposit if owner not add reserve', async function() {
      await this.token.approve(this.stake.address, ether(100));
      await this.stake.deposit(ether(100), oneYear).should.be.rejectedWith(EVMRevert);
    });

    it('User can do deposit if owner add reserve', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: wallet});
      await this.token.approve(this.stake.address, ether(200), {from: _});
      await this.stake.addReserve(ether(200), {from: _});
      await this.stake.deposit(ether(100), oneYear, {from: wallet}).should.be.fulfilled;
    });

    it('User can not do double deposit', async function() {
      await this.token.approve(this.stake.address, ether(200), {from: wallet});
      await this.token.approve(this.stake.address, ether(400), {from: _});
      await this.stake.addReserve(ether(400), {from: _});
      await this.stake.deposit(ether(100), oneYear, {from: wallet}).should.be.fulfilled;
      await this.stake.deposit(ether(100), oneYear, {from: wallet}).should.be.rejectedWith(EVMRevert);
    });

    it('User can not do deposit if his value more than reserve', async function() {
      await this.token.approve(this.stake.address, ether(500), {from: wallet});
      await this.token.approve(this.stake.address, ether(400), {from: _});
      await this.stake.addReserve(ether(400), {from: _});
      await this.stake.deposit(ether(500), oneYear, {from: wallet}).should.be.rejectedWith(EVMRevert);
    });
  });

});
