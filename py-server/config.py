import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration class for the Flask server"""
    
    # Web3 Configuration - Updated for Moonbeam
    WEB3_WS_URI = os.getenv('WEB3_WS_URI', "wss://wss.api.moonbase.moonbeam.network")
    WEB3_HTTP_URI = os.getenv('WEB3_HTTP_URI', "https://rpc.api.moonbase.moonbeam.network")
    
    # Contract Configuration
    CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS', "0x2F926aaB0eC4d0A1B808a335992C840781157596")
    CONTRACT_ABI_PATH = os.getenv('CONTRACT_ABI_PATH', './contract_abi.json')
    
    # Keep backward compatibility
    PRIVATE_KEY = os.getenv('PRIVATE_KEY') 
    
    # Server Configuration
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5001))
    FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    
    # EZKL Configuration
    ARTIFACTS_DIR = os.getenv('ARTIFACTS_DIR', 'artifacts')
    MODEL_INPUT_SIZE = int(os.getenv('MODEL_INPUT_SIZE', 32))
    MODEL_HIDDEN_SIZE = int(os.getenv('MODEL_HIDDEN_SIZE', 16))
    MODEL_OUTPUT_SIZE = int(os.getenv('MODEL_OUTPUT_SIZE', 1))
    
    @classmethod
    def validate_config(cls):
        """Validate required configuration"""
        if not cls.CONTRACT_ADDRESS:
            print("Warning: CONTRACT_ADDRESS not set - contract events won't work")
        if not cls.PRIVATE_KEY:
            print("Warning: PRIVATE_KEY not set - running in read-only mode")
        if cls.WEB3_HTTP_URI == "https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY":
            print("Warning: Using default Web3 URI - please set WEB3_HTTP_URI")

# Artifact Paths - matching compute_node structure
class Paths:
    """Centralized path configuration"""
    
    # Model paths
    MODEL_PATH = "artifacts/models/zk_model.onnx"
    COMPILED_PATH = "artifacts/models/zk_model.ezkl"
    SETTINGS_PATH = "artifacts/models/settings.json"
    CALIBRATION_PATH = "artifacts/models/input.json"
    
    # Proof paths
    PROOF_PATH = "artifacts/proofs/test.pf"
    WITNESS_PATH = "artifacts/proofs/witness.json"
    INPUT_PATH = "artifacts/proofs/input.json"
    
    # Key paths
    VK_PATH = "artifacts/keys/test.vk"
    PK_PATH = "artifacts/keys/test.pk"
    
    # Contract paths
    SOL_CODE_PATH = "artifacts/contracts/verifier.sol"
    ABI_PATH = "artifacts/contracts/verifier.abi" 