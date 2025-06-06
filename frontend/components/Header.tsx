"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { getTokenBalance, TRUTH_TOKEN_ADDRESS } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: bigint) => {
    if (!bal) return "0";
    // Convert from wei to ether (18 decimals)
    const etherBalance = Number(bal) / 1e18;
    if (etherBalance === 0) return "0";
    if (etherBalance < 0.0001) return "< 0.0001";
    return etherBalance.toFixed(4);
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      console.log("Attempting to connect wallet...");
      await connect({ connector: metaMask() });
      console.log("Wallet connected successfully");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address || !isConnected) return;

      try {
        setIsLoading(true);
        setError(null);
        const tokenBalance = await getTokenBalance(
          TRUTH_TOKEN_ADDRESS,
          address
        );
        setBalance(formatBalance(tokenBalance));
      } catch (err) {
        console.error("Error fetching balance:", err);
        setError("Failed to load balance");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [address, isConnected]);

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-6 flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold">PolkaNews</h1>
          {isConnected && (
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                  <span className="text-sm">Loading balance...</span>
                </div>
              ) : error ? (
                <div className="text-destructive">
                  <p className="text-sm">Error loading balance</p>
                  <p className="text-xs">{error}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Balance:
                  </span>
                  <span className="font-medium text-primary">
                    {balance} TRUTH
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Wallet className="h-4 w-4 text-green-600" />
                <span className="font-mono text-sm">
                  {formatAddress(address)}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  Connected
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnect()}
                className="text-muted-foreground hover:text-foreground"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              className="gap-2"
              disabled={isConnecting}
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
      {connectError && (
        <div className="w-full px-6 py-2">
          <p className="text-sm text-destructive">{connectError.message}</p>
        </div>
      )}
    </header>
  );
}
