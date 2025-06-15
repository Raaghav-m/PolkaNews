import asyncio
import json
import os
import torch
import torch.nn as nn
import ezkl
import numpy as np
from config import Paths

# MINIMAL MODEL for Claim + Evidence Binary Classification
class BinaryClaimVerificationModel(nn.Module):
    """Minimal model for binary claim+evidence verification"""
    def __init__(self, input_size=6):  # 6 features: minimal but effective
        super(BinaryClaimVerificationModel, self).__init__()
        # Very simple architecture - proven to work fast with EZKL
        self.net = nn.Sequential(
            nn.Linear(input_size, 8),   # Small hidden layer
            nn.ReLU(),
            nn.Linear(8, 1),           # Binary output
            nn.Sigmoid()               # 0-1 probability
        )
    
    def forward(self, x):
        return self.net(x)

# Initialize minimal model
claim_verification_model = BinaryClaimVerificationModel()
claim_verification_model.eval()

def extract_claim_evidence_features(claim, evidence):
    """
    Extract minimal but meaningful features for claim+evidence verification
    Returns 6 features that capture key relationships
    """
    # Basic length features (normalized)
    claim_len = min(len(claim), 200) / 200.0
    evidence_len = min(len(evidence), 200) / 200.0
    
    # Word count features (normalized)
    claim_words = min(len(claim.split()), 30) / 30.0
    evidence_words = min(len(evidence.split()), 30) / 30.0
    
    # Simple overlap features (key for verification)
    claim_lower = claim.lower()
    evidence_lower = evidence.lower()
    
    # Word overlap ratio
    claim_set = set(claim_lower.split())
    evidence_set = set(evidence_lower.split())
    if len(claim_set) > 0:
        word_overlap = len(claim_set.intersection(evidence_set)) / len(claim_set)
    else:
        word_overlap = 0.0
    
    # Length ratio (consistency indicator)
    if evidence_len > 0:
        length_ratio = min(claim_len / (evidence_len + 0.001), 2.0) / 2.0  # Normalize to 0-1
    else:
        length_ratio = 0.0
    
    return [claim_len, evidence_len, claim_words, evidence_words, word_overlap, length_ratio]

async def create_evm_verifier_with_subprocess():
    """Create EVM verifier by calling the ezkl binary directly."""
    print("⚡️ Attempting to create EVM verifier")

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
        
        print(f"Subprocess stdout: {stdout.decode()}")
        if stderr:
            print(f"Subprocess stderr: {stderr.decode()}")

        if result.returncode == 0:
            print("✅ EVM Verifier generated successfully")
            return True
        else:
            print(f"❌ Subprocess call to create EVM verifier failed with return code {result.returncode}.")
            print(f"Error: {stderr.decode()}")
            return False

    except FileNotFoundError:
        print("❌ 'ezkl' command not found. The binary is not in your PATH.")
        print("💡 Please find the 'ezkl' binary in your conda env and add it to your PATH.")
        return False
    except Exception as e:
        print(f"🚨 An unexpected error occurred during subprocess execution: {e}")
        return False

