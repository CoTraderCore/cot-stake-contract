/*
Contract close tokens for stacke and return tokens + rewarding after certain time
3,6,12,24,36 month
3,8,20,50,100 percent
*/

pragma solidity ^0.5.10;

contract Stake {

uint256 public contribution = 0;
uint256 public debt = 0;
uint256 public payout = 0;

mapping (address => uint256) public userTime;
mapping (address => uint256) public userAmount;
mapping (address => bool) public userStatus;

function deposit(uint256 value, uint256 time) public{
 // throw if user not close previous deposit
 require(!userStatus[msg.sender]);

 uint256 increaseDebt = debt.add(calculateWithdarw(value, time));
 // throw if the contract cannot pay for user value
 require(increaseDebt <= limit);
 // throw if user not approve tokens
 require(transferFrom(msg.sender, value));
 // upadte user data
 userTime[msg.sender] = now + time;
 userAmount[msg.sender] = value;
 userStatus[msg.sender] = true;
 // update global data
 debt = increaseDebt;
 contribution = contribution.add(value);
}

/* function Withdraw(){
reguire(now >= userTime[msg.sender])
amount = CalculatePercent()
debt = debt - amount
userStatus[msg.sender] = false
userAmount[msg.sender] = 0
}

function AddReserve(value) onlyOwner{
require(transferFrom(msg.sender, value))
reserve += value
}

function RemoveReserve() onlyOwner{
transfer(msg.sender, calculateFreeReserve())
}

function calculateFreeReserve(){

} */


function calculateContributionWithInterest(uint256 amount, uint percent) public view returns(uint256){
 return amount.add(amount.div(100).mul(percent));
}

//3,6,12,24,36 month
//3,8,20,50,100 percent

function calculateWithdarw(uint256 amount, uint256 time) public view returns(uint256){
if(time < 90 days){
return 0;
}else if(time >= 90 days && time < 180 days){ // 3 month
return calculateContributionWithInterest(amount, 3);
}
else if(time >= 180 days && time < 360 days){ // 6 month
return calculateContributionWithInterest(amount, 8);
}
else if(time >= 360 days && time < 720 days){ // 1 year
return calculateContributionWithInterest(amount, 20);
}
else if(time >= 720 days && time < 1080 days){ // 2 year
return calculateContributionWithInterest(amount, 50);
}
else if(time >= 1080 days){ // 3 year
return calculateContributionWithInterest(amount, 100);
}
}

}
