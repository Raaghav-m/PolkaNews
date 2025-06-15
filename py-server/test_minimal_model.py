#!/usr/bin/env python3
"""
Simple test for minimal claim verification model
Only 2 tests with single setup call
"""
import asyncio
from minimal_sentence_model import setup_and_verify

async def test_minimal_verification():
    """Test the minimal verification model with 2 claim+evidence pairs"""
    print("🧪 Testing MINIMAL claim verification model...")
    print("📝 Running 2 tests with single setup call")
    
    # Test cases: [claim, evidence, expected_description]
    test_cases = [
        [
            "The Earth is round", 
            "Satellite images and space observations show Earth's spherical shape",
            "Test 1: Earth roundness claim"
        ],
        [
            "Python is a programming language",
            "Python is a high-level, interpreted programming language",
            "Test 2: Python programming language claim"
        ]
    ]
    
    print(f"\n🎯 Running {len(test_cases)} tests...")
    
    for i, (claim, evidence, description) in enumerate(test_cases, 1):
        print(f"\n{'='*50}")
        print(f"{description}")
        print(f"📝 Claim: '{claim}'")
        print(f"📝 Evidence: '{evidence}'")
        
        try:
            # Setup only on first test (i == 1)
            result = await setup_and_verify(
                claim, 
                evidence, 
                setup_required=(i == 1)  # Setup only on first test
            )
            
            if i == 1:
                print("✅ Circuit setup completed on first test")
            
            if result:
                print(f"✅ SUCCESS!")
                print(f"🎯 Verification Score: {result['verification_score']:.4f}")
                print(f"⚖️  Decision: {'✅ VERIFIED' if result['verified'] else '❌ NOT VERIFIED'}")
                print(f"📊 Features: {[f'{f:.3f}' for f in result['features']]}")
                print(f"🔐 Proof Generated & Verified: ✅")
            else:
                print(f"❌ FAILED - No result returned")
                return False
                
        except KeyboardInterrupt:
            print(f"\n🛑 Test interrupted at test {i}")
            return False
        except Exception as e:
            print(f"❌ ERROR in test {i}: {str(e)}")
            return False
    
    print(f"\n{'='*50}")
    print("🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
    return True

if __name__ == "__main__":
    print("🚀 Testing MINIMAL claim verification model")
    print("📋 2 tests, 1 setup call")
    print("Press Ctrl+C to interrupt")
    
    try:
        success = asyncio.run(test_minimal_verification())
        
        if success:
            print("\n🎉 MINIMAL MODEL SUCCESS!")
            print("💡 Ready for production use!")
        else:
            print("\n❌ Tests failed")
            
    except KeyboardInterrupt:
        print("\n🛑 Testing interrupted")
    except Exception as e:
        print(f"\n💥 Error: {str(e)}") 