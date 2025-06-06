import { ethers } from "hardhat";
import { PolkaNews } from "../typechain-types";

async function main() {
  // Get the contract address from environment or use a default
  const polkaNewsAddress = process.env.POLKANEWS_ADDRESS;
  if (!polkaNewsAddress) {
    throw new Error("POLKANEWS_ADDRESS not set in environment");
  }

  // Get the contract instance
  const polkaNews = (await ethers.getContractAt(
    "PolkaNews",
    polkaNewsAddress
  )) as PolkaNews;

  // Get all news articles first to get content hashes
  const allNews = await polkaNews.getAllNews();
  console.log("Total news articles:", allNews.length);

  // Process each news article
  for (const news of allNews) {
    try {
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
