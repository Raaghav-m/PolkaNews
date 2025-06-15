import { http, createConfig } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { moonbaseAlpha } from "wagmi/chains";

// Define Paseo Asset Hub chain
const paseoAssetHub = {
  id: 420420422,
  name: "Paseo Asset Hub",
  network: "paseo-asset-hub",
  nativeCurrency: {
    name: "PAS",
    symbol: "PAS",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
    },
    public: {
      http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-passet-hub.parity-testnet.parity.io",
    },
  },
  testnet: true,
  parachainId: 1111,
  // Add these fields for MetaMask compatibility
  shortName: "paseo",
  chainId: 420420422,
  networkId: 420420422,
  iconUrl:
    "https://raw.githubusercontent.com/paseo-network/passet-hub/main/assets/logo.png",
  // Add EVM configuration
  evm: {
    chainId: 420420422,
    blockTime: 6,
    gasPrice: {
      min: 1000000000,
      max: 10000000000,
    },
  },
};

console.log("Chain Configuration:", {
  chainId: paseoAssetHub.chainId,
  rpcUrl: paseoAssetHub.rpcUrls.default.http[0],
  networkId: paseoAssetHub.networkId,
});

export const config = createConfig({
  chains: [moonbaseAlpha],
  connectors: [metaMask()],
  transports: {
    [moonbaseAlpha.id]: http(),
  },
});

console.log("Wagmi Config:", {
  chains: config.chains.map((chain) => ({
    id: chain.id,
    name: chain.name,
    network: chain.network,
  })),
  connectors: config.connectors.map((connector) => connector.name),
});
