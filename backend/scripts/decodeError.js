const { ethers } = require("ethers");
require("dotenv").config();

// Contract ABIs
const SubscriptionManagerABI = require("../../frontend/lib/abi/SubscriptionManagerABI.json");
const TruthTokenABI = require("../../frontend/lib/abi/TruthTokenABI.json");

// Error data from the failed transaction
const errorData =
  "0xe450d38c0000000000000000000000005a4be260869a25e6682cb0362233872f10f8736d000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000029a2241af62c0000";

async function main() {
  try {
    // Create contract instance to decode the error
    const provider = new ethers.JsonRpcProvider(
      "https://rpc.api.moonbase.moonbeam.network"
    );
    const contract = new ethers.Contract(
      "0x5a4be260869A25E6682cB0362233872F10F8736D",
      SubscriptionManagerABI,
      provider
    );

    // Get the error selector (first 4 bytes)
    const errorSelector = errorData.slice(0, 10);
    console.log("Error Selector:", errorSelector);

    // Get the error parameters (remaining bytes)
    const errorParams = "0x" + errorData.slice(10);
    console.log("Error Parameters:", errorParams);

    // Try to decode the error data
    try {
      // Get the interface from the contract
      const iface = new ethers.Interface(SubscriptionManagerABI);

      // Try to decode the error data
      const decodedError = iface.parseError(errorData);
      console.log("\nDecoded Error:");
      console.log("Name:", decodedError.name);
      console.log("Args:", decodedError.args);
    } catch (decodeError) {
      console.log(
        "\nCould not decode error with contract interface. Trying to decode raw data:"
      );

      // Decode the parameters manually
      const decodedParams = ethers.AbiCoder.defaultAbiCoder().decode(
        ["address", "uint256", "uint256"],
        errorParams
      );

      console.log("\nDecoded Parameters:");
      console.log("Address:", decodedParams[0]);
      console.log("Value 1:", decodedParams[1].toString());
      console.log("Value 2:", ethers.formatEther(decodedParams[2]));
    }
  } catch (error) {
    console.error("Error decoding:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
