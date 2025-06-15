const { ethers } = require("ethers");
require("dotenv").config();

// Contract ABIs
const SubscriptionManagerABI = require("../../frontend/lib/abi/SubscriptionManagerABI.json");

// Contract addresses
const SUBSCRIPTION_ADDRESS = "0x2d45Ed0d527f957291B13F83dF4FF439931D8599";

// RPC URL
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

    // Initialize contract
    const subscriptionContract = new ethers.Contract(
      SUBSCRIPTION_ADDRESS,
      SubscriptionManagerABI,
      signer
    );

    // Address to check
    const addressToCheck = "0xcBE66646C0450d75957F726cF99dAD471916933B";

    console.log("\nChecking subscription status...");
    // Check if the address is subscribed
    const isSubscribed =
      await subscriptionContract.isSubscribed(addressToCheck);

    // Get detailed subscription information
    const details =
      await subscriptionContract.getSubscriptionDetails(addressToCheck);

    console.log("\nSubscription Status Check:");
    console.log("------------------------");
    console.log(`Address: ${addressToCheck}`);
    console.log(`Is Subscribed: ${isSubscribed ? "Yes" : "No"}`);

    if (details[2]) {
      // isActive
      const startTime = new Date(Number(details[0]) * 1000).toLocaleString();
      const endTime = new Date(Number(details[1]) * 1000).toLocaleString();
      const now = new Date();
      const endDate = new Date(Number(details[1]) * 1000);
      const timeLeft = endDate - now;

      console.log("\nSubscription Details:");
      console.log(`Start Time: ${startTime}`);
      console.log(`End Time: ${endTime}`);
      console.log(
        `Time Remaining: ${Math.floor(timeLeft / (1000 * 60 * 60))} hours`
      );
    }
  } catch (error) {
    console.error("\nError details:");
    console.error("----------------");
    if (error.message.includes("network")) {
      console.error(
        "Network connection error. Please make sure you're connected to the correct network."
      );
    } else if (error.message.includes("contract")) {
      console.error(
        "Contract interaction error. Please verify the contract address and ABI."
      );
    } else {
      console.error(error.message);
      if (error.data) {
        console.error("Error data:", error.data);
      }
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
