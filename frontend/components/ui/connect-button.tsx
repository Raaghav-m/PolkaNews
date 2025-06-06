"use client";

import { useConnect, useAccount, useDisconnect } from "wagmi";
import { Button } from "./button";

export function ConnectButton() {
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <Button variant="outline" onClick={() => disconnect()}>
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </Button>
    );
  }

  return (
    <Button onClick={() => connect({ connector: connectors[0] })}>
      Connect Wallet
    </Button>
  );
}
