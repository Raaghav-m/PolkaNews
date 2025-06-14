const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Starting Verifier deployment...");

  // Get the deployer's signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  try {
    // Deploy Verifier contract with specific compiler settings
    console.log("Deploying Verifier contract...");
    const Verifier = await ethers.getContractFactory("Halo2Verifier", {
      signer: deployer,
    });

    // Deploy with higher gas limit due to complex contract
    console.log("Sending deployment transaction...");
    const verifier = await Verifier.deploy({
      gasLimit: 10000000, // 10M gas limit
    });

    console.log("Waiting for deployment transaction...");
    const deployTx = await verifier.deploymentTransaction();
    console.log("Deployment transaction hash:", deployTx.hash);

    await verifier.waitForDeployment();

    const verifierAddress = await verifier.getAddress();
    console.log("Verifier deployed to:", verifierAddress);

    // Save the deployment info
    const deploymentInfo = {
      network: network.name,
      verifier: {
        address: verifierAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        transactionHash: deployTx.hash,
      },
    };

    // Write deployment info to a file
    const fs = require("fs");
    const path = require("path");
    const deploymentsDir = path.join(__dirname, "../deployments");

    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(
      deploymentsDir,
      `verifier-${network.name}.json`
    );
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to:", deploymentFile);

    // Update .env file with the new contract address
    const envPath = path.join(__dirname, "../.env");
    let envContent = "";

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // Update or add VERIFIER_ADDRESS
    const verifierEnvVar = `VERIFIER_ADDRESS=${verifierAddress}`;
    if (envContent.includes("VERIFIER_ADDRESS=")) {
      envContent = envContent.replace(/VERIFIER_ADDRESS=.*/, verifierEnvVar);
    } else {
      envContent += `\n${verifierEnvVar}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("Updated .env file with new Verifier address");

    console.log("Deployment completed successfully!");
  } catch (error) {
    console.error("Deployment failed with error:", error);

    // Log more detailed error information
    if (error.transaction) {
      console.error("Transaction:", error.transaction);
    }
    if (error.receipt) {
      console.error("Receipt:", error.receipt);
    }
    if (error.data) {
      console.error("Error data:", error.data);
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
