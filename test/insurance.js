const assert = require("assert");
const HealthInsurance = artifacts.require("HealthInsurance");

function increaseTime(duration) {
    const id = Date.now();
    return new Promise((resolve, reject) => {
        web3.currentProvider.send(
            {
                jsonrpc: "2.0",
                method: "evm_increaseTime",
                params: [duration],
                id: id,
            },
            (err1) => {
                if (err1) return reject(err1);

                web3.currentProvider.send(
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

    it("should confirm that the health insurance contract is deployed", async function () {
        assert.ok(
            insuranceInstance.address,
            "Contract should be deployed and have an address"
        );
    });

    it("should insure a user with health insurance", async () => {
        let insured = await insuranceInstance.isInsured(accounts[0]);
        assert.strictEqual(
            insured,
            false,
            "User should not be insured initially"
        );

        let payment = web3.utils.toWei("0.1", "ether");
        await insuranceInstance.underwrite({
            from: accounts[0],
            value: payment,
        });
        insured = await insuranceInstance.isInsured(accounts[0]);
        assert.strictEqual(insured, true, "User should now be insured");
    });

    it("should pay premium for health insurance", async () => {
        let contractBalanceBefore = await web3.eth.getBalance(
            insuranceInstance.address
        );
        let premium = web3.utils.toWei("0.1", "ether");

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: insuranceInstance.address,
            value: premium,
        });
        let contractBalanceAfter = await web3.eth.getBalance(
            insuranceInstance.address
        );

        assert.strictEqual(
            contractBalanceAfter,
            (BigInt(contractBalanceBefore) + BigInt(premium)).toString(),
            "Balance after premium payment should be correct"
        );
    });

    it("should pay premium for health insurance for 3 months", async () => {
        const monthlyPremium = web3.utils.toWei("0.1", "ether");
        await insuranceInstance.underwrite({
            from: accounts[0],
            value: monthlyPremium,
        }); // Ensure the policy is initially active

        for (let i = 0; i < 3; i++) {
            await increaseTime(30 * 24 * 60 * 60); // Move time forward by 30 days
            await insuranceInstance.payPremiumFor(accounts[0], {
                from: accounts[0],
                value: monthlyPremium,
            });
        }
        let insured = await insuranceInstance.isInsured(accounts[0]);
        assert.strictEqual(
            insured,
            true,
            "User should still be insured after 3 months of premiums"
        );
    });

    it("should initiate and verify the claim process for health insurance", async () => {
        const premium = web3.utils.toWei("0.1", "ether"); // Ensure it's the correct amount to activate the policy
        const claimAmount = web3.utils.toWei("0.5", "ether"); // This must be less than maxCoverage and contract balance

        // Fund the contract to ensure it can cover the claim
        await web3.eth.sendTransaction({
            from: accounts[1],
            to: insuranceInstance.address,
            value: web3.utils.toWei("2", "ether"),
        });

        // Underwrite the insurance policy
        await insuranceInstance.underwrite({
            from: accounts[0],
            value: premium,
        });

        // Ensure the policy is active
        const isInsured = await insuranceInstance.isInsured(accounts[0]);
        assert(isInsured, "Policy should be active after underwriting");

        // Check contract balance to ensure it's sufficient for the claim
        const contractBalance = await web3.eth.getBalance(
            insuranceInstance.address
        );
        assert(
            BigInt(contractBalance) >= BigInt(claimAmount),
            "Contract should have sufficient funds to cover the claim"
        );

        // Attempt to make a claim
        try {
            const tx = await insuranceInstance.claim(claimAmount, {
                from: accounts[0],
            });
            assert(tx, "Transaction should succeed");

            // Confirm the claim incremented the numClaims
            const customer = await insuranceInstance.insuranceTakers(
                accounts[0]
            );
            assert.equal(
                customer.numClaims.toNumber(),
                1,
                "Claims count should be incremented"
            );
        } catch (error) {
            assert.fail("Claim should not fail: " + error.message);
        }
    });

    it("should lose insurance if premium is not paid in time", async () => {
        await increaseTime(31 * 24 * 60 * 60); // Move time forward by 31 days
        let insured = await insuranceInstance.isInsured(accounts[0]);
        assert.strictEqual(
            insured,
            false,
            "User should not be insured anymore after failing to pay premium on time"
        );
    });

    it("should fail to underwrite with insufficient payment", async () => {
        try {
            await insuranceInstance.underwrite({ from: accounts[0], value: 0 });
            assert.fail("Should have thrown an error for insufficient payment");
        } catch (error) {
            assert(
                error.message.includes("revert"),
                "Expected revert for insufficient payment"
            );
        }
    });

    // Additional tests can be similarly added to handle other cases
});
