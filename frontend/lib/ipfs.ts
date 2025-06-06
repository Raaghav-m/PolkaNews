import type { IPFSContent, IPFSResponse } from "./types";

class IPFSService {
  private gateway: string;
  private apiKey: string;
  private apiSecret: string;
  private pinataBaseUrl: string;

  constructor() {
    this.gateway = "https://gateway.pinata.cloud/ipfs";
    this.pinataBaseUrl = "https://api.pinata.cloud";
    this.apiKey =
      process.env.NEXT_PUBLIC_PINATA_API_KEY || "4b325016d8669b0493cd";
    this.apiSecret =
      process.env.NEXT_PUBLIC_PINATA_SECRET ||
      "cf89dfb2364be3e0962ba5c3e5b854abb790d3b14a1995d449759667d19aee65";

    if (!this.apiKey || !this.apiSecret) {
      console.warn("Pinata API keys not found in environment variables");
    }
  }

  private getHeaders() {
    return {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: this.apiKey,
        pinata_secret_api_key: this.apiSecret,
      },
    };
  }

  async uploadContent(content: Omit<IPFSContent, "id">): Promise<string> {
    try {
      console.log("Uploading to IPFS:", content);

      const response = await fetch(
        `${this.pinataBaseUrl}/pinning/pinJSONToIPFS`,
        {
          method: "POST",
          ...this.getHeaders(),
          body: JSON.stringify({
            pinataMetadata: {
              name: content.name,
            },
            pinataOptions: {
              cidVersion: 0,
            },
            pinataContent: content,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.details || "Failed to upload to IPFS");
      }

      const data = await response.json();
      console.log("IPFS upload response:", data);

      if (!data.IpfsHash) {
        throw new Error("No IPFS hash returned from Pinata");
      }

      return data.IpfsHash;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          throw new Error(
            "Failed to authenticate with Pinata. Please check your API keys."
          );
        }
        throw error;
      }
      throw new Error("Unknown error occurred while uploading to IPFS");
    }
  }

  async getContent(hash: string): Promise<IPFSContent> {
    try {
      const response = await fetch(`${this.gateway}/${hash}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error("Error fetching from IPFS:", error);
      throw error;
    }
  }

  async unpinContent(hash: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.pinataBaseUrl}/pinning/unpin/${hash}`,
        {
          method: "DELETE",
          ...this.getHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.details || "Failed to unpin content");
      }
    } catch (error) {
      console.error("Error unpinning from IPFS:", error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.pinataBaseUrl}/data/testAuthentication`,
        {
          method: "GET",
          ...this.getHeaders(),
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Error testing Pinata connection:", error);
      return false;
    }
  }
}

export const ipfsService = new IPFSService();
