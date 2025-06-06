"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
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
import Link from "next/link";

export default function FaucetPage() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);

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
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Use these tokens to purchase a subscription and access premium
                news content.
              </p>
            </div>
            <div className="flex space-x-4">
              <Link href="/reporter" className="flex-1">
                <Button className="w-full">Become a Reporter</Button>
              </Link>
              <Link href="/subscription" className="flex-1">
                <Button variant="outline" className="w-full">
                  View Subscription
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
