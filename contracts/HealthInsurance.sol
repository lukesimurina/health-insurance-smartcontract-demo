pragma solidity ^0.4.15;

import "./Insurance.sol";

contract HealthInsurance is Insurance {
    struct InsuranceTaker {
        bool banned;
        bool policyValid;
        uint256 lastPayment;
        uint256 numClaims;
    }

    mapping(address => InsuranceTaker) public insuranceTakers;

    uint256 public paymentPeriod = 30 days;

    uint256 public premiumPerMonth = 0.1 ether;

    uint256 public maxCoverage = 5 ether;

    function underwrite() public payable {
        InsuranceTaker storage customer = insuranceTakers[msg.sender];

        // do not accept new customers that have been banned previously
        require(!customer.banned);

        // in order to underwrite the customer needs to pay the first premium upfront
        require(msg.value == getPremium(msg.sender));

        customer.lastPayment = now;
        customer.policyValid = true;
    }

    function update(address insuranceTaker) public {
        // if insurance taker did not pay within required interval they will loose their insurance
        // and will be banned for future insurance policies

        InsuranceTaker storage customer = insuranceTakers[insuranceTaker];

        if (
            customer.policyValid && customer.lastPayment + paymentPeriod < now
        ) {
            customer.policyValid = false;
            customer.banned = true;
        }
    }

    // checks if an insurance taker is currently insured
    function isInsured(
        address insuranceTaker
    ) public constant returns (bool insured) {
        InsuranceTaker storage customer = insuranceTakers[insuranceTaker];
        return
            customer.policyValid &&
            !customer.banned &&
            customer.lastPayment + paymentPeriod >= now;
    }

    // calculates the premium for an insurance taker
    function getPremium(
        address insuranceTaker
    ) public constant returns (uint256 premium) {
        InsuranceTaker storage customer = insuranceTakers[insuranceTaker];
        return (customer.numClaims + 1) * premiumPerMonth; // Monthly premium increases every claim
    }

    // allows premium to be paid by separate account
    function payPremiumFor(address insuranceTaker) public payable {
        InsuranceTaker storage customer = insuranceTakers[insuranceTaker];

        // only accept correct amount
        require(msg.value == getPremium(insuranceTaker));

        // check if last payment is overdue, if so -> ban
        update(insuranceTaker);

        // only accept payment from valid insurance takers
        require(isInsured(insuranceTaker));

        customer.lastPayment = now;
    }

    function claim(uint256 amount) public {
        require(isInsured(msg.sender));
        InsuranceTaker storage customer = insuranceTakers[msg.sender];

        require(amount <= maxCoverage); // Check if claimed amount is within coverage
        require(amount <= address(this).balance); // Ensure contract has sufficient funds for claim

        msg.sender.transfer(amount);
        customer.numClaims++;
    }
}
