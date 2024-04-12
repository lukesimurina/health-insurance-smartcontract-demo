pragma solidity ^0.4.15;

// abstract base contract for insurances
contract Insurance {
    function underwrite() public payable;

    function update(address insuranceTaker) public;

    function isInsured(
        address insuranceTaker
    ) public constant returns (bool insured);

    function getPremium(
        address insuranceTaker
    ) public constant returns (uint256 premium);

    // fallback function accepts premium payment for msg.sender;
    function() public payable {
        payPremiumFor(msg.sender);
    }

    function payPremiumFor(address insuranceTaker) public payable;

    function claim(uint256 amount) public;
}
