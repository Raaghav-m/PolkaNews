"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <Wallet className="h-4 w-4 text-green-600" />
          <span className="font-mono text-sm">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
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
    );
  }

  return (
    <Button
      onClick={() => connect({ connector: connectors[0] })}
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
