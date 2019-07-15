/*
This contract close tokens for stake and return tokens + rewarding after certain time
*/

pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Stake is Ownable{

using SafeMath for uint256;

// total tokens deposit
uint256 public contribution = 0;
// total tokens debt
uint256 public debt = 0;
// total tokens payout
uint256 public payout = 0;
// total tokens reserve
uint256 public reserve = 0;
// minimum require time for staking
uint256 public minRequireTime = 90 days;

// COT token
ERC20 public token;

// user data
struct userDataStruct {
  bool depositStatus;
  uint256 holdTime;
  uint256 endTime;
  uint256 amount;
}

mapping(address => userDataStruct) public userDataMap;

// events
event Deposit(address indexed user, uint256 amount);
event Withdraw(address indexed user, uint256 amount);


/**
 * @dev constructor
 *
 * @param _token                        ERC20 token address
*/
constructor(address _token)public{
  token = ERC20(_token);
}


/**
 * @dev send tokens to contract for stake
 *
 * @param value                        token amount for stake
 * @param time                         unix time in seconds
*/
function deposit(uint256 value, uint256 time) public{
 userDataStruct storage user = userDataMap[msg.sender];
 // throw if user not close previous deposit
 require(!user.depositStatus);
 // throw if user time does not match the minimum time
 require(time >= minRequireTime);

 uint256 increaseDebt = debt.add(calculateWithdarw(value, time));
 // throw if the contract cannot pay for user value
 require(increaseDebt <= reserve);
 // throw if user not approve tokens for contract
 require(token.transferFrom(msg.sender, address(this), value));
 // update global data
 debt = increaseDebt;
 contribution = contribution.add(value);

 // update user data
 user.depositStatus = true;
 user.holdTime = time;
 user.endTime = now + time;
 user.amount = value;
 // emit event
 emit Deposit(msg.sender, value);
}


/**
 * @dev withdraw token + earning percent after certain time
 *
*/
function withdraw() public{
 userDataStruct storage user = userDataMap[msg.sender];
 // throw if user not have depoit
 require(user.depositStatus);
 // throw if the user call early
 require(now >= user.endTime);
 // calculate user amount + percent
 uint256 payAmount = calculateWithdarw(user.amount, user.holdTime);
 // transfer tokens to user
 require(token.transfer(msg.sender, payAmount));

 // update global data
 debt = debt.sub(payAmount);
 payout = payout.add(payAmount);
 reserve = reserve.sub(payAmount);
 contribution = contribution.sub(user.amount);

 // update user data
 user.depositStatus = false;
 user.amount = 0;
 user.holdTime = 0;
 user.endTime = 0;
 // emit event
 emit Withdraw(msg.sender, payAmount);
}

/**
 * @dev owner can increase reserve
 *
 * @param value                        ERC20 token amount
*/
function addReserve(uint256 value) public onlyOwner{
 require(token.transferFrom(msg.sender, address(this), value));
 reserve = reserve.add(value);
}

/**
 * @dev calculate reserve wich not used
 *
*/
function calculateFreeReserve() public view returns(uint256){
 return reserve.sub(debt);
}

/**
 * @dev owner can withdraw not used reserve
 *
*/
function removeReserve() public onlyOwner{
 uint256 freeReserve = calculateFreeReserve();
 require(freeReserve > 0);
 token.transfer(msg.sender, freeReserve);
 reserve = reserve.sub(freeReserve);
}


/**
 * @dev calculate tokens amount + earning percent
 *
 * @param amount                        ERC20 token amount
 * @param percent                       uint number from 0 to 100
*/
function calculateContributionWithInterest(uint256 amount, uint percent) public pure returns(uint256){
 require(percent <= 100);
 return amount.add(amount.div(100).mul(percent));
}



/**
 * @dev calculate earning by time
 * 3,6,12,24,36 month
 * 3,8,20,50,100 percent
 *
 * @param amount                        ERC20 token amount
 * @param time                          time in seconds
*/
function calculateWithdarw(uint256 amount, uint256 time) public pure returns(uint256){
 if(time < 90 days){
 return 0;
 }
 else if(time >= 90 days && time < 180 days){ // 3 month = 3%
  return calculateContributionWithInterest(amount, 3);
 }
 else if(time >= 180 days && time < 365 days){ // 6 month = 8%
  return calculateContributionWithInterest(amount, 8);
 }
 else if(time >= 365 days && time < 730 days){ // 1 year = 20%
  return calculateContributionWithInterest(amount, 20);
 }
 else if(time >= 730 days && time < 1095 days){ // 2 year = 50%
  return calculateContributionWithInterest(amount, 50);
 }
 else if(time >= 1095 days){ // 3 year = 100%
  return calculateContributionWithInterest(amount, 100);
 }
}

}
