require("dotenv").config();
const { ethers } = require("ethers");
const pinataSDK = require("@pinata/sdk");
const OpenAI = require("openai");
const PolkaNewsABI = require("./abi/PolkaNewsABI.json");
const SubscriptionManagerABI = require("./abi/SubscriptionManagerABI.json");
const fetch = require("node-fetch");

// Contract addresses
const POLKANEWS_ADDRESS = "0x74863B9AAECCB34238FA5f607B03242ddc62e1aF";
const SUBSCRIPTION_MANAGER_ADDRESS =
  "0x0aAFC279D67297BeF1cB717d51342EdBDA266798";

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Pinata
const pinata = new pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_KEY
);

// Blockchain connection
const HTTP_URL =
  process.env.RPC_URL || "https://testnet-passet-hub-eth-rpc.polkadot.io";
let provider;
let polkaNewsContract;
let subscriptionManagerContract;

// Track processed events to avoid duplicates
const processedEvents = new Set();

// Add a mapping to store IPFS hashes
const ipfsHashMapping = new Map();

async function setupProvider() {
  provider = new ethers.JsonRpcProvider(HTTP_URL);
  console.log("✅ Connected via HTTP");

  const oracleSigner = new ethers.Wallet(
    process.env.ORACLE_PRIVATE_KEY,
    provider
  );

  // Initialize both contracts
  polkaNewsContract = new ethers.Contract(
    POLKANEWS_ADDRESS,
    PolkaNewsABI,
    oracleSigner
  );

  subscriptionManagerContract = new ethers.Contract(
    SUBSCRIPTION_MANAGER_ADDRESS,
    SubscriptionManagerABI,
    oracleSigner
  );

  console.log("✅ Contracts initialized");
}

