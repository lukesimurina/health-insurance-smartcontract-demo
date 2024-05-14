/**
 * Important notes for code:
 * 1 Ethereum is made up of 1e18 wei (Therefore when 1e18 is seen in the code, it is referring to 1 ethereum.)
 * Therefore, 0.1 Etherum is 1e17 wei (assumed monthly premium)
 */

/**
 * Contract artifacts
 */

// Importing the health insurance contract
const HealthInsurance = artifacts.require("./HealthInsurance");

// Importing BigNumber from web3 to handle large numbers
const BigNumber = web3.BigNumber;

// Setting up chai for assertions, and configuring it to work with BigNumbers and promises
const should = require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bignumber")(BigNumber))
    .should();

/**
 * This function checks if the error message has "invalid opcode", which is a common error in Ethereum smart contracts
 *
 * If the message does not contain "invalid opcode", the test will fail.
 * @param {string} error
 */
function assertJump(error) {
    assert.isAbove(
        error.message.search("invalid opcode"),
        -1,
        "Invalid opcode error must be returned"
    );
}

// Increases testrpc time by the passed duration in seconds
// Useful for testing time dependent tests
// Returns a promise that resolves when the time has successfully increased.
function increaseTime(duration) {
    const id = Date.now();

    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync(
            {
                jsonrpc: "2.0",
                method: "evm_increaseTime",
                params: [duration],
                id: id,
            },
            (err1) => {
                if (err1) return reject(err1);

                web3.currentProvider.sendAsync(
                    {
                        jsonrpc: "2.0",
                        method: "evm_mine",
                        id: id + 1,
                    },
                    (err2, res) => {
                        return err2 ? reject(err2) : resolve(res);
                    }
                );
            }
        );
    });
}

contract("HealthInsurance", function (accounts) {
    let insuranceInstance;

    beforeEach(async function () {
        insuranceInstance = await HealthInsurance.deployed();
    });

    it("insures user with health insurance", async () => {
        let insured = await insuranceInstance.isInsured(accounts[0]);
        assert.isFalse(insured, "User should not be insured");

        await insuranceInstance.underwrite({ value: 1e17 }); // This is assuming that the monthly premium is 0.1 eth (1e17 wei)
        insured = await insuranceInstance.isInsured(accounts[0]);
        assert.isTrue(insured, "User should now be insured");
    });

    it("pays premium for health insurance", async () => {
        let contractBalanceBefore = await web3.eth.getBalance(
            insuranceInstance.address
        );

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: insuranceInstance.address,
            value: 1e17, // This is assuming that the monthly premium is 0.1 eth (1e17 wei)
        });

        let contractBalanceAfter = await web3.eth.getBalance(
            insuranceInstance.address
        );

        contractBalanceBefore
            .plus(1e17) // This is assuming that the monthly premium is 0.1 eth (1e17 wei)
            .should.be.bignumber.equal(contractBalanceAfter);
    });

    it("pays premium for health insurance for 24 months", async () => {
        for (var payments = 0; payments < 24; payments++) {
            // We will do 24 months to fund the smart contract in the meantime so further tests will work.
            await insuranceInstance.payPremiumFor(accounts[0], { value: 1e17 }); // This is assuming that the monthly premium is 0.1 eth (1e17 wei)
        }

        let insured = await insuranceInstance.isInsured(accounts[0]);
        assert.isTrue(insured, "User should still be insured");
    });

    it("initiates claim process for health insurance", async () => {
        let customer = await insuranceInstance.insuranceTakers(accounts[0]);
        let numClaims = customer[3].toNumber();

        assert.equal(
            numClaims,
            0,
            "User should have 0 claims before first claim"
        );

        await insuranceInstance.claim(1e18); // Assuming the claim amount is 1 ether (1e18 wei)

        customer = await insuranceInstance.insuranceTakers(accounts[0]);
        numClaims = customer[3].toNumber();

        assert.equal(numClaims, 1, "User should have 1 claim after claim");
    });

    it("loses insurance if premium is not paid in time", async () => {
        let insured = await insuranceInstance.isInsured(accounts[0]);
        assert.isTrue(insured, "User should still be insured");

        await increaseTime(31 * 24 * 60 * 60);

        insured = await insuranceInstance.isInsured(accounts[0]);

        assert.isFalse(
            insured,
            "User should not be insured anymore after paying premium too late"
        );
    });

    it("throws error if premium is paid too late for health insurance", async () => {
        try {
            await insuranceInstance.payPremiumFor(accounts[0], { value: 1e17 }); // This is assuming that the monthly premium is 0.1 eth (1e17 wei)
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails to underwrite with insufficient payment", async () => {
        try {
            await insuranceInstance.underwrite({ value: 0 }); // Assuming the required premium is 0.1 ether
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails to pay premium for another account without authorization", async () => {
        try {
            await insuranceInstance.payPremiumFor(accounts[1], { value: 1e17 }); // This is assuming that the monthly premium is 0.1 eth (1e17 wei)
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails to claim more than maximum coverage", async () => {
        try {
            await insuranceInstance.claim(6e18); // Assuming maximum coverage is 5 ether (5e18 wei)
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails for insured user to claim without coverage", async () => {
        try {
            await insuranceInstance.claim(1e18); // Assuming the claim amount is 1 ether (1e18 wei)
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails for insured user to make multiple claims in short timeframe", async () => {
        let insured = await insuranceInstance.isInsured(accounts[0]);
        let premiumAmount = await insuranceInstance.getPremium(accounts[0]);
        await insuranceInstance.underwrite({ value: 1e17 });
        insured = await insuranceInstance.isInsured(accounts[0]);

        await insuranceInstance.claim(1e18); // Assuming the claim amount is 0.1 ether (1e17 wei)

        await increaseTime(60 * 60); // Move time forward by 1 hour

        try {
            await insuranceInstance.claim(1e18); // Attempting to make another claim too soon
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("policy expires after multiple missed premium payments", async () => {
        let premiumAmount = await insuranceInstance.getPremium(accounts[0]); // As we have made claims the premium has increased
        await insuranceInstance.underwrite({ value: premiumAmount.toNumber() });
        let insured = await insuranceInstance.isInsured(accounts[0]);
        assert.isTrue(insured, "User should be insured");
        await increaseTime(2 * 30 * 24 * 60 * 60); // Move time forward to expire policy (60 days, 2 months)

        insured = await insuranceInstance.isInsured(accounts[0]);
        assert.isFalse(
            insured,
            "User should not be insured anymore after policy expiry"
        );
    });

    it("fails to pay premium after policy expiry", async () => {
        await increaseTime(31 * 24 * 60 * 60); // Move time forward to expire policy

        try {
            await insuranceInstance.payPremiumFor(accounts[0], { value: 1e17 }); // This is assuming that the monthly premium is 0.1 eth (1e17 wei)
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails to make a claim after policy expiry", async () => {
        await increaseTime(31 * 24 * 60 * 60); // Move time forward to expire policy

        try {
            await insuranceInstance.claim(1e18); // Assuming the claim amount is 1 ether (1e18 wei)
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails to underwrite a banned user", async () => {
        let premiumAmount = await insuranceInstance.getPremium(accounts[0]);

        await insuranceInstance.underwrite({ value: premiumAmount.toNumber() });

        // Expire user's policy
        await increaseTime(31 * 24 * 60 * 60);
        await insuranceInstance.update(accounts[0]);

        // Attempt to underwrite the banned user again
        try {
            await insuranceInstance.underwrite({ value: 1e17 }); // This is assuming that the monthly premium is 0.1 eth (1e17 wei)
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });
});
