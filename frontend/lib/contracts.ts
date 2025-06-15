import { writeContract, readContract } from "wagmi/actions";
import { ethers } from "ethers";
import PolkaNewsABI from "@/lib/abi/PolkaNewsABI.json";
import TruthTokenAbi from "./abi/TruthTokenABI.json";
import VERIFICATION_ABI from "./abi/VerificationABI.json";
import { config } from "./wagmi-config";
import { useReadContract } from "wagmi";
import { ipfsService } from "@/lib/ipfs";
import { IPFSContent } from "@/lib/types";

export const polkaNewsABI = PolkaNewsABI;

// Get addresses from environment variables
export const POLKANEWS_ADDRESS = process.env
  .NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`;
export const TRUTH_TOKEN_ADDRESS = process.env
  .NEXT_PUBLIC_TRUTH_TOKEN_ADDRESS as `0x${string}`;
export const VERIFICATION_CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_VERIFICATION_CONTRACT_ADDRESS as `0x${string}`;

export const polkaNewsConfig = {
  address: POLKANEWS_ADDRESS,
  abi: PolkaNewsABI,
} as const;

export async function getTruthTokenAddress(): Promise<string> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      POLKANEWS_ADDRESS,
      PolkaNewsABI,
      provider
    );
    const tokenAddress = await contract.truthToken();
    console.log("TruthToken address from contract:", tokenAddress);
    return tokenAddress;
  } catch (error) {
    console.error("Error fetching TruthToken address:", error);
    throw error;
  }
}

export async function isReporter(address: string): Promise<boolean> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      POLKANEWS_ADDRESS,
      PolkaNewsABI,
      provider
    );
    const isReporter = await contract.isReporter(address);
    return isReporter;
  } catch (error) {
    console.error("Error checking reporter status:", error);
    throw error;
  }
}

export async function getTokenBalance(
  tokenAddress: string,
  userAddress: string
): Promise<bigint> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(tokenAddress, TruthTokenAbi, provider);
    const balance = await contract.balanceOf(userAddress);
    console.log("Token balance:", balance.toString());
    return balance;
  } catch (error) {
    console.error("Error fetching token balance:", error);
    throw error;
  }
}

export async function registerReporter() {
  try {
    const result = await writeContract(config, {
      address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
      abi: PolkaNewsABI,
      functionName: "registerReporter",
    });
    return result;
  } catch (error) {
    console.error("Error registering reporter:", error);
    throw error;
  }
}

export async function submitNews(contentHash: string) {
  try {
    const result = await writeContract(config, {
      address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
      abi: PolkaNewsABI,
      functionName: "submitNews",
      args: [contentHash],
    });
    return result;
  } catch (error) {
    console.error("Error submitting news:", error);
    throw error;
  }
}

export async function verifyNews(contentHash: string, isVerified: boolean) {
  try {
    const result = await writeContract(config, {
      address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
      abi: PolkaNewsABI,
      functionName: "verifyNews",
      args: [contentHash, isVerified],
    });
    return result;
  } catch (error) {
    console.error("Error verifying news:", error);
    throw error;
  }
}

export async function viewNews(contentHash: string) {
  try {
    const result = await writeContract(config, {
      address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
      abi: PolkaNewsABI,
      functionName: "viewNews",
      args: [contentHash],
    });
    return result;
  } catch (error) {
    console.error("Error viewing news:", error);
    throw error;
  }
}

export async function getNewsByHash(contentHash: string) {
  try {
    const result = await readContract(config, {
      address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
      abi: PolkaNewsABI,
      functionName: "getNewsByHash",
      args: [contentHash],
    });
    return result;
  } catch (error) {
    console.error("Error getting news by hash:", error);
    throw error;
  }
}

export async function getAllNews() {
  try {
    const result = await readContract(config, {
      address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
      abi: PolkaNewsABI,
      functionName: "getAllNews",
    });
    return result;
  } catch (error) {
    console.error("Error getting all news:", error);
    throw error;
  }
}

export async function getNewsArticles(startIndex: number, count: number) {
  try {
    const result = await readContract(config, {
      address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
      abi: PolkaNewsABI,
      functionName: "getNewsArticles",
      args: [startIndex, count],
    });
    return result;
  } catch (error) {
    console.error("Error getting news articles:", error);
    throw error;
  }
}

export async function getNewsCount() {
  try {
    const result = await readContract(config, {
      address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
      abi: PolkaNewsABI,
      functionName: "getNewsCount",
    });
    return result;
  } catch (error) {
    console.error("Error getting news count:", error);
    throw error;
  }
}

// Add hooks for news-related contract reads
export const useNewsArticles = (startIndex: number = 0, count: number = 10) => {
  return useReadContract({
    address: POLKANEWS_ADDRESS,
    abi: PolkaNewsABI,
    functionName: "getNewsArticles",
    args: [startIndex, count],
  });
};

export const useIsReporter = (address: string | undefined) => {
  return useReadContract({
    address: POLKANEWS_ADDRESS,
    abi: PolkaNewsABI,
    functionName: "isReporter",
    args: [address],
    query: {
      enabled: !!address,
    },
  });
};

interface ArticleResponse {
  reporter: string;
  timestamp: bigint;
  isProofVerified: boolean;
  binaryDecision: boolean;
  requestId: bigint;
}

export async function getNewsDetails(contentHash: string): Promise<{
  title: string;
  content: string;
  reporter: string;
  timestamp: string;
  isProofVerified: boolean;
  binaryDecision: boolean;
  contentHash: string;
} | null> {
  try {
    // First get all news to find the matching hash
    const allNews = (await readContract(config, {
      address: POLKANEWS_ADDRESS,
      abi: PolkaNewsABI,
      functionName: "getAllNews",
    })) as { contentHash: string; requestId: bigint }[];

    // Find the news article with matching content hash
    const matchingNews = allNews.find(
      (news) => news.contentHash === contentHash
    );
    if (!matchingNews) {
      return null;
    }

    // Get the article details using requestId
    const article = (await readContract(config, {
      address: POLKANEWS_ADDRESS,
      abi: PolkaNewsABI,
      functionName: "getNewsByRequestId",
      args: [matchingNews.requestId],
    })) as ArticleResponse;

    if (!article) {
      return null;
    }

    // Get the content from IPFS
    const ipfsContent = await ipfsService.getContent(contentHash);
    if (!ipfsContent) {
      return null;
    }

    console.log("Article data:", article);
    console.log("IPFS content:", ipfsContent);

    return {
      title: ipfsContent.name || "Untitled",
      content: ipfsContent.content || "",
      requestId: article[0],
      timestamp: article.timestamp ? article.timestamp.toString() : "0",
      isProofVerified: article[5] || false,
      binaryDecision: article[4] || false,
      contentHash: contentHash,
    };
  } catch (error) {
    console.error("Error fetching news details:", error);
    return null;
  }
}

export async function verifyArticleProof(requestId: number): Promise<boolean> {
  try {
    console.log(requestId);
    const result = await writeContract(config, {
      address: VERIFICATION_CONTRACT_ADDRESS,
      abi: VERIFICATION_ABI,
      functionName: "verifyArticleProof",
      args: [BigInt(requestId)],
    });

    // Wait for transaction to be mined and get the result
    // Note: Since this is a state-changing function, we need to wait for the transaction
    // and then read the result. For now, we'll return true if transaction succeeds
    console.log("Verification transaction hash:", result);
    return true;
  } catch (error) {
    console.error("Error verifying article proof:", error);
    throw error;
  }
}
