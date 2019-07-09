const Stake = artifacts.require("./Stake");
const Token = artifacts.require('Token');

module.exports = async (deployer) => {
  await deployer.deploy(Token, "TEST", "TST", 18, 100000000000)
  await deployer.deploy(Stake, Token.address);
}
