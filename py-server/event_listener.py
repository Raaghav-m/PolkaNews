import asyncio
import json
import logging
import signal
import sys
import os
from typing import Dict, Any

from web3 import Web3
from websockets.server import serve
from websockets import connect
from websockets.exceptions import ConnectionClosed
import aiohttp

# Use the MINIMAL working model
from minimal_sentence_model import setup_and_verify
from config import Config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
server = None
websocket_clients = set()
setup_completed = False
web3_instance = None
contract = None
event_listener_running = False


class EventListener:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize Web3 HTTP connection for contract calls
        self.web3 = Web3(Web3.HTTPProvider(Config.WEB3_HTTP_URI))
        
        # Load contract ABI
        try:
            with open(Config.CONTRACT_ABI_PATH, 'r') as f:
                contract_abi = json.load(f)
        except FileNotFoundError:
            raise Exception(f"Contract ABI file not found: {Config.CONTRACT_ABI_PATH}")
        except json.JSONDecodeError:
            raise Exception(f"Invalid JSON in contract ABI file: {Config.CONTRACT_ABI_PATH}")
        
        # Create contract instance
        self.contract = self.web3.eth.contract(
            address=Config.CONTRACT_ADDRESS,
            abi=contract_abi
        )
        
        # Setup account for signing transactions
        private_key = os.getenv('PRIVATE_KEY')
        if not private_key:
            raise ValueError("PRIVATE_KEY must be set in environment variables")
        self.private_key = f"0x{private_key}" if not private_key.startswith('0x') else private_key
        self.account = self.web3.eth.account.from_key(self.private_key)
        self.logger.info(f"Event listener initialized with account: {self.account.address}")

    async def submit_verification_result(self, request_id: int, content_hash: str, is_proof_verified: bool, binary_decision: bool, proof: bytes, instances: list) -> None:
        """Submit verification result back to blockchain contract using submitVerificationResponse"""
        try:
            self.logger.info(f"Submitting verification response for request ID {request_id}")
            self.logger.info(f"Content Hash: {content_hash}")
            self.logger.info(f"Is Proof Verified: {is_proof_verified}")
            self.logger.info(f"Binary Decision: {binary_decision}")
            self.logger.info(f"Raw proof type: {type(proof)}")
            self.logger.info(f"Raw instances type: {type(instances)}")

            nonce = self.web3.eth.get_transaction_count(self.account.address)
            gas_price = self.web3.eth.gas_price
            
            # Convert proof to bytes if it's a hex string (like working example)
            if isinstance(proof, str):
                formatted_proof = bytes.fromhex(proof.replace('0x', ''))
            elif isinstance(proof, bytes):
                formatted_proof = proof
            else:
                self.logger.warning(f"Unknown proof format: {type(proof)}, using dummy proof")
                formatted_proof = b'\x00' * 32
            
            # Handle pub_inputs - convert formatted string to integers like working example
            if isinstance(instances, str):
                try:
                    parsed_instances = json.loads(instances.replace("'", '"'))
                    formatted_instances = [int(x, 16) for x in parsed_instances]  # HEX TO INT like working example
                except Exception as e:
                    self.logger.warning(f"Failed to parse string instances: {e}")
                    formatted_instances = [0]
            elif isinstance(instances, list):
                formatted_instances = instances
            else:
                self.logger.warning(f"Unexpected instances type: {type(instances)}, using dummy")
                formatted_instances = [0]
            
            self.logger.info(f"Formatted proof length: {len(formatted_proof)}")
            self.logger.info(f"Formatted instances: {formatted_instances}")
            
            # Create NewsVerificationResponse struct - CORRECT ORDER
            verification_response = (
                request_id,           # uint256 requestId
                content_hash,         # string contentHash
                is_proof_verified,    # bool isProofVerified
                binary_decision,      # bool binaryDecision
                formatted_proof,      # bytes proof
                formatted_instances   # uint256[] pubInputs
            )
            
            try:
                gas_estimate = self.contract.functions.submitVerificationResponse(
                    verification_response
                ).estimate_gas({'from': self.account.address})
                self.logger.info(f"Estimated gas: {gas_estimate}")
            except Exception as e:
                self.logger.error(f"Gas estimation failed: {str(e)}")
                raise ValueError(f"Transaction would fail: {str(e)}")
            
            tx = self.contract.functions.submitVerificationResponse(
                verification_response
            ).build_transaction({
                'from': self.account.address,
                'gas': gas_estimate + 100000,
                'gasPrice': gas_price,
                'nonce': nonce,
            })
            
            signed_tx = self.web3.eth.account.sign_transaction(tx, self.account.key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
            self.logger.info(f"Transaction sent: {tx_hash.hex()}")
            
            receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt['status'] == 0:
                self.logger.error("Transaction reverted")
                raise Exception("Transaction reverted")
                
            self.logger.info(f"✅ Verification response submitted successfully in block {receipt['blockNumber']}")
            
        except Exception as e:
            self.logger.error(f"Error submitting verification response: {str(e)}")
            raise


async def process_news_event(event_data, contract, web3_instance):
    """Process NewsSubmitted events - fetch content, verify, submit result"""
    global setup_completed
    
    try:
        if 'params' in event_data and 'result' in event_data['params']:
            log_data = event_data['params']['result']
            
            # Extract request ID from the event log
            decoded_event = contract.events.NewsSubmitted().process_log(log_data)
            request_id = decoded_event['args']['requestId']
            
            # Get the transaction hash from the log
            tx_hash = log_data.get('transactionHash')
            if not tx_hash:
                logger.error("❌ No transaction hash in event data")
                return
                
            logger.info(f"🔍 Getting transaction details for hash: {tx_hash}")
            
            # Get transaction details to extract the actual contentHash parameter
            try:
                # Get the transaction to find the IPFS hash (like in script.js)
                tx = web3_instance.eth.get_transaction(tx_hash)
                
                # Decode the transaction input to get the actual contentHash parameter
                try:
                    # Use contract.decode_function_input like in the JavaScript version
                    decoded_input = contract.decode_function_input(tx.input)
                    function_obj, function_inputs = decoded_input
                    
                    # Extract the IPFS hash from the function arguments (first argument)
                    content_hash = function_inputs.get('contentHash', '')
                    if not content_hash:
                        # Try alternative key names
                        content_hash = function_inputs.get('_contentHash', '')
                        if not content_hash and len(function_inputs) > 0:
                            # Get first argument value if key names don't match
                            content_hash = list(function_inputs.values())[0]
                    
                    logger.info(f"📰 Extracted contentHash from transaction: {content_hash}")
                        
                except Exception as decode_error:
                    logger.error(f"❌ Failed to decode transaction input: {decode_error}")
                    return
                    
            except Exception as tx_error:
                logger.error(f"❌ Failed to get transaction: {tx_error}")
                return

            if not content_hash:
                logger.error("❌ Could not extract contentHash from transaction")
                return

            logger.info(f"📰 NewsSubmitted event received for content hash: {content_hash}")

            # 1. Fetch content from IPFS via Pinata gateway
            pinata_url = f"https://gateway.pinata.cloud/ipfs/{content_hash}"
            logger.info(f"☁️ Fetching content from {pinata_url}")
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(pinata_url) as response:
                        print(response)
                        if response.status == 200:
                            ipfs_data = await response.json()
                            claim = ipfs_data.get("content")
                            logger.info(f"📄 Claim content fetched: '{claim[:100]}...'")
                        else:
                            error_msg = f"Failed to fetch from Pinata for {content_hash}: HTTP {response.status}"
                            logger.error(f"❌ {error_msg}")
                            return
            except Exception as e:
                error_msg = f"Error fetching/parsing from Pinata for {content_hash}: {e}"
                logger.error(f"❌ {error_msg}", exc_info=True)
                return

            # 2. Prepare for verification
            evidence = "this is evidence"
            if not claim:
                error_msg = f"Claim content is empty for {content_hash}."
                logger.error(f"❌ {error_msg}")
                return

            # 3. Call ZKML verification
            try:
                result = await setup_and_verify(
                    claim,
                    evidence,
                    setup_required=False
                )
                
                if not setup_completed:
                    setup_completed = True
                    logger.info("✅ Circuit setup completed")

                logger.info(f"✅ ZKML verification complete for {content_hash}")
                logger.info(f"Binary Decision: {result.get('binary_decision')}")
                logger.info(f"Proof Verified: {result.get('proof_verified')}")

                # 4. Submit verification result back to blockchain
                event_listener = EventListener()
                await event_listener.submit_verification_result(
                    request_id,
                    content_hash,
                    result.get('proof_verified', False),  # is_proof_verified
                    bool(result.get('binary_decision', 0)),  # binary_decision
                    result.get('proof', {}),  # Pass the raw proof dict from EZKL
                    result.get('pub_inputs', [])  # Pass formatted pub_inputs string
                )

            except Exception as e:
                error_msg = f"ZKML verification failed for {content_hash}: {str(e)}"
                logger.error(f"❌ {error_msg}", exc_info=True)
                
                # Submit failed verification result
                try:
                    event_listener = EventListener()
                    await event_listener.submit_verification_result(
                        request_id,
                        content_hash,
                        False,  # is_proof_verified = False
                        False,  # binary_decision = False
                        b'\x00' * 32,  # dummy bytes proof (not empty dict)
                        [0]      # dummy uint256[] instances (not empty list)
                    )
                except Exception as submit_error:
                    logger.error(f"❌ Failed to submit error result: {submit_error}")
        else:
            raise ValueError("Invalid event data format")
        
    except Exception as e:
        logger.error(f"❌ Error in process_news_event: {e}", exc_info=True)


async def start_blockchain_monitoring():
    """Start blockchain event monitoring - runs in background"""
    global web3_instance, contract
    
    logger.info("🔗 Initializing blockchain event monitoring...")
    logger.info("🔗 Connecting to blockchain...")
    logger.info(f"📡 HTTP URI: {Config.WEB3_HTTP_URI}")
    logger.info(f"📡 WebSocket URI: {Config.WEB3_WS_URI}")
    logger.info(f"📋 Contract Address: {Config.CONTRACT_ADDRESS}")
    
    # Initialize Web3 HTTP connection
    web3_instance = Web3(Web3.HTTPProvider(Config.WEB3_HTTP_URI))
    logger.info("✅ Blockchain HTTP connection established")
    
    # Load contract ABI
    try:
        with open(Config.CONTRACT_ABI_PATH, 'r') as f:
            contract_abi = json.load(f)
    except FileNotFoundError:
        raise Exception(f"Contract ABI file not found: {Config.CONTRACT_ABI_PATH}")
    except json.JSONDecodeError:
        raise Exception(f"Invalid JSON in contract ABI file: {Config.CONTRACT_ABI_PATH}")
    
    # Create contract instance
    contract = web3_instance.eth.contract(
        address=Config.CONTRACT_ADDRESS,
        abi=contract_abi
    )
    logger.info("📋 Contract instance created")
    logger.info("🎯 Ready for real-time NewsSubmitted events!")
    
    logger.info("🔄 Real-time blockchain event monitoring started")
    logger.info("🔄 Waiting for connections...")
    
    # Start WebSocket monitoring
    while True:
        try:
            async with connect(Config.WEB3_WS_URI) as ws:
                logger.info("🔗 Connected to blockchain WebSocket")
                
                # Get NewsSubmitted event topic hash
                news_submitted_topic = contract.events.NewsSubmitted().build_filter().topics[0]
                
                subscribe_msg = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "eth_subscribe",
                    "params": [
                        "logs",
                        {
                            "address": Config.CONTRACT_ADDRESS.lower(),
                            "topics": [news_submitted_topic]
                        }
                    ]
                }
                
                await ws.send(json.dumps(subscribe_msg))
                subscription_response = await ws.recv()
                logger.debug(f"Raw subscription response: {subscription_response}")
                
                response_data = json.loads(subscription_response)
                if 'error' in response_data:
                    raise Exception(f"Subscription error: {response_data['error']}")
                
                subscription_id = response_data.get('result')
                if not subscription_id:
                    raise Exception("No subscription ID received")
                    
                logger.info(f"✅ Successfully subscribed to NewsSubmitted events with ID: {subscription_id}")
                
                # Keep listening for events
                async for message in ws:
                    try:
                        logger.debug(f"Received raw message: {message}")
                        
                        event_data = json.loads(message)
                        if 'params' in event_data and 'result' in event_data['params']:
                            logger.info("🎉 Detected NewsSubmitted event, processing...")
                            await process_news_event(event_data, contract, web3_instance)
                        
                    except json.JSONDecodeError:
                        logger.error("Invalid JSON in WebSocket message")
                    except Exception as e:
                        logger.error(f"Error processing message: {str(e)}", exc_info=True)
                        
        except ConnectionClosed:
            logger.info("WebSocket connection closed")
        except Exception as e:
            logger.error(f"❌ WebSocket connection error: {str(e)}", exc_info=True)
            logger.info("🔄 Trying to reconnect...")
            await asyncio.sleep(2)


