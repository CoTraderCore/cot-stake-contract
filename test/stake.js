import { BN, fromWei } from 'web3-utils';

import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import { duration } from './helpers/duration';
import latestTime from './helpers/latestTime';
import advanceTimeAndBlock from './helpers/advanceTimeAndBlock';
const BigNumber = BN;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Token = artifacts.require('Token');
const Stake = artifacts.require('Stake');

contract('Stake', function([_, userOne, userTwo]) {
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

    // Send some tokens to users
    await this.token.transfer(userOne, ether(10000000))
    // Send some tokens to users
    await this.token.transfer(userTwo, ether(10))
  });

  describe('Deposit', function() {
    it('User can not do deposit if owner not add reserve', async function() {
      await this.token.approve(this.stake.address, ether(100));
      await this.stake.deposit(ether(100), duration.years(1)).should.be.rejectedWith(EVMRevert);
    });

    it('User can do deposit if owner add reserve', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne});
      await this.token.approve(this.stake.address, ether(200), {from: _});
      await this.stake.addReserve(ether(200), {from: _});
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.fulfilled;
    });

    it('User can not do double deposit', async function() {
      await this.token.approve(this.stake.address, ether(200), {from: userOne});
      await this.token.approve(this.stake.address, ether(400), {from: _});
      await this.stake.addReserve(ether(400), {from: _});
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.fulfilled;
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.rejectedWith(EVMRevert);
    });

    it('User can not do deposit if his value more than reserve', async function() {
      await this.token.approve(this.stake.address, ether(500), {from: userOne});
      await this.token.approve(this.stake.address, ether(400), {from: _});
      await this.stake.addReserve(ether(400), {from: _});
      await this.stake.deposit(ether(500), duration.years(1), {from: userOne}).should.be.rejectedWith(EVMRevert);
    });
  });


  describe('Withdraw', function() {
    it('User can not withdraw ahead of time', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne});
      await this.token.approve(this.stake.address, ether(400), {from: _});
      await this.stake.addReserve(ether(400), {from: _});
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.fulfilled;
      await this.stake.withdraw({from: userOne}).should.be.rejectedWith(EVMRevert);
    });

    it('User can withdraw after a certain time and his balance was increased', async function() {
      const balanceBefore = await this.token.balanceOf(userTwo);
      await this.token.approve(this.stake.address, ether(10), {from: userTwo});
      await this.token.approve(this.stake.address, ether(20), {from: _});
      await this.stake.addReserve(ether(20), {from: _});
      await this.stake.deposit(ether(10), duration.years(3), {from: userTwo}).should.be.fulfilled;
      await advanceTimeAndBlock(duration.years(3));
      await this.stake.withdraw({from: userTwo}).should.be.fulfilled;
      const balanceAfter = await this.token.balanceOf(userTwo);
      assert.isTrue(balanceAfter > balanceBefore);
      // Correct percent 3 yaers = 100%
      const balanceFromWei = fromWei(String(balanceAfter));
      Number(balanceFromWei).should.be.equal(20);
    });


  });
});
