const { ethers } = require("hardhat");
require("dotenv").config();

// Import ABIs
const PolkaNewsABI = require("./abi/PolkaNewsABI.json");
const TruthTokenABI = require("./abi/TruthTokenABI.json");

async function main() {
  // Get the contract addresses from environment variables
  const polkaNewsAddress = "0x74863B9AAECCB34238FA5f607B03242ddc62e1aF";
  const truthTokenAddress = "0x4437F9F98613A0269d7b37D35a37025D8e240881";

  if (!polkaNewsAddress || !truthTokenAddress) {
    throw new Error(
      "Please set POLKA_NEWS_ADDRESS and TRUTH_TOKEN_ADDRESS in .env file"
    );
  }

  // Get the signer (the account that will register as reporter)
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  // Create contract instances using ABIs
  const polkaNews = new ethers.Contract(polkaNewsAddress, PolkaNewsABI, signer);
  const truthToken = new ethers.Contract(
    truthTokenAddress,
    TruthTokenABI,
    signer
  );

  try {
    // Log contract addresses and signer details
    console.log("\nContract Details:");
    console.log("PolkaNews Address:", polkaNewsAddress);
    console.log("TruthToken Address:", truthTokenAddress);
    console.log("Signer Address:", signer.address);
    console.log("Network:", (await ethers.provider.getNetwork()).name);

    // Check token balance with detailed logging
    console.log("\nChecking token balance...");
    try {
      const balance = await truthToken.balanceOf(signer.address);
      console.log("Raw balance:", balance.toString());
      console.log("Formatted balance:", ethers.formatEther(balance), "TRUTH");
    } catch (error) {
      console.error("Error checking balance:", error.message);
      if (error.data) {
        console.error("Error data:", error.data);
      }
    }

    // Check if already registered
    console.log("\nChecking reporter status...");
    const isRegistered = await polkaNews.reporters(signer.address);
    console.log("Is registered:", isRegistered);
    if (isRegistered) {
      console.log("Account is already registered as a reporter");
      return;
    }

    // Get the registration fee (constant in contract)
    const registrationFee = ethers.parseEther("100"); // 100 TRUTH tokens
    console.log("\nRegistration Details:");
    console.log(
      "Registration fee:",
      ethers.formatEther(registrationFee),
      "TRUTH"
    );

    // Check token balance again with more context
    const balance = await truthToken.balanceOf(signer.address);
    console.log("Current balance:", ethers.formatEther(balance), "TRUTH");
    console.log(
      "Required balance:",
      ethers.formatEther(registrationFee),
      "TRUTH"
    );

    if (balance < registrationFee) {
      console.log(
        "\nInsufficient balance. Please get some TRUTH tokens first."
      );
      console.log(
        "You need at least 100 TRUTH tokens to register as a reporter."
      );
      return;
    }

    // Approve tokens
    console.log("Approving tokens...");
    const approveTx = await truthToken.approve(
      polkaNewsAddress,
      registrationFee
    );
    console.log("Approval transaction sent:", approveTx.hash);
    await approveTx.wait();
    console.log("Tokens approved");

    // Register as reporter
    console.log("Registering as reporter...");
    const registerTx = await polkaNews.registerReporter();
    console.log("Registration transaction sent:", registerTx.hash);
    const receipt = await registerTx.wait();

    // Check if registration was successful
    const isReporter = await polkaNews.reporters(signer.address);
    if (isReporter) {
      console.log("Successfully registered as reporter!");
      console.log("Transaction hash:", receipt.hash);

      // Get event logs
      const events = receipt.logs
        .map((log) => {
          try {
            return polkaNews.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      console.log("Events emitted:", events);
    } else {
      console.log("Registration failed");
    }
  } catch (error) {
    console.error("\nError:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Transaction:", error.transaction);
    }
    if (error.receipt) {
      console.error("Receipt:", error.receipt);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