async def handle_client(websocket, path):
    """Handle WebSocket client connections - EXACT working pattern"""
    global setup_completed
    
    websocket_clients.add(websocket)
    logger.info(f"New client connected. Total clients: {len(websocket_clients)}")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                logger.info(f"Received message: {data}")
                
                if data.get("type") == "sentence_verification":
                    claim = data.get("claim", "")
                    evidence = data.get("evidence", "")
                    
                    if not claim or not evidence:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": "Both claim and evidence are required"
                        }))
                        continue
                    
                    # Notify start of verification
                    await websocket.send(json.dumps({
                        "type": "status",
                        "message": f"🔍 Starting verification for claim: '{claim[:50]}...'"
                    }))
                    
                    try:
                        # Use minimal model - setup only on first use
                        result = await setup_and_verify(
                            claim,
                            evidence,
                            setup_required=False
                        )
                        
                        if not setup_completed:
                            setup_completed = True
                            await websocket.send(json.dumps({
                                "type": "status",
                                "message": "✅ Circuit setup completed"
                            }))
                        
                        # Send result
                        await websocket.send(json.dumps({
                            "type": "sentence_verification_result",
                            "result": result
                        }))
                        
                        logger.info(f"Verification completed: {bool(result['binary_decision'])}")
                        
                    except Exception as e:
                        error_msg = f"Verification failed: {str(e)}"
                        logger.error(error_msg)
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": error_msg
                        }))
                
                elif data.get("type") == "health_check":
                    await websocket.send(json.dumps({
                        "type": "health_check_response",
                        "status": "healthy",
                        "setup_completed": setup_completed
                    }))
                
                else:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": f"Unknown message type: {data.get('type')}"
                    }))
                    
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": f"Processing error: {str(e)}"
                }))
                
    except ConnectionClosed:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
    finally:
        websocket_clients.discard(websocket)
        logger.info(f"Client removed. Total clients: {len(websocket_clients)}")


async def start_server():
    """Start the WebSocket server - EXACT working pattern"""
    global server
    
    host = "0.0.0.0"
    port = 8765
    
    logger.info(f"🚀 Starting MINIMAL sentence verification server on {host}:{port}")
    logger.info("📝 This server uses a minimal 6-feature model for fast ZK proof generation")
    
    # Validate configuration
    Config.validate_config()
    
    try:
        # Start blockchain monitoring in background
        blockchain_task = asyncio.create_task(start_blockchain_monitoring())
        
        # Start WebSocket server
        server = await serve(handle_client, host, port)
        logger.info("✅ WebSocket server started successfully")
        
        # Keep server running
        await server.wait_closed()
        
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise


def signal_handler(signum, frame):
    """Handle shutdown signals - EXACT working pattern"""
    logger.info(f"Received signal {signum}. Shutting down...")
    
    # Close all client connections
    if websocket_clients:
        logger.info(f"Closing {len(websocket_clients)} client connections...")
        for ws in websocket_clients.copy():
            asyncio.create_task(ws.close())
    
    # Close server
    if server:
        server.close()
    
    sys.exit(0)


if __name__ == "__main__":
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        sys.exit(1)