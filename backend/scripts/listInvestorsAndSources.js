const { ethers } = require("ethers");
const SourcesABI = require("../../frontend/lib/abi/SourcesABI.json");

// Contract address
const SOURCES_ADDRESS = "0x58c755B1973d090456B6BD0841968BF9f737C59f";

// Connect to the network
const provider = new ethers.JsonRpcProvider(
  "https://rpc.api.moonbase.moonbeam.network"
);

// Create contract instance
const sourcesContract = new ethers.Contract(
  SOURCES_ADDRESS,
  SourcesABI,
  provider
);

async function listInvestorsAndSources() {
  try {
    console.log("Fetching investors and sources...");

    // Get all active sources
    const activeSources = await sourcesContract.getActiveSources();
    console.log("\nActive Sources:", activeSources.length);

    // Create a map to store investor sources
    const investorSources = new Map();

    // For each source, get its details
    for (const source of activeSources) {
      const details = await sourcesContract.getSourceDetails(source);
      const investor = details.investor;

      if (!investorSources.has(investor)) {
        investorSources.set(investor, []);
      }
      investorSources.get(investor).push({
        name: source,
        stakeAmount: ethers.formatEther(details.stakeAmount),
        totalRewards: ethers.formatEther(details.totalRewards),
        isActive: details.isActive,
      });
    }

    // Print results
    console.log("\nInvestors and their sources:");
    console.log("============================");

    for (const [investor, sources] of investorSources) {
      console.log(`\nInvestor: ${investor}`);
      console.log("Sources:");
      sources.forEach((source) => {
        console.log(`  - ${source.name}`);
        console.log(`    Stake: ${source.stakeAmount} TRUTH`);
        console.log(`    Total Rewards: ${source.totalRewards} TRUTH`);
        console.log(`    Status: ${source.isActive ? "Active" : "Inactive"}`);
      });
    }

    // Print summary
    console.log("\nSummary:");
    console.log("========");
    console.log(`Total Investors: ${investorSources.size}`);
    console.log(`Total Sources: ${activeSources.length}`);

    // Calculate total staked amount
    let totalStaked = 0n;
    for (const sources of investorSources.values()) {
      for (const source of sources) {
        totalStaked += ethers.parseEther(source.stakeAmount);
      }
    }
    console.log(`Total Staked: ${ethers.formatEther(totalStaked)} TRUTH`);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run the script
listInvestorsAndSources()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