async def setup_minimal_verification_circuit():
    """Setup minimal circuit for claim verification - PROVEN FAST approach"""
    print("🔧 Setting up MINIMAL claim verification circuit...")
    
    # Create directories
    os.makedirs(os.path.dirname(Paths.MODEL_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(Paths.PROOF_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(Paths.VK_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(Paths.SOL_CODE_PATH), exist_ok=True)  # Contract directory
    os.makedirs("resources", exist_ok=True)
    
    # Export minimal model to ONNX
    print("📦 Exporting minimal verification model...")
    dummy_input = torch.rand(1, 6)  # 6 features
    torch.onnx.export(
        claim_verification_model,
        dummy_input,
        Paths.MODEL_PATH,
        input_names=["input"],
        output_names=["output"],
        opset_version=11
    )
    
    # Generate settings - EXACT working pattern
    print("⚙️  Generating circuit settings...")
    py_run_args = ezkl.PyRunArgs()
    py_run_args.input_visibility = "private"
    py_run_args.output_visibility = "public"
    py_run_args.param_visibility = "private"
    py_run_args.logrows = 17
    res = ezkl.gen_settings(Paths.MODEL_PATH, Paths.SETTINGS_PATH, py_run_args=py_run_args)
    assert res == True, "Verification model settings generation failed"
    
    # Generate calibration data with sample claim+evidence
    print("📊 Generating calibration data...")
    sample_features = extract_claim_evidence_features(
        "The sky is blue", 
        "Scientific observations confirm the sky appears blue during clear weather"
    )
    
    cal_data = {"input_data": [sample_features]}
    with open(Paths.CALIBRATION_PATH, 'w') as f:
        json.dump(cal_data, f)
    
    # Calibrate settings
    print("🎯 Calibrating circuit...")
    res = await ezkl.calibrate_settings(
        Paths.CALIBRATION_PATH,
        Paths.MODEL_PATH,
        Paths.SETTINGS_PATH,
        "resources"
    )
    
    # Compile circuit
    print("⚡ Compiling verification circuit...")
    res = ezkl.compile_circuit(
        Paths.MODEL_PATH,
        Paths.COMPILED_PATH,
        Paths.SETTINGS_PATH
    )
    assert res == True, "Verification circuit compilation failed"
    
    # Get SRS
    print("🔑 Getting SRS parameters...")
    res = await ezkl.get_srs(Paths.SETTINGS_PATH)
    
    # Setup circuit
    print("🚀 Setting up verification circuit...")
    res = ezkl.setup(Paths.COMPILED_PATH, Paths.VK_PATH, Paths.PK_PATH)
    assert res == True, "Verification circuit setup failed"
    
    # Generate EVM verifier contract using subprocess (optional - don't fail if it doesn't work)
    print("📜 Generating Solidity verifier contract...")
    try:
        success = await create_evm_verifier_with_subprocess()
        if success:
            print(f"✅ Solidity contract generated: {Paths.SOL_CODE_PATH}")
            print(f"✅ Contract ABI generated: {Paths.ABI_PATH}")
        else:
            print("⚠️  EVM verifier generation failed - may need additional setup")
    except Exception as e:
        print(f"⚠️  EVM verifier generation failed: {str(e)}")
        print("💡 This is optional - ZK proof generation will still work")
    
    print("✅ Minimal verification circuit setup complete!")

async def verify_claim_with_proof(claim, evidence):
    """
    Verify claim against evidence and generate ZK proof
    Returns binary decision (0/1) with cryptographic proof
    """
    print(f"🔍 Verifying claim against evidence...")
    print(f"📝 Claim: '{claim}'")
    print(f"📝 Evidence: '{evidence}'")
    
    # Extract features
    features = extract_claim_evidence_features(claim, evidence)
    print(f"📊 Features: {[f'{f:.3f}' for f in features]}")
    
    # Run model inference
    input_tensor = torch.tensor(features, dtype=torch.float32).reshape(1, -1)
    with torch.no_grad():
        model_output = claim_verification_model(input_tensor)
        verification_score = model_output.item()
        binary_decision = 1 if verification_score >= 0.5 else 0
    
    print(f"🎯 Verification Score: {verification_score:.4f}")
    print(f"⚖️  Binary Decision: {'✅ VERIFIED' if binary_decision == 1 else '❌ NOT VERIFIED'}")
    
    # Prepare input for ZK proof
    verification_data = {"input_data": [features]}
    with open(Paths.INPUT_PATH, 'w') as f:
        json.dump(verification_data, f)
    
    # Generate witness
    print("🔄 Generating cryptographic witness...")
    res = await ezkl.gen_witness(Paths.INPUT_PATH, Paths.COMPILED_PATH, Paths.WITNESS_PATH)
    assert os.path.isfile(Paths.WITNESS_PATH), "Witness generation failed"
    
    # Generate ZK proof - PROVEN FAST approach
    print("🔐 Generating zero-knowledge proof...")
    proof = ezkl.prove(
        Paths.WITNESS_PATH,
        Paths.COMPILED_PATH,
        Paths.PK_PATH,
        proof_path=Paths.PROOF_PATH,
        proof_type="single"
    )
    assert os.path.isfile(Paths.PROOF_PATH), "Proof generation failed"
    
    # Verify proof
    print("✅ Verifying proof...")
    verify_result = ezkl.verify(Paths.PROOF_PATH, Paths.SETTINGS_PATH, Paths.VK_PATH)
    assert verify_result == True, "Proof verification failed"
    
    print("🎉 Claim verification with ZK proof completed successfully!")
    
    # Format result
    return {
        "claim": claim,
        "evidence": evidence,
        "verification_score": verification_score,
        "binary_decision": binary_decision,
        "verified": binary_decision == 1,
        "features": features,
        "proof": proof["proof"] if isinstance(proof, dict) else str(proof),
        "proof_verified": True
    }

# Public interface function
async def setup_and_verify(claim, evidence, setup_required=False):
    """
    Main function: Setup circuit (if needed) and verify claim with ZK proof
    """
    if setup_required:
        await setup_minimal_verification_circuit()
    
    return await verify_claim_with_proof(claim, evidence) 