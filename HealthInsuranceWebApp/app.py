from flask import Flask, render_template, request, redirect, url_for, flash, make_response
from web3 import Web3
import json
import os
import tempfile
import shutil
import time

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# Connect to Ethereum client
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

# Check connection
if w3.is_connected():
    print("Web3 is connected")
else:
    print("Web3 is not connected")

# Set default account
if len(w3.eth.accounts) > 0:
    w3.eth.default_account = w3.eth.accounts[0]
    print("Default Account Set:", w3.eth.default_account)
else:
    print("No accounts found")

with open('config.json', 'r') as config_file:
    config = json.load(config_file)

contract = w3.eth.contract(address=config['contractAddress'], abi=json.loads(config['abi']))

def log_transaction(description, cost, status, account, gas_used):
    try:
        with open("transactions.json", "r") as file:
            transactions = json.load(file)

        transactions.append({
            "description": description,
            "cost": cost,
            "status": status,
            "account": account,
            "gas_used": gas_used
        })

        with tempfile.NamedTemporaryFile('w', delete=False) as temp_file:
            json.dump(transactions, temp_file, indent=4)
            temp_path = temp_file.name
        shutil.move(temp_path, "transactions.json")
    except Exception as e:
        print(f"Failed to log transaction: {e}")

def initialize_transactions_log():
    with open('transactions.json', 'w') as file:
        json.dump([], file)



@app.route('/')
def index():
    selected_account = request.cookies.get('selectedAccount', w3.eth.default_account)
    insured_status = contract.functions.isInsured(selected_account).call()
    banned_status = contract.functions.isBanned(selected_account).call()
    
    last_payment = contract.functions.getLastPaymentTime(selected_account).call()
    current_time = int(time.time())
    payment_period_seconds = 30 * 24 * 3600  # 30 days in seconds
    remaining_payment_seconds = max(0, last_payment + payment_period_seconds - current_time)

    last_claim_time = contract.functions.getLastClaimTime(selected_account).call()
    claim_cooldown_seconds = 86400  # Assuming claim cooldown is set to 1 day (86400 seconds)
    remaining_claim_seconds = max(0, last_claim_time + claim_cooldown_seconds - current_time)

    user_balance = w3.eth.get_balance(selected_account)
    contract_balance = w3.eth.get_balance(config['contractAddress'])

    try:
        with open("transactions.json", "r") as file:
            all_transactions = json.load(file)
            transactions = [tx for tx in all_transactions if tx['account'] == selected_account]
    except Exception as e:
        transactions = []
        flash('danger', f"Failed to load transactions: {e}")

    return render_template('index.html', insured=insured_status, banned=banned_status,
                           user_balance=w3.from_wei(user_balance, 'ether'),
                           contract_balance=w3.from_wei(contract_balance, 'ether'),
                           accounts=w3.eth.accounts, selected_account=selected_account,
                           transactions=transactions, remaining_payment_seconds=remaining_payment_seconds,
                           remaining_claim_seconds=remaining_claim_seconds)

@app.route('/all_transactions')
def all_transactions():
    try:
        with open("transactions.json", "r") as file:
            transactions = json.load(file)
    except Exception as e:
        transactions = []
        flash('danger', f"Failed to load transactions: {e}")
    
    return render_template('all_transactions.html', transactions=transactions)

@app.route('/set_account', methods=['POST'])
def set_account():
    selected_account = request.form.get('selectedAccount')
    response = make_response(redirect(url_for('index')))
    response.set_cookie('selectedAccount', selected_account)
    return response

@app.route('/underwrite', methods=['POST'])
def underwrite():
    selected_account = request.cookies.get('selectedAccount', w3.eth.default_account)
    premium = w3.to_wei(0.1, 'ether')
    try:
        tx_hash = contract.functions.underwrite().transact({'from': selected_account, 'value': premium})
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        log_transaction("Underwrite Policy", str(w3.from_wei(premium, 'ether')) + ' ETH', "Success", selected_account, receipt['gasUsed'])
        flash('success', 'Policy underwritten successfully!')
    except Exception as e:
        log_transaction("Underwrite Policy", str(w3.from_wei(premium, 'ether')) + ' ETH', "Failed", selected_account, 0)
        flash('danger', str(e))
    return redirect(url_for('index'))

@app.route('/pay_premium', methods=['POST'])
def pay_premium():
    selected_account = request.cookies.get('selectedAccount', w3.eth.default_account)
    other_account = request.form.get('other_account') or selected_account

    # Retrieve the correct premium from the contract
    try:
        premium = contract.functions.getPremium(other_account).call()
        tx_hash = contract.functions.payPremiumFor(other_account).transact({'from': selected_account, 'value': premium})
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        gas_used = receipt['gasUsed']
        log_transaction(f"Pay Premium for {other_account}", str(w3.from_wei(premium, 'ether')) + ' ETH', "Success", selected_account, gas_used)
        flash('success', f'Premium paid successfully for {other_account}!')
    except Exception as e:
        log_transaction(f"Pay Premium for {other_account}", str(w3.from_wei(premium, 'ether')) + ' ETH', "Failed", selected_account, 0)
        flash('danger', f'Failed to pay premium for {other_account}: {str(e)}')

    return redirect(url_for('index'))





@app.route('/claim', methods=['POST'])
def claim():
    selected_account = request.cookies.get('selectedAccount', w3.eth.default_account)
    claim_amount_eth = float(request.form.get('claim_amount'))
    claim_amount = w3.to_wei(claim_amount_eth, 'ether')
    try:
        tx_hash = contract.functions.claim(claim_amount).transact({'from': selected_account})
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        log_transaction("Make a Claim", f"{claim_amount_eth} ETH", "Success", selected_account, receipt['gasUsed'])
        flash('success', 'Claim made successfully!')
    except Exception as e:
        log_transaction("Make a Claim", f"{claim_amount_eth} ETH", "Failed", selected_account, 0)
        flash('danger', str(e))
    return redirect(url_for('index'))

if __name__ == '__main__':
    initialize_transactions_log()
    app.run(debug=True)
