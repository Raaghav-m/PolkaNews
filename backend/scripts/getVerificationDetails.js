const { ethers } = require("ethers");
require("dotenv").config();

// Minimal ABI for the functions we need
const PolkaNewsABI = [
  "function getNewsByRequestId(uint256 requestId) view returns (uint256, string, address, uint256, bool, bool)",
  "function getVerificationResponse(uint256 requestId) view returns (tuple(uint256 requestId, string contentHash, bool isProofVerified, bool binaryDecision, bytes proof, uint256[] pubInputs))",
  "function isProofVerified(uint256 requestId) view returns (bool)",
  "function binaryDecision(uint256 requestId) view returns (bool)",
];

async function getVerificationDetails() {
  // Connect to the network
  const provider = new ethers.JsonRpcProvider(
    "https://testnet-passet-hub-eth-rpc.polkadot.io"
  );

  // Create contract instance
  const polkaNews = new ethers.Contract(
    "0xc82b3E89E0455E3A597D7592E9563337223662c4",
    PolkaNewsABI,
    provider
  );

  try {
    // Start with requestId 1 and increment until we find no more articles
    let requestId = 1;
    let totalArticles = 0;
    let verifiedArticles = 0;

    console.log("\nFetching verification details for news articles...\n");

    while (true) {
      try {
        // Get article details
        const [id, contentHash, reporter, timestamp, isVerified, hasResponse] =
          await polkaNews.getNewsByRequestId(requestId);

        console.log(`\nArticle Request ID: ${requestId}`);
        console.log(`Content Hash: ${contentHash}`);
        console.log(`Reporter: ${reporter}`);
        console.log(
          `Timestamp: ${new Date(Number(timestamp) * 1000).toLocaleString()}`
        );

        // Get verification response
        const verificationResponse =
          await polkaNews.getVerificationResponse(requestId);

        if (verificationResponse.requestId === 0n) {
          console.log("Status: No verification response yet");
        } else {
          // Display verification details
          console.log("\nVerification Details:");
          console.log("-------------------");
          console.log(
            `Proof Verified: ${verificationResponse.isProofVerified ? "Yes" : "No"}`
          );
          console.log(
            `Content Verified: ${verificationResponse.binaryDecision ? "True" : "False"}`
          );
          console.log(`Proof: ${verificationResponse.proof.slice(0, 66)}...`);
          console.log(
            `Public Inputs: ${verificationResponse.pubInputs.join(", ")}`
          );
          console.log("-------------------");

          // Check if article is fully verified
          const isProofVerified = await polkaNews.isProofVerified(requestId);
          const isContentVerified = await polkaNews.binaryDecision(requestId);
          if (isProofVerified && isContentVerified) {
            verifiedArticles++;
          }
        }

        totalArticles++;
        requestId++;
      } catch (error) {
        // If we get an error, we've reached the end of the articles
        break;
      }
    }

    // Print summary
    console.log("\nSummary:");
    console.log(`Total Articles: ${totalArticles}`);
    console.log(`Fully Verified Articles: ${verifiedArticles}`);
    console.log(
      `Verification Rate: ${((verifiedArticles / totalArticles) * 100).toFixed(2)}%`
    );
  } catch (error) {
    console.error("Error fetching verification details:", error);
  }
}

// Run the script
getVerificationDetails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
