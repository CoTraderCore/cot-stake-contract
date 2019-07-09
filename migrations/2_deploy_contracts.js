const Stake = artifacts.require("./Stake");

module.exports = async (deployer) => {
  await deployer.deploy(Stake);
  }
};
