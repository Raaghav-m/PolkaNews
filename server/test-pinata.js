require("dotenv").config();
const pinataSDK = require("@pinata/sdk");

async function testPinataConnection() {
  try {
    console.log("Testing Pinata connection...");

    // Log environment variables (masked)
    console.log(
      "PINATA_API_KEY:",
      process.env.PINATA_API_KEY ? "✓ Present" : "✗ Missing"
    );
    console.log(
      "PINATA_SECRET_KEY:",
      process.env.PINATA_SECRET_KEY ? "✓ Present" : "✗ Missing"
    );

    // Initialize Pinata
    const pinata = new pinataSDK(
      process.env.PINATA_API_KEY,
      process.env.PINATA_SECRET_KEY
    );

    // Test authentication
    const result = await pinata.testAuthentication();
    console.log("\nPinata Authentication Result:", result);

    // If we get here, authentication was successful
    console.log("\n✅ Successfully connected to Pinata!");

    // Get account details
    const accountInfo = await pinata.pinList();
    console.log("\nAccount Info:");
    console.log("Total Pins:", accountInfo.count);
    console.log("Recent Pins:", accountInfo.rows.length);
  } catch (error) {
    console.error("\n❌ Error testing Pinata connection:");
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
  }
}

testPinataConnection()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
