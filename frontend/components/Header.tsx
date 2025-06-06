"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { useBalance } from "@/lib/hooks/useBalance";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { balance, isLoading, error: balanceError } = useBalance();
  const [isConnecting, setIsConnecting] = useState(false);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: number) => {
    if (bal === 0) return "0";
    if (bal < 0.0001) return "< 0.0001";
    return bal.toFixed(4);
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
              ) : balanceError ? (
                <div className="text-destructive">
                  <p className="text-sm">Error loading balance</p>
                  <p className="text-xs">{balanceError.message}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Balance:
                  </span>
                  <span className="font-medium text-primary">
                    {formatBalance(balance)} TRUTH
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isConnected ? (
            <Button
              variant="outline"
              onClick={() => disconnect()}
              className="gap-2"
            >
              <Wallet className="h-4 w-4" />
              {formatAddress(address)}
            </Button>
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
