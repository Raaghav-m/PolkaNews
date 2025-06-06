import { type Address } from "viem";

export interface NewsArticle {
  contentHash: string;
  reporter: Address;
  isVerified: boolean;
  timestamp: number;
  title: string;
  content: string;
  ipfsHash: string;
}

export interface ContractError extends Error {
  code?: string;
  data?: {
    code?: number;
    message?: string;
  };
}

export interface IPFSResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface IPFSContent {
  name: string;
  description: string;
  tags: string[];
  postedBy: string;
  timestamp: string;
}

export interface NewsSubmission {
  title: string;
  content: string;
  tags: string[];
  postedBy: Address;
  timestamp: string;
}
