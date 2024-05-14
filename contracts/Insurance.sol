// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// abstract base contract for insurances
abstract contract Insurance {
    function underwrite() public payable virtual;

    function update(address insuranceTaker) public virtual;

    function isInsured(
        address insuranceTaker
    ) public view virtual returns (bool insured);

    function getPremium(
        address insuranceTaker
    ) public view virtual returns (uint256 premium);

    // fallback function accepts premium payment for msg.sender;
    fallback() external payable virtual {
        payPremiumFor(msg.sender);
    }

    // receive function to handle plain Ether transfers
    receive() external payable virtual {}

    function payPremiumFor(address insuranceTaker) public payable virtual;

    function claim(uint256 amount) public virtual;
}
