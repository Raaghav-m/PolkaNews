import { useAccount, useContractRead, useContractWrite } from "wagmi";
import SubscriptionManagerABI from "../lib/abi/SubscriptionManagerABI.json";

export default function ManageSubscription() {
  const { address } = useAccount();
  const contract = {
    address: process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS,
    abi: SubscriptionManagerABI,
  };

  // Read subscription details
  const { data: details } = useContractRead({
    ...contract,
    functionName: "getSubscriptionDetails",
    args: [address],
    watch: true,
  });

  // Purchase subscription
  const { write: purchase, isLoading } = useContractWrite({
    ...contract,
    functionName: "purchaseSubscription",
  });

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 32 }}>
      <h1>Manage Subscription</h1>
      <div style={{ margin: "24px 0" }}>
        <p>Status: {details?.[2] ? "Active" : "Inactive"}</p>
        <p>
          Expires:{" "}
          {details?.[1]
            ? new Date(Number(details[1]) * 1000).toLocaleString()
            : "-"}
        </p>
        <button
          onClick={() => purchase()}
          disabled={isLoading}
          style={{ marginTop: 16 }}
        >
          {isLoading ? "Processing..." : "Purchase/Renew Subscription"}
        </button>
      </div>
    </div>
  );
}
