import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getTruthTokenAddress, getTokenBalance } from "../contracts";

export function useBalance() {
  const { address } = useAccount();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchBalance() {
      if (!address) {
        setBalance(0);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get the TruthToken address from PolkaNews contract
        const tokenAddress = await getTruthTokenAddress();
        console.log("TruthToken address:", tokenAddress);

        // Get the balance
        const balance = await getTokenBalance(tokenAddress, address);
        console.log("Raw balance:", balance.toString());

        // Convert from wei to ether
        setBalance(Number(balance) / 1e18);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to fetch balance")
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, [address]);

  return { balance, isLoading, error };
}
