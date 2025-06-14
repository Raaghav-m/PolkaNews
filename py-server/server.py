from flask import Flask, jsonify
import json
import logging
import os
from web3 import Web3
from flask_cors import CORS
from dotenv import load_dotenv

from event_listener import ContractEventListener

load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Flask app setup
app = Flask(__name__)
CORS(app)

# Web3 configuration
WEB3_WS_URI = os.getenv('WEB3_WS_URI', "wss://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY")
WEB3_HTTP_URI = os.getenv('WEB3_HTTP_URI', "https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY")
w3 = Web3(Web3.HTTPProvider(WEB3_HTTP_URI))

# Contract configuration
CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS')
CONTRACT_ABI_PATH = os.getenv('CONTRACT_ABI_PATH', './contract_abi.json')

# Load contract ABI
try:
    with open(CONTRACT_ABI_PATH, 'r') as f:
        CONTRACT_ABI = json.load(f)
except FileNotFoundError:
    logger.warning(f"Contract ABI file not found at {CONTRACT_ABI_PATH}")
    CONTRACT_ABI = []

# Initialize contract and account
contract = None
account = None

if CONTRACT_ADDRESS and CONTRACT_ABI:
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=CONTRACT_ABI
    )

# Setup private key for transactions
private_key = os.getenv('PRIVATE_KEY')
if private_key:
    private_key = f"0x{private_key}" if not private_key.startswith('0x') else private_key
    account = w3.eth.account.from_key(private_key)
    logger.info(f"Account initialized: {account.address}")

# Initialize event listener
event_listener = ContractEventListener(w3, contract, account)

# Flask Routes
@app.route('/status')
def status():
    """Health check endpoint"""
    return jsonify({
        "status": "running",
        "contract_address": CONTRACT_ADDRESS,
        "listener_running": event_listener.running,
        "circuit_setup_complete": event_listener.circuit_setup_complete,
        "web3_connected": w3.is_connected()
    })

@app.route('/start', methods=['POST'])
def start_server():
    """Start the event listener"""
    try:
        event_listener.start()
        return jsonify({"status": "success", "message": "Event listener started"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/stop', methods=['POST'])
def stop_server():
    """Stop the event listener"""
    try:
        event_listener.stop()
        return jsonify({"status": "success", "message": "Event listener stopped"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    logger.info("Server will automatically listen for contract events and generate proofs")
    
    # Auto-start event listener if contract is configured
    if CONTRACT_ADDRESS and CONTRACT_ABI:
        event_listener.start()
        logger.info("Event listener auto-started")
    else:
        logger.warning("Contract not configured - event listener not started")
    
    app.run(host='0.0.0.0', port=5001, debug=True) 