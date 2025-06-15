import { readContract, writeContract } from "wagmi/actions";
import SourcesABI from "./abi/SourcesABI.json";
import TruthTokenABI from "./abi/TruthTokenABI.json";
import { config } from "./wagmi-config";

// Get address from environment variables
export const SOURCES_ADDRESS = process.env
  .NEXT_PUBLIC_SOURCES_ADDRESS as `0x${string}`;
export const TRUTH_TOKEN_ADDRESS = process.env
  .NEXT_PUBLIC_TRUTH_TOKEN_ADDRESS as `0x${string}`;

console.log("Contract Addresses:", {
  sources: SOURCES_ADDRESS,
  truthToken: TRUTH_TOKEN_ADDRESS,
});

export const sourcesConfig = {
  address: SOURCES_ADDRESS,
  abi: SourcesABI,
} as const;

export const truthTokenConfig = {
  address: TRUTH_TOKEN_ADDRESS,
  abi: TruthTokenABI,
} as const;

export interface SourceDetails {
  name: string;
  investor: string;
  isActive: boolean;
  stakeAmount: bigint;
  totalRewards: bigint;
}

// Read functions
export async function getSourceDetails(
  sourceName: string
): Promise<SourceDetails> {
  try {
    console.log("Getting source details for:", sourceName);
    const result = (await readContract(config, {
      ...sourcesConfig,
      functionName: "getSourceDetails",
      args: [sourceName],
    })) as [string, string, boolean, bigint, bigint];

    console.log("Source details result:", {
      name: result[0],
      investor: result[1],
      isActive: result[2],
      stakeAmount: result[3].toString(),
      totalRewards: result[4].toString(),
    });

    return {
      name: result[0],
      investor: result[1],
      isActive: result[2],
      stakeAmount: result[3],
      totalRewards: result[4],
    };
  } catch (error) {
    console.error("Error fetching source details:", {
      error,
      sourceName,
      config: sourcesConfig,
    });
    throw error;
  }
}

export async function getActiveSources(): Promise<string[]> {
  try {
    console.log("Getting active sources");
    const result = (await readContract(config, {
      ...sourcesConfig,
      functionName: "getActiveSources",
    })) as string[];
    console.log("Active sources:", result);
    return result;
  } catch (error) {
    console.error("Error fetching active sources:", {
      error,
      config: sourcesConfig,
    });
    throw error;
  }
}

export async function getInvestorSources(investor: string): Promise<string[]> {
  try {
    console.log("Getting sources for investor:", investor);
    const result = (await readContract(config, {
      ...sourcesConfig,
      functionName: "getInvestorSources",
      args: [investor],
    })) as string[];
    console.log("Investor sources:", result);
    return result;
  } catch (error) {
    console.error("Error fetching investor sources:", {
      error,
      investor,
      config: sourcesConfig,
    });
    throw error;
  }
}

export async function getInvestorRewards(investor: string): Promise<bigint> {
  try {
    console.log("Getting rewards for investor:", investor);
    const result = (await readContract(config, {
      ...sourcesConfig,
      functionName: "getInvestorRewards",
      args: [investor],
    })) as bigint;
    console.log("Investor rewards:", result.toString());
    return result;
  } catch (error) {
    console.error("Error fetching investor rewards:", {
      error,
      investor,
      config: sourcesConfig,
    });
    throw error;
  }
}

export async function getStakeAmount(): Promise<bigint> {
  try {
    const result = await readContract(config, {
      ...sourcesConfig,
      functionName: "STAKE_AMOUNT",
    });
    return result as bigint;
  } catch (error) {
    console.error("Error getting stake amount:", error);
    throw error;
  }
}

// Write functions
export async function addSource(
  sourceName: string,
  stakeAmount: bigint
): Promise<void> {
  try {
    console.log(
      "Adding source:",
      sourceName,
      "with stake amount:",
      stakeAmount.toString()
    );
    await writeContract(config, {
      ...sourcesConfig,
      functionName: "addSource",
      args: [sourceName],
    });
    console.log("Source added successfully");
  } catch (error) {
    console.error("Error adding source:", {
      error,
      sourceName,
      stakeAmount: stakeAmount.toString(),
      config: sourcesConfig,
    });
    throw error;
  }
}

export async function challengeSource(sourceName: string): Promise<void> {
  try {
    console.log("Challenging source:", sourceName);
    await writeContract(config, {
      ...sourcesConfig,
      functionName: "challengeSource",
      args: [sourceName],
    });
    console.log("Source challenged successfully");
  } catch (error) {
    console.error("Error challenging source:", {
      error,
      sourceName,
      config: sourcesConfig,
    });
    throw error;
  }
}

export async function claimRewards(): Promise<void> {
  try {
    console.log("Claiming rewards");
    await writeContract(config, {
      ...sourcesConfig,
      functionName: "claimRewards",
    });
    console.log("Rewards claimed successfully");
  } catch (error) {
    console.error("Error claiming rewards:", {
      error,
      config: sourcesConfig,
    });
    throw error;
  }
}

export async function distributeRewards(): Promise<void> {
  try {
    console.log("Distributing rewards");
    await writeContract(config, {
      ...sourcesConfig,
      functionName: "distributeRewards",
    });
    console.log("Rewards distributed successfully");
  } catch (error) {
    console.error("Error distributing rewards:", {
      error,
      config: sourcesConfig,
    });
    throw error;
  }
}

export async function getTokenBalance(address: string): Promise<bigint> {
  try {
    console.log("Getting token balance for address:", address);
    const result = (await readContract(config, {
      ...truthTokenConfig,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;
    console.log("Token balance:", result.toString());
    return result;
  } catch (error) {
    console.error("Error fetching token balance:", {
      error,
      address,
      config: truthTokenConfig,
    });
    throw error;
  }
}

export async function getAllowance(owner: string): Promise<bigint> {
  try {
    console.log("Getting allowance for owner:", owner);
    const result = (await readContract(config, {
      ...truthTokenConfig,
      functionName: "allowance",
      args: [owner, SOURCES_ADDRESS],
    })) as bigint;
    console.log("Allowance:", result.toString());
    return result;
  } catch (error) {
    console.error("Error fetching allowance:", {
      error,
      owner,
      config: truthTokenConfig,
    });
    throw error;
  }
}

export async function approveTokens(amount: bigint): Promise<void> {
  try {
    console.log("Approving token amount:", amount.toString());
    await writeContract(config, {
      ...truthTokenConfig,
      functionName: "approve",
      args: [SOURCES_ADDRESS, amount],
    });
    console.log("Token approval successful");
  } catch (error) {
    console.error("Error approving token:", {
      error,
      amount: amount.toString(),
      config: truthTokenConfig,
    });
    throw error;
  }
}
