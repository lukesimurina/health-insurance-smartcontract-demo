/**
 * Contract artifacts
 */
const HealthInsurance = artifacts.require("./HealthInsurance");

const BigNumber = web3.BigNumber;

const should = require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bignumber")(BigNumber))
    .should();

/**
 * Expect exception throw above call of assertJump()
 *
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

        let tx = await insuranceInstance.underwrite({ value: 1e17 });
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
            value: 1e17,
        });

        let contractBalanceAfter = await web3.eth.getBalance(
            insuranceInstance.address
        );

        let b = contractBalanceBefore.toNumber();
        let a = contractBalanceAfter.toNumber();

        contractBalanceBefore
            .plus(1e17)
            .should.be.bignumber.equal(contractBalanceAfter);
    });

    it("pays premium for health insurance for multiple months", async () => {
        for (var payments = 0; payments < 10; payments++) {
            await insuranceInstance.payPremiumFor(accounts[0], { value: 1e17 });
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

        await insuranceInstance.claim(1e18); // Assuming the claim amount is 1 ether

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
            await insuranceInstance.payPremiumFor(accounts[0], { value: 1e17 });
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
            await insuranceInstance.payPremiumFor(accounts[1], { value: 1e17 });
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails to claim more than maximum coverage", async () => {
        try {
            await insuranceInstance.claim(6e18); // Assuming maximum coverage is 5 ether
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails for insured user to claim without coverage", async () => {
        try {
            await insuranceInstance.claim(1e18); // Assuming the claim amount is 1 ether
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails for insured user to make multiple claims in short timeframe", async () => {
        await insuranceInstance.underwrite({ value: 1e18 });

        await insuranceInstance.claim(1e18); // Assuming the claim amount is 1 ether

        await increaseTime(60 * 60); // Move time forward by 1 hour

        try {
            await insuranceInstance.claim(1e18); // Attempting to make another claim too soon
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("policy expires after multiple missed premium payments", async () => {
        await insuranceInstance.underwrite({ value: 1e18 });

        await increaseTime(31 * 24 * 60 * 60); // Move time forward to expire policy

        let insured = await insuranceInstance.isInsured(accounts[0]);
        assert.isFalse(
            insured,
            "User should not be insured anymore after policy expiry"
        );
    });

    it("fails to pay premium after policy expiry", async () => {
        await increaseTime(31 * 24 * 60 * 60); // Move time forward to expire policy

        try {
            await insuranceInstance.payPremiumFor(accounts[0], { value: 1e17 });
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails to make a claim after policy expiry", async () => {
        await increaseTime(31 * 24 * 60 * 60); // Move time forward to expire policy

        try {
            await insuranceInstance.claim(1e18); // Assuming the claim amount is 1 ether
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });

    it("fails to underwrite a banned user", async () => {
        await insuranceInstance.underwrite({ value: 1e18 }); // Underwrite normally

        // Expire user's policy
        await increaseTime(31 * 24 * 60 * 60);
        await insuranceInstance.update(accounts[0]);

        // Attempt to underwrite the banned user again
        try {
            await insuranceInstance.underwrite({ value: 1e17 });
            assert.fail("should have thrown before");
        } catch (error) {
            assertJump(error);
        }
    });
});
