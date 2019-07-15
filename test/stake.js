import { BN, fromWei } from 'web3-utils'

import ether from './helpers/ether'
import EVMRevert from './helpers/EVMRevert'
import { duration } from './helpers/duration'
import latestTime from './helpers/latestTime'
import advanceTimeAndBlock from './helpers/advanceTimeAndBlock'
const BigNumber = BN

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Token = artifacts.require('Token')
const Stake = artifacts.require('Stake')

contract('Stake', function([_, userOne, userTwo]) {
  beforeEach(async function() {
    // Tokens config
    this.name = "TEST"
    this.symbol = "TST"

    this.decimals = 18
    this.totalSupply = ether(1000000000000)

    // Deploy Token
    this.token = await Token.new(
      this.name,
      this.symbol,
      this.decimals,
      this.totalSupply
    )

    // Deploy Exchange
    this.stake = await Stake.new(this.token.address)

    // Send some tokens to users
    await this.token.transfer(userOne, ether(10000000))
    // Send some tokens to users
    await this.token.transfer(userTwo, ether(10))
  })

  describe('Deposit', function() {
    it('User can not do deposit if owner not add reserve', async function() {
      await this.token.approve(this.stake.address, ether(100))
      await this.stake.deposit(ether(100), duration.years(1)).should.be.rejectedWith(EVMRevert)
    })

    it('User can do deposit if owner add reserve', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne})
      await this.token.approve(this.stake.address, ether(200), {from: _})
      await this.stake.addReserve(ether(200), {from: _})
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.fulfilled
    })

    it('User can not do deposit with time less than require time', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne})
      await this.token.approve(this.stake.address, ether(200), {from: _})
      await this.stake.addReserve(ether(200), {from: _})
      await this.stake.deposit(ether(100), duration.days(89), {from: userOne}).should.be.rejectedWith(EVMRevert)
    })

    it('User can not do double deposit', async function() {
      await this.token.approve(this.stake.address, ether(200), {from: userOne})
      await this.token.approve(this.stake.address, ether(400), {from: _})
      await this.stake.addReserve(ether(400), {from: _})
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.fulfilled
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.rejectedWith(EVMRevert)
    })

    it('User can do next deposit after withdarw previous', async function() {
      await this.token.approve(this.stake.address, ether(200), {from: userOne})
      await this.token.approve(this.stake.address, ether(400), {from: _})
      await this.stake.addReserve(ether(400), {from: _})
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.fulfilled
      await advanceTimeAndBlock(duration.years(1))
      await this.stake.withdraw({from: userOne}).should.be.fulfilled
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.fulfilled
    })

    it('User can not do deposit if his value more than reserve', async function() {
      await this.token.approve(this.stake.address, ether(500), {from: userOne})
      await this.token.approve(this.stake.address, ether(400), {from: _})
      await this.stake.addReserve(ether(400), {from: _})
      await this.stake.deposit(ether(500), duration.years(1), {from: userOne}).should.be.rejectedWith(EVMRevert)
    })

    it('Correct data update after deposit', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne})
      await this.token.approve(this.stake.address, ether(200), {from: _})
      await this.stake.addReserve(ether(200), {from: _})
      const reserve = await this.stake.reserve()

      await this.stake.deposit(ether(100), duration.years(3), {from: userOne}).should.be.fulfilled
      const contribution = await this.stake.contribution()
      const debt = await this.stake.debt()

      const user = await this.stake.userDataMap(userOne)
      const unlockTime = await latestTime() + duration.years(3)

      // global data
      assert.equal(fromWei(String(reserve)), 200)
      assert.equal(fromWei(String(contribution)), 100)
      assert.equal(fromWei(String(debt)), 200)

      // user data
      assert.equal(user.depositStatus, true)
      assert.equal(fromWei(String(user.amount)), 100)
      assert.equal(user.endTime, unlockTime)
      assert.equal(user.holdTime, duration.years(3))
    })
  })

  describe('Calculate withdraw percent', function() {
    it('less than 3 month (90 days) should return 0%', async function() {
      let percent = await this.stake.calculateWithdarw(100, duration.days(89))
      Number(percent).should.be.equal(0)
    })

    it('3 month (90 days) should return 3%', async function() {
      let percent = await this.stake.calculateWithdarw(100, duration.days(90))
      percent -= 100
      percent.should.be.equal(3)
    })

    it('6 month (180 days) should return 8%', async function() {
      let percent = await this.stake.calculateWithdarw(100, duration.days(190))
      percent -= 100
      percent.should.be.equal(8)
    })

    it('1 year should return 20%', async function() {
      let percent = await this.stake.calculateWithdarw(100, duration.years(1))
      percent -= 100
      percent.should.be.equal(20)
    })

    it('2 years should return 50%', async function() {
      let percent = await this.stake.calculateWithdarw(100, duration.years(2))
      percent -= 100
      percent.should.be.equal(50)
    })

    it('3 years should return 100%', async function() {
      let percent = await this.stake.calculateWithdarw(100, duration.years(3))
      percent -= 100
      percent.should.be.equal(100)
    })

    it('More than 3 years should return 100%', async function() {
      let percent = await this.stake.calculateWithdarw(100, duration.years(5))
      percent -= 100
      percent.should.be.equal(100)
    })
  })

  describe('Add reserve', function() {
    it('NOT Owner can NOT add new reserve', async function() {
      await this.token.approve(this.stake.address, ether(200), {from: userOne})
      await this.stake.addReserve(ether(200), {from: userOne}).should.be.rejectedWith(EVMRevert)
    })

    it('Owner can add new reserve and reserve data was update correctly', async function() {
      await this.token.approve(this.stake.address, ether(200), {from: _})
      await this.stake.addReserve(ether(200), {from: _}).should.be.fulfilled
      const reserve = await this.stake.reserve()
      assert.equal(fromWei(String(reserve)), 200)
    })
  })

  describe('Remove reserve', function() {
    it('Owner can get back not used reserve', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne})
      await this.token.approve(this.stake.address, ether(200), {from: _})
      await this.stake.addReserve(ether(200), {from: _})
      const balanceBefore = await this.token.balanceOf(_)
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.fulfilled
      await this.stake.removeReserve({from: _}).should.be.fulfilled
      const balanceAfter = await this.token.balanceOf(_)
      assert.isTrue(balanceAfter > balanceBefore)
    })

    it('NOT Owner can NOT get back not used reserve', async function() {
      await this.token.approve(this.stake.address, ether(200), {from: _})
      await this.stake.addReserve(ether(200), {from: _})
      await this.stake.removeReserve({from: userOne}).should.be.rejectedWith(EVMRevert)
    })

    it('Owner can get back correct amount of reserve and reserve data was correct update', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne})
      await this.token.approve(this.stake.address, ether(400), {from: _})
      await this.stake.addReserve(ether(400), {from: _})
      // 3 years = 100%
      await this.stake.deposit(ether(100), duration.years(3), {from: userOne}).should.be.fulfilled
      await this.stake.removeReserve({from: _}).should.be.fulfilled
      const reserve = await this.stake.reserve()
      assert.equal(fromWei(String(reserve)), 200)
    })

    it('Owner can NOT get back reserve if all reserve in debt', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne})
      await this.token.approve(this.stake.address, ether(200), {from: _})
      await this.stake.addReserve(ether(200), {from: _})
      // 3 years = 100%
      await this.stake.deposit(ether(100), duration.years(3), {from: userOne}).should.be.fulfilled
      await this.stake.removeReserve({from: _}).should.be.rejectedWith(EVMRevert)
    })
  })

  describe('Withdraw', function() {
    it('User can not withdraw ahead of time', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne})
      await this.token.approve(this.stake.address, ether(400), {from: _})
      await this.stake.addReserve(ether(400), {from: _})
      await this.stake.deposit(ether(100), duration.years(1), {from: userOne}).should.be.fulfilled
      await this.stake.withdraw({from: userOne}).should.be.rejectedWith(EVMRevert)
    })

    it('User can withdraw after a certain time and his balance was increased', async function() {
      const balanceBefore = await this.token.balanceOf(userTwo)
      await this.token.approve(this.stake.address, ether(10), {from: userTwo})
      await this.token.approve(this.stake.address, ether(20), {from: _})
      await this.stake.addReserve(ether(20), {from: _})
      await this.stake.deposit(ether(10), duration.years(3), {from: userTwo}).should.be.fulfilled
      await advanceTimeAndBlock(duration.years(3))
      await this.stake.withdraw({from: userTwo}).should.be.fulfilled
      const balanceAfter = await this.token.balanceOf(userTwo)
      assert.isTrue(balanceAfter > balanceBefore)
      // Correct percent 3 yaers = 100%
      const balanceFromWei = fromWei(String(balanceAfter))
      Number(balanceFromWei).should.be.equal(20)
    })

    it('If the user withdraws much later, his reward is no more than the original one, which he set', async function() {
      await this.token.approve(this.stake.address, ether(10), {from: userTwo})
      await this.token.approve(this.stake.address, ether(20), {from: _})
      await this.stake.addReserve(ether(20), {from: _})
      await this.stake.deposit(ether(10), duration.years(2), {from: userTwo}).should.be.fulfilled
      await advanceTimeAndBlock(duration.years(5))
      await this.stake.withdraw({from: userTwo}).should.be.fulfilled
      const balance = await this.token.balanceOf(userTwo)
      // Correct percent 2 yaers = 50%
      const balanceFromWei = fromWei(String(balance))
      Number(balanceFromWei).should.be.equal(15)
    })

    it('Correct data update after withdraw', async function() {
      await this.token.approve(this.stake.address, ether(100), {from: userOne})
      await this.token.approve(this.stake.address, ether(200), {from: _})
      await this.stake.addReserve(ether(200), {from: _})
      await this.stake.deposit(ether(100), duration.years(3), {from: userOne}).should.be.fulfilled
      await advanceTimeAndBlock(duration.years(3))
      await this.stake.withdraw({from: userOne}).should.be.fulfilled

      const reserve = await this.stake.reserve()
      const contribution = await this.stake.contribution()
      const payout = await this.stake.payout()
      const debt = await this.stake.debt()
      const user = await this.stake.userDataMap(userOne)

      // global data
      assert.equal(fromWei(String(reserve)), 0)
      assert.equal(fromWei(String(contribution)), 0)
      assert.equal(fromWei(String(payout)), 200)
      assert.equal(fromWei(String(debt)), 0)

      // user data
      assert.equal(user.depositStatus, false)
      assert.equal(fromWei(String(user.amount)), 0)
      assert.equal(user.holdTime, 0)
      assert.equal(user.endTime, 0)
    })
  })
})
