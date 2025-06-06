import { useReadContract } from "wagmi";
import { POLKANEWS_ABI, POLKANEWS_ADDRESS } from "../contracts";

export function useTruthTokenAddress() {
  console.log("Fetching TruthToken address from:", POLKANEWS_ADDRESS);

  const {
    data: tokenAddress,
    isLoading,
    error,
  } = useReadContract({
    address: POLKANEWS_ADDRESS as `0x${string}`,
    abi: POLKANEWS_ABI,
    functionName: "truthToken",
  });

  console.log("TruthToken Address Debug:", {
    polkaNewsAddress: POLKANEWS_ADDRESS,
    tokenAddress,
    isLoading,
    error: error?.message,
  });

  if (error) {
    console.error("Error fetching TruthToken address:", error);
  }

  return {
    tokenAddress,
    isLoading,
    error,
  };
}
