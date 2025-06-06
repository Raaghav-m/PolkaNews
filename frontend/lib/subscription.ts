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
    const result = (await readContract(config, {
      ...subscriptionConfig,
      functionName: "getSubscriptionDetails",
      args: [address],
    })) as [bigint, bigint, boolean];

    return {
      startTime: result[0],
      endTime: result[1],
      isActive: result[2],
    };
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    throw error;
  }
}

export async function getSubscriptionFee(): Promise<bigint> {
  try {
    return (await readContract(config, {
      ...subscriptionConfig,
      functionName: "subscriptionFee",
    })) as bigint;
  } catch (error) {
    console.error("Error fetching subscription fee:", error);
    throw error;
  }
}

export async function approveToken(amount: bigint): Promise<void> {
  try {
    await writeContract(config, {
      ...truthTokenConfig,
      functionName: "approve",
      args: [SUBSCRIPTION_ADDRESS, amount],
    });
  } catch (error) {
    console.error("Error approving token:", error);
    throw error;
  }
}

export async function getAllowance(owner: string): Promise<bigint> {
  try {
    return (await readContract(config, {
      ...truthTokenConfig,
      functionName: "allowance",
      args: [owner, SUBSCRIPTION_ADDRESS],
    })) as bigint;
  } catch (error) {
    console.error("Error fetching allowance:", error);
    throw error;
  }
}

export async function getTokenBalance(address: string): Promise<bigint> {
  try {
    return (await readContract(config, {
      ...truthTokenConfig,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;
  } catch (error) {
    console.error("Error fetching token balance:", error);
    throw error;
  }
}

export async function purchaseSubscription(): Promise<void> {
  try {
    await writeContract(config, {
      ...subscriptionConfig,
      functionName: "purchaseSubscription",
    });
  } catch (error) {
    console.error("Error purchasing subscription:", error);
    throw error;
  }
}

export async function isSubscribed(address: string): Promise<boolean> {
  try {
    return (await readContract(config, {
      ...subscriptionConfig,
      functionName: "isSubscribed",
      args: [address],
    })) as boolean;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    throw error;
  }
}
