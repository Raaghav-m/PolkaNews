import { writeContract } from "wagmi/actions";
import { ethers } from "ethers";
import PolkaNewsAbi from "./PolkaNewsAbi.json";
import TruthTokenAbi from "./TruthTokenAbi.json";
import { config } from "./wagmi-config";

export const polkaNewsABI = PolkaNewsAbi;

// Get addresses from environment variables
export const POLKANEWS_ADDRESS = process.env
  .NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`;
export const TRUTH_TOKEN_ADDRESS = process.env
  .NEXT_PUBLIC_TRUTH_TOKEN_ADDRESS as `0x${string}`;

export const polkaNewsConfig = {
  address: POLKANEWS_ADDRESS,
  abi: PolkaNewsAbi,
} as const;

export async function getTruthTokenAddress(): Promise<string> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      POLKANEWS_ADDRESS,
      PolkaNewsAbi,
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
      PolkaNewsAbi,
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

export async function registerReporter(reporterAddress: string) {
  try {
    await writeContract(config, {
      ...polkaNewsConfig,
      functionName: "registerReporter",
      args: [reporterAddress],
    });
  } catch (error) {
    console.error("Error registering reporter:", error);
    throw error;
  }
}

export async function submitNews(contentHash: string) {
  try {
    console.log("Submitting news with content hash:", contentHash);
    const tx = await writeContract(config, {
      ...polkaNewsConfig,
      functionName: "submitNews",
      args: [contentHash],
    });
    console.log("News submission transaction:", tx);
    return tx;
  } catch (error) {
    console.error("Error submitting news:", error);
    throw error;
  }
}
