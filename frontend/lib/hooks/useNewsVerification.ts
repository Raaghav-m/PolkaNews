import { useEffect, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import { usePublicClient } from "wagmi";
import PolkaNewsAbi from "@/lib/PolkaNewsAbi.json";

interface NewsVerifiedEvent {
  contentHash: string;
  verified: boolean;
}

export function useNewsVerification() {
  const publicClient = usePublicClient();
  const processedEvents = useRef(new Set<string>());
  const verifiedContentHashes = useRef(new Set<string>());
  const isPolling = useRef(false);
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  // Function to start listening for new submissions
  const startListening = () => {
    if (!publicClient) {
      console.error("Public client not available");
      return;
    }

    // Clear any existing polling
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }

    // Reset state
    processedEvents.current.clear();
    verifiedContentHashes.current.clear();
    isPolling.current = true;

    console.log("Starting to listen for news verification...");

    // Start polling
    pollForEvents();
  };

  const stopPolling = () => {
    console.log("Stopping polling...");
    isPolling.current = false;
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  };

  const pollForEvents = async () => {
    if (!isPolling.current || !publicClient) {
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(publicClient.transport.url);
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS!,
        PolkaNewsAbi,
        provider
      );

      const currentBlock = await provider.getBlockNumber();
      console.log(`Checking for verification events at block: ${currentBlock}`);

      const filter = contract.filters.NewsVerified();
      const events = await contract.queryFilter(
        filter,
        currentBlock - 10,
        currentBlock
      );

      for (const event of events) {
        if (!event.transactionHash) continue;

        const eventId = `${event.blockNumber}-${event.transactionHash}`;
        if (processedEvents.current.has(eventId)) continue;

        const eventLog = event as ethers.EventLog;
        const { contentHash, verified } =
          eventLog.args as unknown as NewsVerifiedEvent;

        if (verifiedContentHashes.current.has(contentHash)) continue;

        console.log("News verified event received:", { contentHash, verified });

        if (verified) {
          toast.success("News verified successfully! ✅", {
            description: `Content Hash: ${contentHash.slice(0, 10)}...`,
            duration: 3000,
          });
        } else {
          toast.error("News verification failed ❌", {
            description: `Content Hash: ${contentHash.slice(0, 10)}...`,
            duration: 3000,
          });
        }

        // Mark as processed and stop polling
        verifiedContentHashes.current.add(contentHash);
        processedEvents.current.add(eventId);
        stopPolling();
        break; // Exit after processing one event
      }
    } catch (error) {
      console.error("Error polling for events:", error);
    }
  };

  // Set up polling interval when isPolling is true
  useEffect(() => {
    if (!publicClient) return;

    if (isPolling.current) {
      console.log("Setting up polling interval...");
      intervalId.current = setInterval(pollForEvents, 5000);
    }

    return () => {
      stopPolling();
    };
  }, [publicClient, isPolling.current]);

  return { startListening };
}
