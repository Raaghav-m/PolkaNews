"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getTokenBalance } from "@/lib/subscription";
import { truthTokenConfig } from "@/lib/subscription";
import Link from "next/link";

export default function FaucetPage() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);

  // Read if user has used faucet
  const { data: hasUsedFaucet } = useReadContract({
    ...truthTokenConfig,
    functionName: "hasUsedFaucet",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  // Write contract for using faucet
  const { writeContract, isPending } = useWriteContract();

  // Fetch token balance
  useEffect(() => {
    async function fetchBalance() {
      if (!address) return;
      try {
        const balance = await getTokenBalance(address);
        setTokenBalance(balance);
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    }
    fetchBalance();
  }, [address]);

  const handleUseFaucet = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const hash = await writeContract({
        ...truthTokenConfig,
        functionName: "useFaucet",
      });

      toast({
        title: "Success",
        description: "You've received 100 TRUTH tokens!",
      });
      // Refresh balance
      const balance = await getTokenBalance(address);
      setTokenBalance(balance);
    } catch (error) {
      console.error("Error using faucet:", error);
      toast({
        title: "Error",
        description: "Failed to get test tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Get TRUTH Tokens</CardTitle>
            <CardDescription>
              Earn TRUTH tokens by submitting and verifying news articles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Your TRUTH Balance:</span>
                <span className="text-sm text-muted-foreground">
                  {tokenBalance
                    ? `${Number(tokenBalance) / 1e18} TRUTH`
                    : "Loading..."}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                To get TRUTH tokens, you can:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Submit news articles as a reporter</li>
                <li>Get your articles verified</li>
                <li>Receive 10 TRUTH tokens for each verified article</li>
                <li>Get 100 TRUTH tokens from the faucet (one-time use)</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Use these tokens to purchase a subscription and access premium
                news content.
              </p>
            </div>
            <div className="flex space-x-4">
              {!hasUsedFaucet ? (
                <Button
                  className="flex-1"
                  onClick={handleUseFaucet}
                  disabled={isLoading || isPending}
                >
                  {isLoading || isPending
                    ? "Getting Tokens..."
                    : "Get Test Tokens"}
                </Button>
              ) : (
                <Button className="flex-1" disabled>
                  Faucet Already Used
                </Button>
              )}
              <Link href="/?tab=reporter" className="flex-1">
                <Button variant="outline" className="w-full">
                  Become a Reporter
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
