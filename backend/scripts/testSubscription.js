const { ethers } = require("ethers");
require("dotenv").config();

// Contract ABIs
const SubscriptionManagerABI = require("../../frontend/lib/abi/SubscriptionManagerABI.json");
const TruthTokenABI = require("../../frontend/lib/abi/TruthTokenABI.json");

// Contract addresses
const SUBSCRIPTION_ADDRESS = "0x5a4be260869A25E6682cB0362233872F10F8736D";
const TRUTH_TOKEN_ADDRESS = "0x4eE90C05e4d157a0999413cbc0343abD1d8fFDF1";

// RPC URL - using a different Moonbase Alpha endpoint
const RPC_URL = "https://rpc.api.moonbase.moonbeam.network";

async function main() {
  try {
    // Connect to the network
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Get the signer
    const privateKey =
      "540767f0b1c5ae3d5a5d2d5b8d0664fe7b93e0ccbe8eff9fafced901abd69d3b";
    const signer = new ethers.Wallet(privateKey, provider);

    console.log("Connected to network with address:", signer.address);

    // Initialize contracts
    const subscriptionContract = new ethers.Contract(
      SUBSCRIPTION_ADDRESS,
      SubscriptionManagerABI,
      signer
    );

    const truthTokenContract = new ethers.Contract(
      TRUTH_TOKEN_ADDRESS,
      TruthTokenABI,
      signer
    );

    // Get subscription fee
    const subscriptionFee = await subscriptionContract.subscriptionFee();
    console.log("Subscription Fee:", subscriptionFee.toString(), "TRUTH");

    // Check token balance
    const balance = await truthTokenContract.balanceOf(signer.address);
    console.log("Token Balance:", ethers.formatUnits(balance, 18), "TRUTH");

    // Check allowance
    const allowance = await truthTokenContract.allowance(
      signer.address,
      SUBSCRIPTION_ADDRESS
    );
    console.log("Current Allowance:", allowance.toString(), "TRUTH");

    // Check if approval is needed
    if (allowance < subscriptionFee) {
      console.log("Approving tokens...");
      // First reset allowance to 0
      const resetTx = await truthTokenContract.approve(SUBSCRIPTION_ADDRESS, 0);
      await resetTx.wait();
      console.log("Reset allowance to 0");

      // Then set new allowance
      const approveTx = await truthTokenContract.approve(
        SUBSCRIPTION_ADDRESS,
        subscriptionFee
      );
      console.log("Approval transaction hash:", approveTx.hash);
      await approveTx.wait();
      console.log("Approval confirmed");

      // Verify new allowance
      const newAllowance = await truthTokenContract.allowance(
        signer.address,
        SUBSCRIPTION_ADDRESS
      );
      console.log("New Allowance:", newAllowance.toString(), "TRUTH");
    }

    // Check if user has enough balance
    if (balance < subscriptionFee) {
      throw new Error("Insufficient token balance");
    }

    // Purchase subscription
    console.log("Purchasing subscription...");
    const purchaseTx = await subscriptionContract.purchaseSubscription();
    console.log("Purchase transaction hash:", purchaseTx.hash);

    // Wait for transaction confirmation
    const receipt = await purchaseTx.wait();
    console.log("Purchase confirmed in block:", receipt.blockNumber);

    // Get subscription details
    const details = await subscriptionContract.getSubscriptionDetails(
      signer.address
    );
    console.log("\nSubscription Details:");
    console.log(
      "Start Time:",
      new Date(Number(details[0]) * 1000).toLocaleString()
    );
    console.log(
      "End Time:",
      new Date(Number(details[1]) * 1000).toLocaleString()
    );
    console.log("Is Active:", details[2]);
  } catch (error) {
    console.error("Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
