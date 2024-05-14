const fs = require("fs");
const path = require("path");

const HealthInsurance = artifacts.require("./HealthInsurance.sol");

module.exports = async function (deployer, network, accounts) {
    const deployAccount = accounts[9];
    try {
        await deployer.deploy(HealthInsurance, {
            from: deployAccount,
        });

        // After deployment, the contract's address should be available.
        const deployedContract = await HealthInsurance.deployed();

        const config = {
            contractAddress: deployedContract.address, // Use deployed contract instance to get the address
            abi: JSON.stringify(deployedContract.abi),
        };

        // Write the configuration to the appropriate directory for the web app to use.
        const configPath = path.join(
            __dirname,
            "../HealthInsuranceWebApp/config.json"
        );
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        console.log("Contract deployed and config written to " + configPath);
    } catch (error) {
        console.error("Failed to deploy HealthInsurance contract:", error);
    }
};
