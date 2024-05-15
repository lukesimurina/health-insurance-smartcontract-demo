Health Insurance Blockchain System

This project demonstrates a blockchain-based health insurance system using Ethereum smart contracts. It includes a Flask web application that interacts with the smart contract deployed on an Ethereum blockchain. The demo uses Ganache as a local blockchain for development and testing.

Dependencies:

-   Python 3: The programming language used for the Flask web server. Download from https://www.python.org/downloads/ (Works with 3.9.5)
-   Node.js and npm: Needed for running Ganache CLI and Truffle Suite. Download from https://nodejs.org/en/download/ (16.20.2)
-   Flask: Python web framework. Documentation at http://flask.palletsprojects.com/en/1.1.x/installation/
-   Web3.py: A Python library for interacting with Ethereum. Documentation at https://web3py.readthedocs.io/en/stable/
-   Ganache CLI: Personal blockchain for Ethereum development. Install via npm with npm install -g ganache-cli
-   Truffle Suite: A development environment, testing framework, and asset pipeline for blockchains using the Ethereum Virtual Machine (EVM). Visit https://www.trufflesuite.com/truffle

Setup:

1. Clone the Repository.

2. Install Node.js Dependencies:
   Use the command npm install

3. Start Ganache CLI:
   Use the command npm start

4. Compile and Migrate Smart Contracts:
   Compile the smart contracts using Truffle with the command npm run compile
   Migrate the smart contracts to the local blockchain with the command npm run migrate

5. Set Up Python Environment:
   It's recommended to use a virtual environment. Use the commands:
   python -m venv venv
   source venv/bin/activate (on Windows use venv\Scripts\activate)

6. Install Python Dependencies:
   Use the command pip install -r requirements.txt
   Ensure your requirements.txt includes:
   Flask
   web3==5.25.0

7. Run the Flask Application:
   Use the command py app.py
   This will start the Flask server and serve the web application at http://127.0.0.1:5000/.

Usage:
After starting the Flask application, navigate to http://127.0.0.1:5000/ in your web browser to interact with the health insurance system. You can underwrite policies, pay premiums, and make claims through the web interface.
