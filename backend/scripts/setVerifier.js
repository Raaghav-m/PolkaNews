const { ethers } = require("hardhat");

async function main() {
  // Get the contract addresses from the deployment
  const polkaNewsAddress = process.env.POLKA_NEWS_ADDRESS;
  if (!polkaNewsAddress) {
    throw new Error("POLKA_NEWS_ADDRESS not set in environment");
  }

  // Get the verifier address from command line arguments
  const verifierAddress = process.argv[2];
  if (!verifierAddress) {
    throw new Error("Please provide verifier address as argument");
  }

  // Get the signer (owner)
  const [owner] = await ethers.getSigners();

  // Get the PolkaNews contract
  const PolkaNews = await ethers.getContractFactory("PolkaNews");
  const polkaNews = PolkaNews.attach(polkaNewsAddress);

  console.log("Setting verifier address...");
  console.log("PolkaNews contract:", polkaNewsAddress);
  console.log("New verifier address:", verifierAddress);
  console.log("Owner address:", owner.address);

  // Set the verifier address
  const tx = await polkaNews.setVerifier(verifierAddress);
  await tx.wait();

  console.log("Verifier address set successfully!");
  console.log("Transaction hash:", tx.hash);

  // Verify the new verifier address
  const currentVerifier = await polkaNews.getVerifier();
  console.log("Current verifier address:", currentVerifier);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
