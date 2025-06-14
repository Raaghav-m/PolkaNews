import { readContract, writeContract } from "wagmi/actions";
import { ethers } from "ethers";
import SubscriptionManagerABI from "./abi/SubscriptionManagerABI.json";
import TruthTokenABI from "./abi/TruthTokenABI.json";
import { config } from "./wagmi-config";

export const SUBSCRIPTION_ADDRESS = process.env
  .NEXT_PUBLIC_SUBSCRIPTION_ADDRESS as `0x${string}`;
export const TRUTH_TOKEN_ADDRESS = process.env
  .NEXT_PUBLIC_TRUTH_TOKEN_ADDRESS as `0x${string}`;
export const FAUCET_ADDRESS = process.env
  .NEXT_PUBLIC_FAUCET_ADDRESS as `0x${string}`;

console.log("Contract Addresses:", {
  subscription: SUBSCRIPTION_ADDRESS,
  truthToken: TRUTH_TOKEN_ADDRESS,
  faucet: FAUCET_ADDRESS,
});

export const subscriptionConfig = {
  address: SUBSCRIPTION_ADDRESS,
  abi: SubscriptionManagerABI,
} as const;

export const truthTokenConfig = {
  address: TRUTH_TOKEN_ADDRESS,
  abi: TruthTokenABI,
} as const;

export interface SubscriptionDetails {
  startTime: bigint;
  endTime: bigint;
  isActive: boolean;
}

export async function getSubscriptionDetails(
  address: string
): Promise<SubscriptionDetails> {
  try {
    console.log("Getting subscription details for address:", address);
    console.log("Using config:", {
      address: subscriptionConfig.address,
      abi: subscriptionConfig.abi,
    });

    const result = (await readContract(config, {
      ...subscriptionConfig,
      functionName: "getSubscriptionDetails",
      args: [address],
    })) as [bigint, bigint, boolean];

    console.log("Subscription details result:", {
      startTime: result[0].toString(),
      endTime: result[1].toString(),
      isActive: result[2],
    });

    return {
      startTime: result[0],
      endTime: result[1],
      isActive: result[2],
    };
  } catch (error) {
    console.error("Error fetching subscription details:", {
      error,
      address,
      config: subscriptionConfig,
      chainId: config.chains[0].id,
    });
    throw error;
  }
}

export async function getSubscriptionFee(): Promise<bigint> {
  try {
    console.log("Getting subscription fee");
    const result = (await readContract(config, {
      ...subscriptionConfig,
      functionName: "subscriptionFee",
    })) as bigint;
    console.log("Subscription fee:", result.toString());
    return result;
  } catch (error) {
    console.error("Error fetching subscription fee:", {
      error,
      config: subscriptionConfig,
      chainId: config.chains[0].id,
    });
    throw error;
  }
}

export async function approveToken(amount: bigint): Promise<void> {
  try {
    console.log("Approving token amount:", amount.toString());
    await writeContract(config, {
      ...truthTokenConfig,
      functionName: "approve",
      args: [SUBSCRIPTION_ADDRESS, amount],
    });
    console.log("Token approval successful");
  } catch (error) {
    console.error("Error approving token:", {
      error,
      amount: amount.toString(),
      config: truthTokenConfig,
      chainId: config.chains[0].id,
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
      args: [owner, SUBSCRIPTION_ADDRESS],
    })) as bigint;
    console.log("Allowance:", result.toString());
    return result;
  } catch (error) {
    console.error("Error fetching allowance:", {
      error,
      owner,
      config: truthTokenConfig,
      chainId: config.chains[0].id,
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
      chainId: config.chains[0].id,
    });
    throw error;
  }
}

export async function purchaseSubscription(): Promise<void> {
  try {
    console.log("Purchasing subscription");
    await writeContract(config, {
      ...subscriptionConfig,
      functionName: "purchaseSubscription",
    });
    console.log("Subscription purchase successful");
  } catch (error) {
    console.error("Error purchasing subscription:", {
      error,
      config: subscriptionConfig,
      chainId: config.chains[0].id,
    });
    throw error;
  }
}

export async function isSubscribed(address: string): Promise<boolean> {
  try {
    console.log("Checking subscription status for address:", address);
    const result = (await readContract(config, {
      ...subscriptionConfig,
      functionName: "isSubscribed",
      args: [address],
    })) as boolean;
    console.log("Subscription status:", result);
    return result;
  } catch (error) {
    console.error("Error checking subscription status:", {
      error,
      address,
      config: subscriptionConfig,
      chainId: config.chains[0].id,
    });
    throw error;
  }
}
