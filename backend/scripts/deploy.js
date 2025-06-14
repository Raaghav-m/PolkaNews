const hre = require("hardhat");
const { ethers } = require("hardhat");

async function verifyContract(address) {
  console.log(`Verifying contract at ${address}...`);
  try {
    await hre.run("verify:verify", {
      address: address,
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.log("Verification failed:", error.message);
  }
}

async function main() {
  console.log("Starting deployment...");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  try {
    // 1. Deploy TruthToken first
    console.log("\nDeploying TruthToken...");
    const TruthToken = await ethers.getContractFactory("TruthToken");
    const truthToken = await TruthToken.deploy();
    await truthToken.waitForDeployment();
    const truthTokenAddress = await truthToken.getAddress();
    console.log("TruthToken deployed to:", truthTokenAddress);

    // 2. Deploy Sources
    console.log("\nDeploying Sources...");
    const Sources = await ethers.getContractFactory("Sources");
    const sources = await Sources.deploy(truthTokenAddress);
    await sources.waitForDeployment();
    const sourcesAddress = await sources.getAddress();
    console.log("Sources deployed to:", sourcesAddress);

    // 3. Deploy SubscriptionManager
    console.log("\nDeploying SubscriptionManager...");
    const SubscriptionManager = await ethers.getContractFactory(
      "SubscriptionManager"
    );
    const subscriptionManager = await SubscriptionManager.deploy(
      truthTokenAddress,
      sourcesAddress,
      ethers.parseEther("10"), // 10 tokens for subscription
      30 * 24 * 60 * 60 // 30 days in seconds
    );
    await subscriptionManager.waitForDeployment();
    const subscriptionManagerAddress = await subscriptionManager.getAddress();
    console.log("SubscriptionManager deployed to:", subscriptionManagerAddress);

    // 4. Deploy PolkaNews
    console.log("\nDeploying PolkaNews...");
    const PolkaNews = await ethers.getContractFactory("PolkaNews");
    const polkaNews = await PolkaNews.deploy(
      truthTokenAddress,
      subscriptionManagerAddress
    );
    await polkaNews.waitForDeployment();
    const polkaNewsAddress = await polkaNews.getAddress();
    console.log("PolkaNews deployed to:", polkaNewsAddress);

    // Set up contract connections
    console.log("\nSetting up contract connections...");

    // Set PolkaNews contract in TruthToken
    console.log("Setting PolkaNews contract in TruthToken...");
    const setPolkaNewsTx =
      await truthToken.setPolkaNewsContract(polkaNewsAddress);
    await setPolkaNewsTx.wait();
    console.log("✓ PolkaNews contract set in TruthToken");

    // Set verifier address in PolkaNews
    const defaultVerifier = "0x07b1DAf7b72dd9E0F6D57e4B9C8cFC00719096f9";
    console.log("Setting Verifier in PolkaNews...");
    const setVerifierTx = await polkaNews.setVerifier(defaultVerifier);
    await setVerifierTx.wait();
    console.log("✓ Verifier set in PolkaNews");

    // Verify the setup
    console.log("\nVerifying setup...");
    const polkaNewsContractInToken = await truthToken.polkaNewsContract();
    const verifierInPolkaNews = await polkaNews.verifier();

    console.log("\nDeployment Summary:");
    console.log("------------------");
    console.log("TruthToken:", truthTokenAddress);
    console.log("Sources:", sourcesAddress);
    console.log("SubscriptionManager:", subscriptionManagerAddress);
    console.log("PolkaNews:", polkaNewsAddress);
    console.log("Verifier:", defaultVerifier);
    console.log("\nVerification Results:");
    console.log("-------------------");
    console.log(
      "PolkaNews contract in TruthToken:",
      polkaNewsContractInToken === polkaNewsAddress ? "✓" : "❌"
    );
    console.log(
      "Verifier in PolkaNews:",
      verifierInPolkaNews === defaultVerifier ? "✓" : "❌"
    );

    // Attempt to verify contracts on explorer (if not on local network)
    if (network.name !== "hardhat" && network.name !== "localhost") {
      await verifyContract(truthTokenAddress);
      await verifyContract(sourcesAddress);
      await verifyContract(subscriptionManagerAddress);
      await verifyContract(polkaNewsAddress);
    }

    return {
      truthToken: truthTokenAddress,
      sources: sourcesAddress,
      subscriptionManager: subscriptionManagerAddress,
      polkaNews: polkaNewsAddress,
      verifier: defaultVerifier,
    };
  } catch (error) {
    console.error("\nDeployment failed!");
    console.error("Error details:", error.message);
    if (error.errors && error.errors[0].error.includes("initcode is too big")) {
      console.error("\nContract initialization code is too large. Please:");
      console.error("1. Reduce contract size by removing unused functions");
      console.error("2. Split the contract into multiple smaller contracts");
      console.error("3. Use a proxy pattern for deployment");
    }
    throw error;
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
