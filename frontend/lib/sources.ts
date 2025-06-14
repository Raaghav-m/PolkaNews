import { writeContract, readContract } from "wagmi/actions";
import { ethers } from "ethers";
import SourcesABI from "./abi/SourcesABI.json";
import { config } from "./wagmi-config";

// Get address from environment variables
export const SOURCES_ADDRESS = process.env
  .NEXT_PUBLIC_SOURCES_ADDRESS as `0x${string}`;

export const sourcesConfig = {
  address: SOURCES_ADDRESS,
  abi: SourcesABI,
} as const;

// Read functions
export async function getActiveSources() {
  try {
    const result = await readContract(config, {
      ...sourcesConfig,
      functionName: "getActiveSources",
    });
    return result;
  } catch (error) {
    console.error("Error getting active sources:", error);
    throw error;
  }
}

export async function getInvestorSources(investorAddress: string) {
  try {
    const result = await readContract(config, {
      ...sourcesConfig,
      functionName: "getInvestorSources",
      args: [investorAddress],
    });
    return result;
  } catch (error) {
    console.error("Error getting investor sources:", error);
    throw error;
  }
}

export async function getInvestorRewards(investorAddress: string) {
  try {
    const result = await readContract(config, {
      ...sourcesConfig,
      functionName: "getInvestorRewards",
      args: [investorAddress],
    });
    return result;
  } catch (error) {
    console.error("Error getting investor rewards:", error);
    throw error;
  }
}

export async function getSourceDetails(sourceName: string) {
  try {
    const result = await readContract(config, {
      ...sourcesConfig,
      functionName: "getSourceDetails",
      args: [sourceName],
    });
    return result;
  } catch (error) {
    console.error("Error getting source details:", error);
    throw error;
  }
}

export async function getSourceTotalRewards(sourceName: string) {
  try {
    const result = await readContract(config, {
      ...sourcesConfig,
      functionName: "getSourceTotalRewards",
      args: [sourceName],
    });
    return result;
  } catch (error) {
    console.error("Error getting source total rewards:", error);
    throw error;
  }
}

// Write functions
export async function addSource(sourceName: string) {
  try {
    const result = await writeContract(config, {
      ...sourcesConfig,
      functionName: "addSource",
      args: [sourceName],
    });
    return result;
  } catch (error) {
    console.error("Error adding source:", error);
    throw error;
  }
}

export async function claimRewards() {
  try {
    const result = await writeContract(config, {
      ...sourcesConfig,
      functionName: "claimRewards",
    });
    return result;
  } catch (error) {
    console.error("Error claiming rewards:", error);
    throw error;
  }
}

export async function challengeSource(sourceName: string) {
  try {
    const result = await writeContract(config, {
      ...sourcesConfig,
      functionName: "challengeSource",
      args: [sourceName],
    });
    return result;
  } catch (error) {
    console.error("Error challenging source:", error);
    throw error;
  }
}
