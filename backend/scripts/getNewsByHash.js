const { ethers } = require("hardhat");

async function main() {
  // Get the contract address from environment or use a default
  const polkaNewsAddress = "0x74863B9AAECCB34238FA5f607B03242ddc62e1aF";
  if (!polkaNewsAddress) {
    throw new Error("POLKANEWS_ADDRESS not set in environment");
  }

  // Get the contract instance
  const polkaNews = await ethers.getContractAt("PolkaNews", polkaNewsAddress);

  // Get total number of news articles
  const totalNews = await polkaNews.getNewsCount();
  console.log("Total news articles:", totalNews.toString());

  // Set pagination parameters
  const startIndex = 10; // Start from the first article
  const count = 10; // Get 10 articles at a time

  try {
    // Get paginated news articles
    const newsArticles = await polkaNews.getNewsArticles(startIndex, count);
    console.log("\nRaw news articles from contract:", newsArticles);

    // Process each news article
    for (const news of newsArticles) {
      try {
        console.log("\nProcessing news article:", {
          contentHash: news.contentHash,
          reporter: news.reporter,
          timestamp: news.timestamp.toString(),
          isVerified: news.isVerified,
        });

        const newsDetails = await polkaNews.getNewsByHash(news.contentHash);
        console.log("\nNews Details for hash:", news.contentHash);
        console.log("----------------------------------------");
        console.log("Content Hash:", newsDetails[0]);
        console.log("Reporter:", newsDetails[1]);
        console.log("Is Verified:", newsDetails[2]);
        console.log(
          "Timestamp:",
          new Date(Number(newsDetails[3]) * 1000).toLocaleString()
        );
        console.log("----------------------------------------");
      } catch (error) {
        console.error(
          `Error fetching details for hash ${news.contentHash}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Error fetching news articles:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