async function verifyNewsWithAI(content) {
  try {
    const prompt = `You are a fact-checking AI assistant. Please analyze the following news article and determine if it appears to be factual and legitimate. Consider:
1. Tone and language (is it sensationalist or balanced?)
2. Source credibility (are sources cited?)
3. Factual consistency
4. Logical coherence
5. Potential bias

News content:
${JSON.stringify(content, null, 2)}

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

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a fact-checking AI assistant. Analyze news content and provide a structured response with analysis, confidence score, and verdict.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    // Parse the response content as JSON
    const verificationResult = JSON.parse(response.choices[0].message.content);
    return verificationResult;
  } catch (error) {
    console.error("Error in AI verification:", error);
    throw error;
  }
}

async function fetchAndVerifyNews(ipfsHash, reporter) {
  try {
    // Fetch content from IPFS
    const response = await fetch(
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    );
    if (!response.ok) {
      console.error(`Failed to fetch from IPFS. Status: ${response.status}`);
      throw new Error("Failed to fetch from IPFS");
    }

    const content = await response.text();
    console.log("Fetched content from IPFS:", content);

    // Verify with AI
    const verificationResult = await verifyNewsWithAI(content);
    console.log("AI Verification result:", verificationResult);

    return verificationResult.verdict;
  } catch (error) {
    console.error("Error in fetchAndVerifyNews:", error);
    return false;
  }
}

async function storeIpfsHashMapping(contentHash, ipfsHash) {
  // Extract the hash value from the contentHash object
  const hashValue = contentHash.hash || contentHash;
  ipfsHashMapping.set(hashValue, ipfsHash);
  console.log(`Stored mapping: ${hashValue} -> ${ipfsHash}`);
}

async function processNewsSubmission(contentHash, reporter) {
  try {
    console.log(`Processing news from reporter: ${reporter}`);
    console.log("Received content hash:", contentHash);

    // Check if reporter is registered
    const isReporter = await polkaNewsContract.reporters(reporter);
    if (!isReporter) {
      console.log(`❌ Reporter ${reporter} is not registered`);
      return;
    }

    // Get the actual content hash string from the event
    const contentHashStr = contentHash.hash || contentHash;
    console.log("Using content hash:", contentHashStr);

    // Get the IPFS hash from the mapping
    const ipfsHash = ipfsHashMapping.get(contentHashStr);
    if (!ipfsHash) {
      console.log("❌ IPFS hash not found for content hash:", contentHashStr);
      return;
    }
    console.log("Found IPFS hash:", ipfsHash);

    // Fetch and verify the news using the IPFS hash
    const verificationResult = await fetchAndVerifyNews(ipfsHash, reporter);

    // Submit verification result using the IPFS hash since that's what the contract stores
    const tx = await polkaNewsContract.verifyNews(
      ipfsHash, // Use IPFS hash since that's what the contract stores in newsByHash
      verificationResult
    );
    await tx.wait();
    console.log(`✅ Verification completed. Result: ${verificationResult}`);
    console.log(`Content Hash: ${contentHashStr}`);
    console.log(`IPFS Hash: ${ipfsHash}`);
  } catch (error) {
    console.error(`❌ Error processing news from ${reporter}:`, error);
  }
}

async function pollForEvents() {
  let lastBlock = await provider.getBlockNumber();
  console.log(`\n🔄 Starting event polling from block ${lastBlock}`);

  setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock > lastBlock) {
        console.log(
          `\n📦 Checking blocks ${
            lastBlock + 1
          } to ${currentBlock} for events...`
        );

        // Listen for NewsSubmitted events
        console.log("🔍 Looking for NewsSubmitted events...");
        const filter = polkaNewsContract.filters.NewsSubmitted();
        const events = await polkaNewsContract.queryFilter(
          filter,
          lastBlock + 1,
          currentBlock
        );

        if (events.length > 0) {
          console.log(`📰 Found ${events.length} news submission(s)`);
        }

        for (const event of events) {
          const eventId = `${event.blockNumber}-${event.transactionIndex}-${event.logIndex}`;
          if (processedEvents.has(eventId)) {
            console.log("⏭️  Skipping already processed event");
            continue;
          }

          // Handle indexed event args
          const contentHash = event.args[0];
          const reporter = event.args[1];

          // Get the transaction to find the IPFS hash
          const tx = await provider.getTransaction(event.transactionHash);
          const decodedInput = polkaNewsContract.interface.parseTransaction({
            data: tx.data,
          });
          const ipfsHash = decodedInput.args[0]; // The IPFS hash is the first argument

          // Store the mapping
          await storeIpfsHashMapping(contentHash, ipfsHash);

          console.log(`\n📝 Processing news from reporter ${reporter}`);
          await processNewsSubmission(contentHash, reporter);
          processedEvents.add(eventId);
        }

        // Listen for SubscriptionPurchased events
        console.log("\n🔍 Looking for SubscriptionPurchased events...");
        const subFilter =
          subscriptionManagerContract.filters.SubscriptionPurchased();
        const subEvents = await subscriptionManagerContract.queryFilter(
          subFilter,
          lastBlock + 1,
          currentBlock
        );

        if (subEvents.length > 0) {
          console.log(`💳 Found ${subEvents.length} new subscription(s)`);
        }

        for (const event of subEvents) {
          console.log(
            `✨ New subscription purchased by: ${event.args.subscriber}`
          );
        }

        lastBlock = currentBlock;
        console.log(`\n✅ Finished processing block ${currentBlock}`);
      } else {
        console.log("⏳ Waiting for new blocks...");
      }
    } catch (error) {
      console.error("❌ Error polling for events:", error);
      console.log("🔄 Retrying in next interval...");
    }
  }, 5000);
}

async function main() {
  console.log("\n🚀 Starting PolkaNews Oracle Server");
  console.log("--------------------------------");
  await setupProvider();
  console.log("\n📡 Starting event polling...");
  await pollForEvents();
  console.log("\n✨ Server is running and listening for events");
  console.log("--------------------------------");
  process.stdin.resume();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
