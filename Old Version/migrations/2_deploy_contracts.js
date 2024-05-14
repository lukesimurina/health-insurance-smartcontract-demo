var HealthInsurance = artifacts.require("./HealthInsurance.sol");

module.exports = function (deployer) {
    deployer.deploy(HealthInsurance);
};
