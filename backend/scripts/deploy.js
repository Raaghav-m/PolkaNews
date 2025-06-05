const hre = require("hardhat");
const { ethers } = require("hardhat");

async function verifyContract(address) {
  console.log(`Verifying contract at ${address}...`);
  try {
    await hre.run("verify:verify", {
      address: address
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
    // Deploy TruthToken first
    console.log("\nDeploying TruthToken...");
    const TruthToken = await ethers.getContractFactory("TruthToken");
    const truthToken = await TruthToken.deploy();
    await truthToken.waitForDeployment();
    const truthTokenAddress = await truthToken.getAddress();
    console.log("TruthToken deployed to:", truthTokenAddress);

    // Deploy PolkaNews with TruthToken address
    console.log("\nDeploying PolkaNews...");
    const PolkaNews = await ethers.getContractFactory("PolkaNews");
    const polkaNews = await PolkaNews.deploy(truthTokenAddress);
    await polkaNews.waitForDeployment();
    const polkaNewsAddress = await polkaNews.getAddress();
    console.log("PolkaNews deployed to:", polkaNewsAddress);

    // Set up contract connections
    console.log("\nSetting up contract connections...");
    
    // Set PolkaNews contract in TruthToken
    console.log("Setting PolkaNews contract in TruthToken...");
    const setPolkaNewsTx = await truthToken.setPolkaNewsContract(polkaNewsAddress);
    await setPolkaNewsTx.wait();
    console.log("✓ PolkaNews contract set in TruthToken");

    // Set oracle address in PolkaNews
    const defaultOracle = "0x07b1DAf7b72dd9E0F6D57e4B9C8cFC00719096f9";
    console.log("Setting Oracle in PolkaNews...");
    const setOracleTx = await polkaNews.setOracle(defaultOracle);
    await setOracleTx.wait();
    console.log("✓ Oracle set in PolkaNews");

    // Verify the setup
    console.log("\nVerifying setup...");
    const polkaNewsContractInToken = await truthToken.polkaNewsContract();
    const oracleInPolkaNews = await polkaNews.oracle();
    
    console.log("\nDeployment Summary:");
    console.log("------------------");
    console.log("TruthToken:", truthTokenAddress);
    console.log("PolkaNews:", polkaNewsAddress);
    console.log("Oracle:", defaultOracle);
    console.log("\nVerification Results:");
    console.log("-------------------");
    console.log("PolkaNews contract in TruthToken:", polkaNewsContractInToken === polkaNewsAddress ? "✓" : "❌");
    console.log("Oracle in PolkaNews:", oracleInPolkaNews === defaultOracle ? "✓" : "❌");

    // Attempt to verify contracts on explorer (if not on local network)
    if (network.name !== "hardhat" && network.name !== "localhost") {
      await verifyContract(truthTokenAddress);
      await verifyContract(polkaNewsAddress);
    }

    return { truthToken: truthTokenAddress, polkaNews: polkaNewsAddress, oracle: defaultOracle };
  } catch (error) {
    console.error("\nDeployment failed!");
    console.error(error);
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