// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./Insurance.sol";

contract HealthInsurance is Insurance {
    struct InsuranceTaker {
        bool banned;
        bool policyValid;
        uint256 lastPayment;
        uint256 numClaims;
        uint256 lastClaimTime; // Track the last claim time
    }

    mapping(address => InsuranceTaker) public insuranceTakers;

    uint256 public paymentPeriod = 30 days;
    uint256 public premiumPerMonth = 0.1 ether;
    uint256 public maxCoverage = 5 ether;
    uint256 public claimCooldown = 1 days; // Cooldown period for making claims

    function underwrite() public payable override {
        InsuranceTaker storage customer = insuranceTakers[msg.sender];
        require(!customer.banned, "Customer is banned.");
        require(
            msg.value == getPremium(msg.sender),
            "Incorrect premium amount."
        );
        customer.lastPayment = block.timestamp;
        customer.policyValid = true;
    }

    function update(address insuranceTaker) public override {
        InsuranceTaker storage customer = insuranceTakers[insuranceTaker];
        if (
            customer.policyValid &&
            (customer.lastPayment + paymentPeriod < block.timestamp)
        ) {
            customer.policyValid = false;
            customer.banned = true;
        }
    }

    function isInsured(
        address insuranceTaker
    ) public view override returns (bool) {
        InsuranceTaker storage customer = insuranceTakers[insuranceTaker];
        return
            customer.policyValid &&
            !customer.banned &&
            (customer.lastPayment + paymentPeriod >= block.timestamp);
    }

    function getPremium(
        address insuranceTaker
    ) public view override returns (uint256) {
        InsuranceTaker storage customer = insuranceTakers[insuranceTaker];
        return (customer.numClaims + 1) * premiumPerMonth;
    }

    function payPremiumFor(address insuranceTaker) public payable override {
        InsuranceTaker storage customer = insuranceTakers[insuranceTaker];
        require(
            msg.value == getPremium(insuranceTaker),
            "Incorrect amount paid."
        );
        update(insuranceTaker);
        require(isInsured(insuranceTaker), "Insurance is not valid.");
        customer.lastPayment = block.timestamp;
    }

    function claim(uint256 amount) public override {
        InsuranceTaker storage customer = insuranceTakers[msg.sender];
        require(isInsured(msg.sender), "Caller is not insured.");
        require(
            amount <= maxCoverage,
            "Claim amount exceeds maximum coverage."
        );
        require(
            block.timestamp >= customer.lastClaimTime + claimCooldown,
            "Claim cooldown not met."
        );
        require(
            address(this).balance >= amount,
            "Insufficient funds to cover claim."
        );
        payable(msg.sender).transfer(amount);
        customer.numClaims++;
        customer.lastClaimTime = block.timestamp; // Update the last claim time
    }

    function getLastPaymentTime(
        address insuranceTaker
    ) public view returns (uint256) {
        return insuranceTakers[insuranceTaker].lastPayment;
    }

    function getLastClaimTime(
        address insuranceTaker
    ) public view returns (uint256) {
        return insuranceTakers[insuranceTaker].lastClaimTime;
    }

    function isBanned(address insuranceTaker) public view returns (bool) {
        return insuranceTakers[insuranceTaker].banned;
    }
}
