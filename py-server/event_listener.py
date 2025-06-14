import asyncio
import json
import logging
import os
from web3 import Web3
from threading import Thread
import torch
import torch.nn as nn
import ezkl
import numpy as np
from typing import List, Dict, Any, Union
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA
import subprocess

from config import Paths

load_dotenv()

def check_system_dependencies():
    """Check and report on system dependencies needed for EZKL EVM verifier"""
    dependencies = {
        'solc': 'Solidity compiler (needed for EVM verifier)',
        'node': 'Node.js (needed for npm packages)',
        'npm': 'NPM package manager'
    }
    
    missing_deps = []
    
    for dep, description in dependencies.items():
        try:
            result = subprocess.run(['which', dep], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ {dep} found at: {result.stdout.strip()}")
            else:
                print(f"❌ {dep} not found - {description}")
                missing_deps.append(dep)
        except Exception as e:
            print(f"❓ Could not check for {dep}: {str(e)}")
            missing_deps.append(dep)
    
    if missing_deps:
        print("\n💡 To install missing dependencies:")
        if 'node' in missing_deps or 'npm' in missing_deps:
            print("   - Install Node.js: https://nodejs.org/")
        if 'solc' in missing_deps:
            print("   - Install solc: npm install -g solc")
            print("   - Or via pip: pip install py-solc-x")
    
    return len(missing_deps) == 0

class SimpleZKMLModel(nn.Module):
    """ZKML model for sentence pair verification with input size 32"""
    def __init__(self):
        super(SimpleZKMLModel, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        return self.net(x)

def get_model():
    """Get initialized model instance"""
    model = SimpleZKMLModel()
    model.eval()
    return model

def setup_sentence_preprocessing():
    """Setup sentence transformer and PCA for preprocessing"""
    encoder = SentenceTransformer("sentence-transformers/paraphrase-MiniLM-L6-v2")
    
    # Train PCA (need at least 16+ samples)
    samples = [
        "Cats are animals.", "Dogs are loyal.", "The sky is blue.", "Water boils at 100C.",
        "Sun rises in the east.", "Fire is hot.", "Snow is cold.", "Fish swim.",
        "Birds fly.", "Humans need oxygen.", "The Earth orbits the Sun.", "Time is continuous.",
        "Energy is conserved.", "Gravity pulls downward.", "Sound travels in waves.",
        "Light is electromagnetic.", "Plants need sunlight.", "Electrons carry charge."
    ]
    X = encoder.encode(samples)
    pca = PCA(n_components=16)
    pca.fit(X)
    
    return encoder, pca

def preprocess_sentence_pair(claim, evidence, encoder, pca):
    """Preprocess claim and evidence sentences into 32-dim vector"""
    c_vec = encoder.encode(claim)
    e_vec = encoder.encode(evidence)
    c_pca = pca.transform([c_vec])[0]
    e_pca = pca.transform([e_vec])[0]
    return np.concatenate([c_pca, e_pca]).tolist()

class ContractEventListener:
    def __init__(self, w3: Web3, contract, account=None):
        self.running = False
        self.logger = logging.getLogger(__name__)
        self.circuit_setup_complete = False
        self.w3 = w3
        self.contract = contract
        self.account = account
        self.model = get_model()
        self.encoder = None
        self.pca = None

    async def create_evm_verifier_with_subprocess(self):
        """Create EVM verifier by calling the ezkl binary directly."""
        self.logger.info("Attempting to create EVM verifier using direct subprocess call...")
        print("⚡️ Attempting to create EVM verifier with a direct subprocess call...")

        # Command to be executed
        command = [
            "ezkl", "create-evm-verifier",
            "--vk-path", Paths.VK_PATH,
            "--sol-code-path", Paths.SOL_CODE_PATH,
            "--abi-path", Paths.ABI_PATH,
            "--settings-path", Paths.SETTINGS_PATH
        ]

        try:
            # We must capture output to see errors
            result = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await result.communicate()
            
            self.logger.info(f"Subprocess stdout: {stdout.decode()}")
            if stderr:
                self.logger.error(f"Subprocess stderr: {stderr.decode()}")

            if result.returncode == 0:
                print("✅✅✅ EVM Verifier generated successfully via subprocess! ✅✅✅")
                self.logger.info("EVM Verifier generated successfully via subprocess.")
                return True
            else:
                print(f"❌ Subprocess call to create EVM verifier failed with return code {result.returncode}.")
                print(f"Error: {stderr.decode()}")
                self.logger.error(f"Subprocess failed: {stderr.decode()}")
                return False

        except FileNotFoundError:
            print("❌❌❌ 'ezkl' command not found. The binary is not in your PATH. ❌❌❌")
            print("💡 Please find the 'ezkl' binary in your conda env and add it to your PATH.")
            self.logger.error("'ezkl' command not found in PATH.")
            return False
        except Exception as e:
            print(f"🚨 An unexpected error occurred during subprocess execution: {e}")
            self.logger.error(f"Subprocess execution error: {e}")
            return False

    async def setup_ezkl_circuit(self, input_data: List[float]) -> bool:
        """Setup EZKL circuit for the model with sentence preprocessing"""
        try:
            self.logger.info("Setting up EZKL circuit...")
            
            # Create directories if they don't exist
            os.makedirs(os.path.dirname(Paths.MODEL_PATH), exist_ok=True)
            os.makedirs(os.path.dirname(Paths.PROOF_PATH), exist_ok=True)
            os.makedirs(os.path.dirname(Paths.VK_PATH), exist_ok=True)
            os.makedirs(os.path.dirname(Paths.SOL_CODE_PATH), exist_ok=True)
            
            # Also create the resource directory for calibration
            os.makedirs("resources", exist_ok=True)
            
            self.logger.info(f"Created directories for artifacts")
            
            # STEP 1: Setup sentence preprocessing if not already done
            if self.encoder is None or self.pca is None:
                self.logger.info("Setting up sentence transformer and PCA...")
                self.encoder, self.pca = setup_sentence_preprocessing()
            
            # STEP 1: Export model to ONNX (input size = 32)
            self.logger.info("Exporting model to ONNX...")
            dummy_input = torch.rand(1, 32)
            torch.onnx.export(
                self.model, 
                dummy_input, 
                Paths.MODEL_PATH,
                input_names=["input"], 
                output_names=["output"],
                opset_version=11
            )
            
            # STEP 2: Prepare real sentence embeddings and PCA projection
            self.logger.info("Preparing input data...")
            
            # If input_data is not already sentence-processed, use example
            if len(input_data) != 32:
                # Use example sentence pair
                vec = preprocess_sentence_pair(
                    "The Earth is flat", 
                    "NASA shows Earth is round",
                    self.encoder, 
                    self.pca
                )
            else:
                vec = input_data
            
            input_data_dict = {"input_data": [vec]}
            with open(Paths.CALIBRATION_PATH, "w") as f:
                json.dump(input_data_dict, f)
            
            # STEP 3: Generate settings and calibrate
            self.logger.info("Generating circuit settings...")
            py_run_args = ezkl.PyRunArgs()
            py_run_args.input_visibility = "private"
            py_run_args.output_visibility = "public"
            py_run_args.param_visibility = "private"
            py_run_args.logrows = 17
            
            res = ezkl.gen_settings(Paths.MODEL_PATH, Paths.SETTINGS_PATH, py_run_args)
            if not res:
                raise Exception("Settings generation failed")
            
            self.logger.info("Calibrating settings...")
            res = await ezkl.calibrate_settings(
                Paths.CALIBRATION_PATH, 
                Paths.MODEL_PATH, 
                Paths.SETTINGS_PATH, 
                "resources"
            )
            
            # STEP 4: Compile circuit
            self.logger.info("Compiling circuit...")
            res = ezkl.compile_circuit(Paths.MODEL_PATH, Paths.COMPILED_PATH, Paths.SETTINGS_PATH)
            if not res:
                raise Exception("Circuit compilation failed")
            
            # Get SRS
            self.logger.info("Getting SRS parameters...")
            res = await ezkl.get_srs(Paths.SETTINGS_PATH)
            
            # Setup circuit
            self.logger.info("Setting up circuit...")
            res = ezkl.setup(Paths.COMPILED_PATH, Paths.VK_PATH, Paths.PK_PATH)
            if not res:
                raise Exception("Circuit setup failed")

            # Create EVM verifier
            verifier_created = await self.create_evm_verifier_with_subprocess()
            if not verifier_created:
                self.logger.warning("EVM verifier creation failed, but continuing circuit setup.")
            
            self.circuit_setup_complete = True
            self.logger.info("EZKL circuit setup completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Error setting up EZKL circuit: {str(e)}")
            return False

    async def generate_proof(self, input_data: Union[List[float], List[str]]) -> Dict[str, Any]:
        """Generate ZK proof for given input data (claim and evidence pair)"""
        try:
            self.logger.info("Generating ZK proof...")
            
            # Ensure circuit is setup
            if not self.circuit_setup_complete:
                self.logger.info("Circuit not setup, setting up now...")
                setup_success = await self.setup_ezkl_circuit([1.0] * 32)  # Use dummy for setup
                if not setup_success:
                    raise Exception("Circuit setup failed")
            
            # Handle input data format - expect [claim, evidence] or processed vector
            if isinstance(input_data[0], str) and len(input_data) >= 2:
                # Input is [claim, evidence] strings
                claim, evidence = input_data[0], input_data[1]
                self.logger.info(f"Processing claim: '{claim}' and evidence: '{evidence}'")
                
                # Preprocess using sentence transformer and PCA
                new_vec = preprocess_sentence_pair(claim, evidence, self.encoder, self.pca)
                self.logger.info(f"Preprocessed vector length: {len(new_vec)}")
                
            elif len(input_data) == 32:
                # Input is already processed 32-dim vector
                new_vec = input_data
                claim, evidence = "processed_claim", "processed_evidence"
                
            else:
                # Use example if input format is unexpected
                claim, evidence = "The Earth is flat", "NASA shows Earth is round"
                new_vec = preprocess_sentence_pair(claim, evidence, self.encoder, self.pca)
                self.logger.warning(f"Unexpected input format, using example: {claim} vs {evidence}")
            
            # Prepare input data and save to file
            self.logger.info("Preparing input data file...")
            input_dict = {"input_data": [new_vec]}
            with open(Paths.INPUT_PATH, "w") as f:
                json.dump(input_dict, f)
            self.logger.info(f"Saved input data to {Paths.INPUT_PATH}")
            
            # Debug: Show input file contents and verify paths exist
            print(f"📁 Input file path: {Paths.INPUT_PATH}")
            print(f"📁 Compiled model path: {Paths.COMPILED_PATH}")
            print(f"📁 Witness path: {Paths.WITNESS_PATH}")
            
            # Verify files exist
            if not os.path.exists(Paths.INPUT_PATH):
                raise Exception(f"Input file does not exist: {Paths.INPUT_PATH}")
            if not os.path.exists(Paths.COMPILED_PATH):
                raise Exception(f"Compiled model does not exist: {Paths.COMPILED_PATH}")
                
            # Show input data format
            with open(Paths.INPUT_PATH, 'r') as f:
                input_contents = json.load(f)
            print(f"📄 Input file contents preview: {str(input_contents)[:200]}...")
            print(f"📏 Input vector length: {len(input_contents['input_data'][0])}")
            print(f"📊 First few values: {input_contents['input_data'][0][:5]}")
            
            # Compute output using the model (for verification/logging)
            self.logger.info("Computing model output...")
            input_tensor = torch.tensor(new_vec, dtype=torch.float32).reshape(1, -1)
            with torch.no_grad():
                model_output = self.model(input_tensor)
                verification_score = model_output.item()
                # Convert to binary decision (0 or 1)
                binary_decision = 1 if verification_score >= 0.5 else 0
            
            print(f"Verification Score (0-1): {verification_score:.4f}")
            print(f"Binary Decision: {binary_decision}")
            print(f"Claim: '{claim}'")
            print(f"Evidence: '{evidence}'")
            self.logger.info(f"Model computed verification score: {verification_score:.4f}, Binary decision: {binary_decision}")
            
            # Generate witness
            self.logger.info("Starting witness generation...")
            print("🔄 Generating witness...")
            try:
                res = await asyncio.wait_for(
                    ezkl.gen_witness(Paths.INPUT_PATH, Paths.COMPILED_PATH, Paths.WITNESS_PATH),
                    timeout=60.0  # 60 second timeout
                )
                if not res:
                    raise Exception("Witness generation returned False")
                self.logger.info("✅ Witness generation completed")
                print("✅ Witness generated successfully")
            except asyncio.TimeoutError:
                raise Exception("Witness generation timed out after 60 seconds")
            except Exception as e:
                raise Exception(f"Witness generation failed: {str(e)}")
            
            # Generate proof
            self.logger.info("Starting proof generation...")
            print("🔄 Generating proof...")
            try:
                res = ezkl.prove(Paths.WITNESS_PATH, Paths.COMPILED_PATH, Paths.PK_PATH, Paths.PROOF_PATH, "single")
                if not res:
                    raise Exception("Proof generation returned False")
                self.logger.info("✅ Proof generation completed")
                print("✅ Proof generated successfully")
            except Exception as e:
                raise Exception(f"Proof generation failed: {str(e)}")
            
            # Verify proof
            self.logger.info("Starting proof verification...")
            print("🔄 Verifying proof...")
            try:
                res = ezkl.verify(Paths.PROOF_PATH, Paths.SETTINGS_PATH, Paths.VK_PATH)
                if not res:
                    raise Exception("Proof verification returned False")
                self.logger.info("✅ Proof verification completed")
            except Exception as e:
                raise Exception(f"Proof verification failed: {str(e)}")
            
            print("✅ Proof verified!")
            self.logger.info("Proof verification successful!")
            
            # Load proof data
            self.logger.info("Loading proof data...")
            try:
                with open(Paths.PROOF_PATH, 'r') as f:
                    proof_data = json.load(f)
            except Exception as e:
                self.logger.warning(f"Could not load proof data: {str(e)}")
                proof_data = {"error": "Could not load proof file"}
            
            self.logger.info("ZK proof generated and verified successfully")
            return {
                "status": "success",
                "proof": proof_data,
                "claim": claim,
                "evidence": evidence,
                "verification_score": verification_score,
                "binary_decision": binary_decision,
                "input_vector": new_vec
            }
            
        except Exception as e:
            self.logger.error(f"Error generating proof: {str(e)}")
            print(f"❌ Error in generate_proof: {str(e)}")
            return {"status": "error", "message": str(e)}

    async def submit_proof_to_contract(self, request_id: int, proof_result: Dict[str, Any]) -> bool:
        """Submit proof to contract - placeholder for actual implementation"""
        try:
            if not self.account:
                self.logger.error("No account available for submitting proof")
                return False
                
            self.logger.info(f"Submitting proof for request {request_id}")
            
            # TODO: Implement actual contract submission logic here
            # This will depend on your specific contract interface
            
            # Example structure:
            # proof_bytes = json.dumps(proof_result['proof']).encode()
            # public_inputs = proof_result.get('public_inputs', [])
            
            # nonce = self.w3.eth.get_transaction_count(self.account.address)
            # gas_price = self.w3.eth.gas_price
            
            # tx = self.contract.functions.submitProof(
            #     request_id,
            #     proof_bytes,
            #     public_inputs
            # ).build_transaction({
            #     'from': self.account.address,
            #     'gas': 500000,
            #     'gasPrice': gas_price,
            #     'nonce': nonce,
            # })
            
            # signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
            # tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            # receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            self.logger.info(f"Proof submission placeholder executed for request {request_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error submitting proof to contract: {str(e)}")
            return False

    async def process_contract_event(self, event_data: Dict[str, Any]) -> None:
        """Process incoming contract events and handle the full flow"""
        try:
            self.logger.info(f"Processing contract event: {event_data}")
            
            # Extract event information
            if 'args' in event_data:
                event_args = event_data['args']
                request_id = event_args.get('requestId', 0)
                
                # Extract input data from event
                if 'inputData' in event_args:
                    input_data = event_args['inputData']
                    
                    # Convert to appropriate format if needed
                    if isinstance(input_data, list):
                        # If it's numeric data, convert to float
                        if all(isinstance(x, (int, float)) for x in input_data):
                            input_data = [float(x) for x in input_data]
                        # If it's string data, keep as strings
                    
                    self.logger.info(f"Processing request {request_id} with input data: {input_data}")
                    
                    # Generate proof for the input data
                    proof_result = await self.generate_proof(input_data)
                    
                    if proof_result['status'] == 'success':
                        self.logger.info(f"Proof generated successfully for request {request_id}")
                        
                        # Submit proof back to contract
                        submission_success = await self.submit_proof_to_contract(request_id, proof_result)
                        
                        if submission_success:
                            self.logger.info(f"Proof submitted successfully for request {request_id}")
                        else:
                            self.logger.error(f"Failed to submit proof for request {request_id}")
                    else:
                        self.logger.error(f"Proof generation failed for request {request_id}: {proof_result['message']}")
                else:
                    self.logger.warning("No inputData found in event")
            else:
                self.logger.warning("No args found in event data")
                        
        except Exception as e:
            self.logger.error(f"Error processing contract event: {str(e)}")

    async def listen_for_events(self):
        """Listen for contract events using polling"""
        if not self.contract:
            self.logger.warning("No contract available for event listening")
            return
            
        try:
            self.logger.info("Starting event listener...")
            
            # Create event filter (customize based on your contract events)
            event_filter = self.contract.events.DataSubmitted.create_filter(fromBlock='latest')
            
            while self.running:
                try:
                    # Poll for new events
                    for event in event_filter.get_new_entries():
                        await self.process_contract_event(dict(event))
                    
                    await asyncio.sleep(1)  # Poll every second
                    
                except Exception as e:
                    self.logger.error(f"Error in event polling: {str(e)}")
                    await asyncio.sleep(5)  # Wait before retrying
                    
        except Exception as e:
            self.logger.error(f"Error in event listener: {str(e)}")

    def start(self):
        """Start the event listener"""
        if not self.running:
            self.running = True
            # Run event listener in a separate thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            def run_listener():
                loop.run_until_complete(self.listen_for_events())
                
            thread = Thread(target=run_listener)
            thread.daemon = True
            thread.start()
            self.logger.info("Event listener started")

    def stop(self):
        """Stop the event listener"""
        self.running = False
        self.logger.info("Event listener stopped")

# Test functions directly
async def test_functions():
    """Test setup_ezkl_circuit and generate_proof functions directly"""
    print("🧪 Testing EZKL functions directly...")
    
    # Create a test instance (no Web3/contract needed for testing)
    listener = ContractEventListener(w3=None, contract=None, account=None)
    
    print("\n1️⃣ Testing setup_ezkl_circuit...")
    
    # Test setup with dummy data
    dummy_data = [1.0] * 32  # 32-dim dummy vector
    setup_result = await listener.setup_ezkl_circuit(dummy_data)
    
    if setup_result:
        print("✅ setup_ezkl_circuit completed successfully!")
    else:
        print("❌ setup_ezkl_circuit failed!")
        return
    
    print("\n2️⃣ Testing generate_proof with sentence pair...")
    
    # Test with sentence pair
    test_input = ["The Earth is round", "Satellite images show Earth's curvature"]
    proof_result = await listener.generate_proof(test_input)
    
    if proof_result['status'] == 'success':
        print("✅ generate_proof completed successfully!")
        print(f"📝 Results:")
        print(f"   Claim: {proof_result['claim']}")
        print(f"   Evidence: {proof_result['evidence']}")
        print(f"   Verification Score: {proof_result['verification_score']:.4f}")
        print(f"   Binary Decision: {proof_result['binary_decision']}")
    else:
        print(f"❌ generate_proof failed: {proof_result['message']}")
    
    print("\n3️⃣ Testing generate_proof with different sentence pair...")
    
    # Test with different sentence pair
    test_input2 = ["Cats can fly", "Cats are terrestrial mammals"]
    proof_result2 = await listener.generate_proof(test_input2)
    
    if proof_result2['status'] == 'success':
        print("✅ Second generate_proof completed successfully!")
        print(f"📝 Results:")
        print(f"   Claim: {proof_result2['claim']}")
        print(f"   Evidence: {proof_result2['evidence']}")
        print(f"   Verification Score: {proof_result2['verification_score']:.4f}")
        print(f"   Binary Decision: {proof_result2['binary_decision']}")
    else:
        print(f"❌ Second generate_proof failed: {proof_result2['message']}")

if __name__ == "__main__":
    print("🚀 Starting direct function tests...")
    print("This will test setup_ezkl_circuit and generate_proof without Flask server")
    
    # Run the test
    asyncio.run(test_functions())
    
    print("\n🎉 Direct function testing completed!") 