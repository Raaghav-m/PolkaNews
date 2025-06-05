require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const pinataSDK = require("@pinata/sdk");
const OpenAI = require("openai");
const PolkaNewsABI = require("./abi/PolkaNewsAbi.json");
const fetch = require("node-fetch");

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinata
const pinata = new pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_KEY
);

// Initialize blockchain connection
const WS_URL =
  process.env.WS_URL || "wss://testnet-passet-hub-eth-rpc.polkadot.io/ws";
const HTTP_URL =
  process.env.RPC_URL || "https://testnet-passet-hub-eth-rpc.polkadot.io";
let provider;
let polkaNewsContract;

// Track processed events to avoid duplicates
const processedEvents = new Set();

async function setupProvider() {
  try {
    // Just use HTTP provider since WebSocket isn't supported
    provider = new ethers.JsonRpcProvider(HTTP_URL);
    console.log("✅ Connected via HTTP");

    const oracleSigner = new ethers.Wallet(
      process.env.ORACLE_PRIVATE_KEY,
      provider
    );
    polkaNewsContract = new ethers.Contract(
      process.env.POLKANEWS_ADDRESS ||
        "0xFc43D3C0C227E5De166B9061Bd13493C2e378Ed5",
      PolkaNewsABI,
      oracleSigner
    );
  } catch (error) {
    console.error("Error setting up provider:", error);
    throw error;
  }
}

async function verifyNewsWithAI(newsContent) {
  const prompt = `You are a fact-checking AI assistant. Please analyze the following news article and determine if it appears to be factual and legitimate. Consider:
1. Tone and language (is it sensationalist or balanced?)
2. Source credibility (are sources cited?)
3. Factual consistency
4. Logical coherence
5. Potential bias

News content:
${JSON.stringify(newsContent, null, 2)}

Please respond with:
1. A brief analysis
2. A confidence score (0-100)
3. A final verdict (true/false)

Format your response as JSON:
{
    "analysis": "your analysis here",
    "confidenceScore": number,
    "verdict": boolean
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content:
          "You are a professional fact-checker. Always respond in valid JSON format with the specified fields: analysis, confidenceScore, and verdict.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0].message.content);
  console.log("AI Verification Result:", result);
  return result.verdict && result.confidenceScore >= 70;
}

async function fetchAndVerifyNews(ipfsHash, reporter) {
  try {
    // Get the content from IPFS
    const pinList = await pinata.pinList({
      hashContains: ipfsHash,
      status: "pinned",
    });

    if (!pinList.rows.length) {
      throw new Error("Content not found on Pinata");
    }

    // Get the pin data
    const pin = pinList.rows[0];

    // Since we can't directly get the file content from Pinata SDK,
    // we'll fetch it from IPFS gateway
    const response = await fetch(
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.statusText}`);
    }

    const newsContent = await response.json();
    console.log("Successfully fetched content from IPFS");

    // Verify the news using OpenAI
    const isVerified = await verifyNewsWithAI(newsContent);
    console.log("AI verification complete. Result:", isVerified);

    return isVerified;
  } catch (error) {
    console.error("Error processing news:", error);
    throw error;
  }
}

async function processNewsSubmission(contentHash, reporter) {
  try {
    console.log(`Processing news from reporter: ${reporter}`);
    console.log("Received content hash:", contentHash);

    // Since we're receiving the keccak256 hash directly, we can use it as is
    // We'll fetch the content directly from Pinata using the hash
    try {
      // Get the content from IPFS
      const pinList = await pinata.pinList();
      console.log("Fetching all pins to find matching content...");

      // Find the most recent pin that matches our criteria
      const matchingPin = pinList.rows.find((pin) => {
        const pinHash = ethers.keccak256(ethers.toUtf8Bytes(pin.ipfs_pin_hash));
        return pinHash === contentHash;
      });

      if (!matchingPin) {
        throw new Error("Content not found on Pinata");
      }

      const ipfsHash = matchingPin.ipfs_pin_hash;
      console.log("Found matching IPFS hash:", ipfsHash);

      // Fetch and verify the news
      const isVerified = await fetchAndVerifyNews(ipfsHash, reporter);

      // Submit verification result
      const tx = await polkaNewsContract.verifyNews(contentHash, isVerified);
      await tx.wait();
      console.log(`✅ Verification completed. Result: ${isVerified}`);
      console.log(`Content Hash: ${contentHash}`);
      console.log(`IPFS Hash: ${ipfsHash}`);
    } catch (error) {
      console.error("Error fetching from Pinata:", error);
      throw error;
    }
  } catch (error) {
    console.error(`❌ Error processing news from ${reporter}:`, error);
  }
}

async function pollForEvents() {
  let lastBlock = await provider.getBlockNumber();
  console.log("Starting to poll from block:", lastBlock);

  setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber();

      if (currentBlock > lastBlock) {
        console.log(`Checking blocks ${lastBlock + 1} to ${currentBlock}`);

        const filter = polkaNewsContract.filters.NewsSubmitted();
        const events = await polkaNewsContract.queryFilter(
          filter,
          lastBlock + 1,
          currentBlock
        );

        for (const event of events) {
          // Create a unique identifier for the event
          const eventId = `${event.blockNumber}-${event.transactionIndex}-${event.logIndex}`;

          // Skip if we've already processed this event
          if (processedEvents.has(eventId)) {
            console.log(`Skipping already processed event: ${eventId}`);
            continue;
          }

          console.log(
            `\n📰 New news submission detected in block ${event.blockNumber}!`
          );

          try {
            await processNewsSubmission(event.args[0], event.args[1]);
            // Mark event as processed only if successful
            processedEvents.add(eventId);
          } catch (error) {
            if (error.message?.includes("News already verified")) {
              console.log("✓ News was already verified, marking as processed");
              processedEvents.add(eventId);
            } else {
              console.error(`❌ Error processing news:`, error);
            }
          }
        }

        lastBlock = currentBlock;
      }
    } catch (error) {
      console.error("Error polling for events:", error);
      // Don't update lastBlock if there was an error, so we can retry
    }
  }, 5000); // Poll every 5 seconds
}

async function main() {
  try {
    // Test Pinata connection
    console.log("Testing Pinata connection...");
    // await pinata.testAuthentication();
    console.log("✅ Successfully connected to Pinata");

    // Setup provider and contract
    await setupProvider();

    // Verify contract connection
    const oracle = await polkaNewsContract.oracle();
    console.log("✅ Successfully connected to PolkaNews contract");
    console.log("Oracle address:", oracle);

    console.log("\n🔍 Starting event polling...");
    await pollForEvents();
    console.log("✅ Successfully started event polling");

    // Keep the process running
    process.stdin.resume();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\nGracefully shutting down...");
  if (provider && typeof provider.destroy === "function") {
    provider.destroy();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nGracefully shutting down...");
  if (provider && typeof provider.destroy === "function") {
    provider.destroy();
  }
  process.exit(0);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
