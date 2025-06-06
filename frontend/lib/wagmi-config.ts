import { http, createConfig } from "wagmi";
import { westendAssetHub } from "wagmi/chains";
import { metaMask } from "wagmi/connectors";

// Define custom chain with the same RPC as server
const polkadotHubTestnet = {
  ...westendAssetHub,
  rpcUrls: {
    default: {
      http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
    },
    public: {
      http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
    },
  },
};

export const config = createConfig({
  chains: [polkadotHubTestnet],
  connectors: [metaMask()],
  transports: {
    [polkadotHubTestnet.id]: http(),
  },
});
