const { ethers } = require("ethers");
require("dotenv").config();

// Contract ABIs
const SubscriptionManagerABI = require("../../frontend/lib/abi/SubscriptionManagerABI.json");

// The error we're trying to decode
const errorData = "0x"; // Empty result data from isSubscribed call

async function main() {
  try {
    // Create contract instance to decode the error
    const provider = new ethers.JsonRpcProvider(
      "https://rpc.api.moonbase.moonbeam.network"
    );
    const contract = new ethers.Contract(
      "0xcBE66646C0450d75957F726cF99dAD471916933B",
      SubscriptionManagerABI,
      provider
    );

    console.log("Attempting to decode error for isSubscribed call...");
    console.log("Contract Address:", contract.target);
    console.log("Method: isSubscribed(address)");
    console.log("Error Data:", errorData);

    // Get the interface from the contract
    const iface = new ethers.Interface(SubscriptionManagerABI);

    // Try to decode the error data
    try {
      const decodedError = iface.parseError(errorData);
      console.log("\nDecoded Error:");
      console.log("Name:", decodedError.name);
      console.log("Args:", decodedError.args);
    } catch (decodeError) {
      console.log("\nError Analysis:");
      console.log("1. The error 'could not decode result data' suggests that:");
      console.log(
        "   - The contract at the specified address might not be a SubscriptionManager contract"
      );
      console.log("   - The contract might not have the isSubscribed function");
      console.log("   - The contract might be deployed to a different address");

      // Try to verify the contract
      console.log("\nVerifying contract...");
      try {
        const code = await provider.getCode(contract.target);
        if (code === "0x") {
          console.log("No contract found at this address!");
        } else {
          console.log("Contract exists at this address");
          console.log("Contract bytecode length:", code.length);
        }
      } catch (error) {
        console.log("Error checking contract:", error.message);
      }

      // Try to get the ABI for the contract
      console.log("\nChecking contract functions...");
      try {
        const functions = Object.keys(contract.interface.functions);
        console.log("Available functions:", functions);
      } catch (error) {
        console.log("Error getting contract functions:", error.message);
      }
    }
  } catch (error) {
    console.error("Error in analysis:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
