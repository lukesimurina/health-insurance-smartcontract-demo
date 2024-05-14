# health-insurance-smartcontract-demo

Demo of a minimal health insurance policy as a Smart Contract on the Ethereum Blockchain. This project serves as a sample for the toolchain involving

-   yarn as package manager
-   truffle as testing framework
-   solidity coverage for test coverage

## Running tests

-   Requires node js 8.17.0

-   `yarn` to install all packages
-   `npm start` to start testrpc
-   leave testrpc running and open new terminal window in which you execute the following commands
-   `npm run compile` to see if you can compile everything (you can skip this step)
-   `npm run migrate` to see if you can migrate to testrpc (you can skip this step)
-   `npm run test` to run the truffle tests
-   `npm run coverage` to generate a test coverage report - you see an output in the command line and an output coverage report will be generated in a separate folder